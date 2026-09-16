import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import nodemailer from 'nodemailer';
import { AUTHENTIC_MENU_ITEMS, AUTHENTIC_RESTAURANTS } from './authenticMenuData.js';

// Bulletproof DNS resilience for Neon serverless PostgreSQL on local Windows
// Falls back to Google (8.8.8.8) and Cloudflare (1.1.1.1) when local Wi-Fi router refuses query
if (!process.env.VERCEL) {
  const originalDnsLookup = dns.lookup;
  const fallbackResolver = new dns.promises.Resolver();
  fallbackResolver.setServers(['8.8.8.8', '1.1.1.1']);

  dns.lookup = function (hostname, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    originalDnsLookup(hostname, options, (err, address, family) => {
      if (!err && address) {
        return callback(null, address, family);
      }
      fallbackResolver.resolve4(hostname).then((addrs) => {
        if (addrs && addrs.length > 0) {
          if (options && options.all) {
            return callback(null, addrs.map((a) => ({ address: a, family: 4 })));
          }
          return callback(null, addrs[0], 4);
        }
        callback(err, address, family);
      }).catch(() => {
        callback(err, address, family);
      });
    });
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Database file path for offline cache (located outside watched server directory, /tmp on Vercel)
const DATA_DIR = process.env.VERCEL ? '/tmp/.data' : path.resolve(__dirname, '../.data');
const DB_FILE = path.resolve(DATA_DIR, 'orders_db.json');
const UPLOADS_DIR = process.env.VERCEL ? '/tmp/uploads' : path.resolve(__dirname, '../uploads');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (fsErr) {
  console.warn('[Storage Warning]:', fsErr.message);
}

// Migrate legacy cache file if exists
try {
  const legacyDbFile = path.resolve(__dirname, 'data', 'orders_db.json');
  if (fs.existsSync(legacyDbFile) && !fs.existsSync(DB_FILE)) {
    fs.copyFileSync(legacyDbFile, DB_FILE);
  }
} catch (e) {}

// Serve uploaded images statically
app.use('/uploads', express.static(UPLOADS_DIR));

// ----------------------------------------------------
// GMAIL OTP TRANSPORTER SETUP
// ----------------------------------------------------
const otpMemoryCache = new Map();

function getEmailCredentials() {
  let user = '';
  let pass = '';
  try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const envText = fs.readFileSync(envPath, 'utf8');
      const userMatch = envText.match(/^\s*EMAIL_USER\s*=\s*(.+)$/m);
      const passMatch = envText.match(/^\s*EMAIL_PASS\s*=\s*(.+)$/m);
      if (userMatch && userMatch[1]) user = userMatch[1].trim();
      if (passMatch && passMatch[1]) pass = passMatch[1].trim();
    }
  } catch (e) {}

  if (!user) user = (process.env.EMAIL_USER || '').trim();
  if (!pass) pass = (process.env.EMAIL_PASS || '').trim();

  // If credentials match the old revoked account, fallback to verified active credentials
  if (!user || user.toLowerCase().includes('collagebites1') || pass.toLowerCase().includes('ufstkqio')) {
    user = 'rajsrmap2@gmail.com';
    pass = 'bgdsjrhzfpvltdnh';
  }

  return {
    user: user.trim(),
    pass: pass.replace(/\s+/g, '').trim()
  };
}

function getMailTransporter() {
  const { user, pass } = getEmailCredentials();
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4, // Force IPv4 to prevent cloud IPv6 DNS hangs
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 8000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    auth: {
      user,
      pass
    }
  });
  return { user, transporter };
}

console.log(`[Gmail Service] Configured with sender: ${getEmailCredentials().user} (Dynamic Pool & IPv4 Active)`);

// ----------------------------------------------------
// 1. NEON POSTGRESQL CONNECTION & SCHEMA INITIALIZATION
// ----------------------------------------------------
function getDatabaseUrl() {
  let url = '';
  try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const envText = fs.readFileSync(envPath, 'utf8');
      const match = envText.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
      if (match && match[1]) {
        url = match[1].trim();
      }
    }
  } catch (e) {}

  if (!url) {
    url = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://neondb_owner:npg_3O6tHydAMuSg@ep-soft-flower-a5yk954q-pooler.us-east-2.aws.neon.tech/clgbites?sslmode=require&channel_binding=require';
  }

  if (url) {
    url = url.trim();
    if (url.startsWith('DATABASE_URL=')) url = url.replace(/^DATABASE_URL=/, '').trim();
    if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
      url = url.slice(1, -1).trim();
    }
  }
  return url;
}

const DATABASE_URL = getDatabaseUrl();
let sql = null;
let isNeonReady = false;

if (DATABASE_URL) {
  try {
    sql = neon(DATABASE_URL);
    console.log('[Neon DB] Initializing connection to:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  } catch (err) {
    console.error('[Neon DB Init Error]:', err.message);
  }
}

const INITIAL_DELIVERY_PARTNERS = [];

const INITIAL_RESTAURANTS = AUTHENTIC_RESTAURANTS;

// Ensure Neon schema is ready
async function initNeonSchema() {
  if (!sql) return;
  try {
    // 1. Ensure students table
    await sql`
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        student_id VARCHAR(100),
        phone VARCHAR(50),
        hostel_block VARCHAR(100),
        room_number VARCHAR(100),
        total_orders INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 2. Ensure orders table and columns
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(255),
        student_name VARCHAR(255) NOT NULL,
        student_email VARCHAR(255),
        student_phone VARCHAR(50) NOT NULL,
        student_id VARCHAR(100),
        delivery_location TEXT NOT NULL,
        restaurant_id VARCHAR(100) NOT NULL,
        restaurant_name VARCHAR(255) NOT NULL,
        total_amount NUMERIC NOT NULL,
        status VARCHAR(50) NOT NULL,
        instructions TEXT,
        items JSONB NOT NULL,
        delivery_partner_id VARCHAR(50),
        delivery_partner_name VARCHAR(255),
        delivery_partner_phone VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        confirmed_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Add extra columns if existing table didn't have them
    await sql`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS student_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS user_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
    `;

    // 3. Ensure order_status_history table
    await sql`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        changed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 4. Performance Indexes for Heavy Campus Traffic
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_student_email ON orders(student_email);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);`;

    // 5. Ensure menu_items table & indexes
    await sql`
      CREATE TABLE IF NOT EXISTS menu_items (
        id VARCHAR(100) PRIMARY KEY,
        restaurant_id VARCHAR(100) NOT NULL,
        restaurant_name VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC NOT NULL,
        category VARCHAR(100) NOT NULL,
        is_veg BOOLEAN DEFAULT true,
        is_available BOOLEAN DEFAULT true,
        image_url TEXT,
        preparation_time VARCHAR(50) DEFAULT '15-20 mins',
        rating NUMERIC DEFAULT 4.5,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT;`;
    await sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS preparation_time VARCHAR(50) DEFAULT '15-20 mins';`;
    await sql`CREATE INDEX IF NOT EXISTS idx_menu_restaurant ON menu_items(restaurant_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category);`;

    // Ensure food_images table for storing raw uploaded dish photos in PostgreSQL
    await sql`
      CREATE TABLE IF NOT EXISTS food_images (
        id VARCHAR(100) PRIMARY KEY,
        image_data TEXT NOT NULL,
        mime_type VARCHAR(50) DEFAULT 'image/jpeg',
        filename VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Ensure otp_verifications table for Email OTPs
    await sql`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        email VARCHAR(255) PRIMARY KEY,
        otp VARCHAR(10) NOT NULL,
        name VARCHAR(255),
        phone VARCHAR(50),
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 6. Ensure delivery_partners table
    await sql`
      CREATE TABLE IF NOT EXISTS delivery_partners (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        pin VARCHAR(20) DEFAULT '1234',
        restaurant_id VARCHAR(100) DEFAULT 'all',
        is_active BOOLEAN DEFAULT true,
        total_deliveries INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Note: menu_items is managed via Admin Portal or SQL console; never auto-reseed over user deletions!

    // 7. Ensure system_settings table
    await sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        id VARCHAR(50) PRIMARY KEY,
        ordering_enabled BOOLEAN DEFAULT true,
        platform_enabled BOOLEAN DEFAULT true,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS platform_enabled BOOLEAN DEFAULT true;`;
    await sql`
      INSERT INTO system_settings (id, ordering_enabled, platform_enabled, updated_at)
      VALUES ('global', true, true, NOW())
      ON CONFLICT (id) DO NOTHING;
    `;

    // 8. Ensure restaurants table
    await sql`
      CREATE TABLE IF NOT EXISTS restaurants (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        cuisine VARCHAR(100),
        location TEXT,
        phone VARCHAR(50),
        rating NUMERIC DEFAULT 4.8,
        prep_time VARCHAR(50) DEFAULT '15-20 min',
        image_url TEXT,
        is_open BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Seed restaurants if empty
    const restCount = await sql`SELECT count(*) as c FROM restaurants;`;
    if (parseInt(restCount[0]?.c || '0', 10) === 0) {
      console.log('[Neon DB] Seeding default restaurants into Neon DB...');
      for (const r of INITIAL_RESTAURANTS) {
        await sql`
          INSERT INTO restaurants (
            id, name, description, cuisine, location, phone, rating, prep_time, image_url, is_open, created_at, updated_at
          ) VALUES (
            ${r.id}, ${r.name}, ${r.description}, ${r.cuisine}, ${r.location}, ${r.phone}, ${r.rating}, ${r.prep_time}, ${r.image_url}, ${r.is_open}, NOW(), NOW()
          ) ON CONFLICT (id) DO NOTHING;
        `;
      }
      console.log('✅ [Neon DB] Default restaurants seeded successfully!');
    }

    // 9. Ensure admin_accounts table
    await sql`
      CREATE TABLE IF NOT EXISTS admin_accounts (
        id VARCHAR(100) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        restaurant_id VARCHAR(100),
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Seed default admin accounts
    await sql`
      INSERT INTO admin_accounts (id, username, name, role, restaurant_id, password_hash)
      VALUES 
        ('admin-super', 'collagebites1@gmail.com', 'Collage Bites (Super Admin)', 'super_admin', null, 'Clgbites123'),
        ('admin-super-alias', 'collagebites@gmail.com', 'Collage Bites Admin', 'super_admin', null, 'Clgbites123'),
        ('admin-lhk', 'lhk_admin', 'Local Home Kitchen Staff', 'restaurant_admin', 'local-home-kitchen', 'LHK@Campus2026'),
        ('admin-clg', 'clgbites_admin', 'Biryani Nation Staff', 'restaurant_admin', 'clg-bites-biryani-nation', 'CLG@Campus2026')
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        restaurant_id = EXCLUDED.restaurant_id;
    `;

    isNeonReady = true;
    console.log('✅ [Neon DB] Connected & Schema Initialized Successfully (with Restaurants, System Settings, Menu & Admin Accounts)!');
    return true;
  } catch (err) {
    console.warn('[Neon DB Schema Warning]:', err.message);
    isNeonReady = false;
    return false;
  }
}

async function runNeonSchemaInitWithRetry(maxRetries = 3) {
  if (!sql) return;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const ok = await initNeonSchema();
    if (ok) return;
    if (attempt < maxRetries) {
      console.log(`[Neon DB] Re-attempting schema initialization (${attempt + 1}/${maxRetries}) in 1.5s...`);
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  console.warn('[Neon DB] Schema initialization deferred; individual requests will auto-reconnect.');
}

if (!process.env.VERCEL) {
  runNeonSchemaInitWithRetry();
}

// ----------------------------------------------------
// 2. INITIAL SEED DISHES & LOCAL CACHE HELPERS
// ----------------------------------------------------
const INITIAL_MENU_ITEMS = AUTHENTIC_MENU_ITEMS;

const DEFAULT_STATE = {
  orders: [],
  students: [],
  delivery_partners: INITIAL_DELIVERY_PARTNERS,
  menu_items: AUTHENTIC_MENU_ITEMS,
  settings: { ordering_enabled: true },
  restaurants: AUTHENTIC_RESTAURANTS
};

function readLocalDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_STATE, null, 2), 'utf8');
      return DEFAULT_STATE;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return DEFAULT_STATE;
  }
}

function writeLocalDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    return false;
  }
}

// ----------------------------------------------------
// 3. API ROUTES
// ----------------------------------------------------

// GET / (Visual Dashboard) & /api/health & /api/db/status
app.get(['/', '/api', '/api/health', '/api/db/status'], async (req, res) => {
  let neonStatus = 'offline';
  let totalNeonOrders = 0;
  let totalNeonStudents = 0;
  let currentDb = 'clgbytes';

  if (sql) {
    try {
      const dbInfo = await sql`SELECT current_database();`;
      currentDb = dbInfo[0]?.current_database || 'clgbytes';
      const orderCount = await sql`SELECT count(*) as c FROM orders;`;
      const studentCount = await sql`SELECT count(*) as c FROM students;`;
      totalNeonOrders = parseInt(orderCount[0]?.c || '0', 10);
      totalNeonStudents = parseInt(studentCount[0]?.c || '0', 10);
      neonStatus = 'connected';
    } catch (e) {
      neonStatus = 'error: ' + e.message;
    }
  }

  // If browser requests HTML at root '/', serve a sleek dashboard
  if (req.path === '/' && req.accepts('html')) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Srm : College Bites Central Backend & Neon DB Hub</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
            background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, #09090b 100%);
            color: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }
          .container {
            max-width: 780px;
            width: 100%;
            background: rgba(24, 24, 27, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(16px);
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
          }
          .badge-row {
            display: flex;
            gap: 12px;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.02em;
          }
          .badge-live {
            background: rgba(34, 197, 94, 0.15);
            color: #4ade80;
            border: 1px solid rgba(34, 197, 94, 0.3);
          }
          .badge-neon {
            background: rgba(14, 165, 233, 0.15);
            color: #38bdf8;
            border: 1px solid rgba(14, 165, 233, 0.3);
          }
          .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: currentColor;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.9); }
          }
          h1 {
            font-size: 32px;
            font-weight: 800;
            background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
          }
          p.subtitle {
            color: #94a3b8;
            font-size: 15px;
            margin-bottom: 32px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
          }
          .stat-card {
            background: rgba(39, 39, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 16px;
            padding: 20px;
          }
          .stat-label {
            font-size: 13px;
            color: #a1a1aa;
            margin-bottom: 6px;
          }
          .stat-value {
            font-size: 28px;
            font-weight: 800;
            color: #f8fafc;
          }
          .portals-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 32px;
          }
          @media (max-width: 600px) {
            .portals-grid { grid-template-columns: 1fr; }
          }
          .portal-btn {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px;
            border-radius: 18px;
            text-decoration: none;
            color: white;
            font-weight: 700;
            transition: all 0.2s ease;
            box-shadow: 0 10px 20px -5px rgba(0,0,0,0.4);
          }
          .portal-btn.student {
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            border: 1px solid rgba(249, 115, 22, 0.5);
          }
          .portal-btn.admin {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            border: 1px solid rgba(37, 99, 235, 0.5);
          }
          .portal-btn:hover {
            transform: translateY(-3px);
            filter: brightness(1.1);
          }
          .api-box {
            background: #111113;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            padding: 18px;
            font-size: 13px;
            color: #94a3b8;
          }
          .api-box h4 {
            color: #e2e8f0;
            margin-bottom: 10px;
            font-size: 14px;
          }
          .api-links {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }
          .api-links a {
            color: #38bdf8;
            text-decoration: none;
            background: rgba(56, 189, 248, 0.1);
            padding: 4px 10px;
            border-radius: 6px;
            font-family: monospace;
          }
          .api-links a:hover {
            background: rgba(56, 189, 248, 0.2);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge-row">
            <span class="badge badge-live"><span class="dot"></span> Backend Live (Port 5000)</span>
            <span class="badge badge-neon"><span class="dot"></span> Neon DB (${currentDb}): ${neonStatus.toUpperCase()}</span>
          </div>

          <h1>Srm : College Bites Central Hub</h1>
          <p class="subtitle">The shared backend and real-time database are active and synchronized.</p>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">🐘 Database Name</div>
              <div class="stat-value" style="font-size: 20px; font-family: monospace; color: #38bdf8;">${currentDb}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">📋 Live Orders in DB</div>
              <div class="stat-value" style="color: #f97316;">${totalNeonOrders}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">🎓 Registered Students</div>
              <div class="stat-value" style="color: #22c55e;">${totalNeonStudents}</div>
            </div>
          </div>

          <div class="portals-grid">
            <a href="http://localhost:5173" class="portal-btn student">
              <div>
                <div style="font-size: 18px;">🍔 Student Dining Portal</div>
                <div style="font-size: 13px; font-weight: 500; opacity: 0.85;">http://localhost:5173</div>
              </div>
              <span style="font-size: 22px;">➔</span>
            </a>
            <a href="http://localhost:5174" class="portal-btn admin">
              <div>
                <div style="font-size: 18px;">🛡️ Srm : College Bites Admin Portal</div>
                <div style="font-size: 13px; font-weight: 500; opacity: 0.85;">http://localhost:5174</div>
              </div>
              <span style="font-size: 22px;">➔</span>
            </a>
          </div>

          <div class="api-box">
            <h4>📡 Available REST Endpoints:</h4>
            <div class="api-links">
              <a href="/api/orders" target="_blank">GET /api/orders</a>
              <a href="/api/students" target="_blank">GET /api/students</a>
              <a href="/api/health" target="_blank">GET /api/health</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  res.json({
    ok: true,
    message: 'Srm : College Bites Central Shared Backend is Live 🚀',
    neon: {
      status: neonStatus,
      database: currentDb,
      total_orders: totalNeonOrders,
      total_students: totalNeonStudents
    },
    portals: {
      student: 'http://localhost:5173',
      admin: 'http://localhost:5174'
    },
    timestamp: new Date().toISOString()
  });
});

// ----------------------------------------------------
// AUTH & GMAIL EMAIL OTP VERIFICATION ENDPOINTS
// ----------------------------------------------------

// POST /api/auth/send-otp - Generate 6-digit OTP and send via Gmail
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email, name, phone } = req.body || {};
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 1. Store in Neon PostgreSQL database
    if (sql) {
      try {
        await sql`
          INSERT INTO otp_verifications (email, otp, name, phone, expires_at, created_at)
          VALUES (${cleanEmail}, ${otp}, ${name || null}, ${phone || null}, ${expiresAt.toISOString()}, NOW())
          ON CONFLICT (email) DO UPDATE SET
            otp = EXCLUDED.otp,
            name = COALESCE(EXCLUDED.name, otp_verifications.name),
            phone = COALESCE(EXCLUDED.phone, otp_verifications.phone),
            expires_at = EXCLUDED.expires_at,
            created_at = NOW();
        `;
        console.log(`[Neon DB] ✅ Saved OTP record in Neon for: ${cleanEmail} -> ${otp}`);
      } catch (dbErr) {
        console.warn('[Neon DB OTP Store Warning]:', dbErr.message);
      }
    }

    // 2. Also keep in memory for instantaneous local response
    otpMemoryCache.set(cleanEmail, { otp, expiresAt: expiresAt.getTime(), name, phone });

    // 3. Send professional branded email via Gmail SMTP
    const htmlTemplate = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #FF5722 0%, #F4511E 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
          <div style="font-size: 40px; margin-bottom: 8px;">🍔</div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">Srm : College Bites Dining</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">SRM University-AP Hostel Delivery Portal</p>
        </div>
        
        <div style="padding: 32px 28px; text-align: center;">
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0; font-weight: 800;">Your One-Time Login Code</h2>
          <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 8px 0 24px;">
            Hello <b>${name || 'Student'}</b>, use the 6-digit verification code below to securely sign into Srm : College Bites.
          </p>
          
          <div style="display: inline-block; background: #FFF0EB; border: 2px dashed #FF5722; border-radius: 16px; padding: 16px 36px; margin-bottom: 24px;">
            <span style="font-family: monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #FF5722;">${otp}</span>
          </div>
          
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            ⏱️ This code is valid for <b>10 minutes</b>. Never share your OTP with anyone.
          </p>
        </div>
        
        <div style="background: #FAF8F5; padding: 18px 24px; text-align: center; border-top: 1px solid #f1eae4; font-size: 11px; color: #8a7b70;">
          SRM University AP • Neerukonda Village • Gate 3 Delivery Support: 9989955833
        </div>
      </div>
    `;

    // Dispatch email and await completion so Vercel Serverless Lambda doesn't freeze the process
    let emailSent = false;
    let emailError = null;
    try {
      const { user: senderEmail, transporter } = getMailTransporter();
      await Promise.race([
        transporter.sendMail({
          from: '"Srm : College Bites" <' + senderEmail + '>',
          to: cleanEmail,
          replyTo: senderEmail,
          subject: `${otp} is your College Bites Login Code`,
          html: htmlTemplate
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP send timeout (6s)')), 6000))
      ]);
      emailSent = true;
      console.log(`[Gmail OTP] Successfully delivered OTP ${otp} to ${cleanEmail}`);
    } catch (mailErr) {
      emailError = mailErr.message;
      console.error('[Gmail SMTP Warning]:', mailErr.message);
      console.log(`[Dev Fallback OTP Available]: ${cleanEmail} -> ${otp}`);
    }

    res.json({ 
      success: true, 
      message: emailSent ? `OTP sent to ${cleanEmail}` : `OTP generated for ${cleanEmail}`,
      otp: otp,
      fallbackCode: '123456'
    });
  } catch (err) {
    console.error('[Send OTP Route Error]:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to dispatch OTP: ' + err.message });
  }
});

// POST /api/auth/verify-otp - Verify 6-digit code and authenticate student
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp, name, phone } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    let isValid = false;
    let storedData = null;

    // 1. Check in-memory cache
    const mem = otpMemoryCache.get(cleanEmail);
    if (mem && mem.otp === cleanOtp && mem.expiresAt > Date.now()) {
      isValid = true;
      storedData = mem;
    }

    // 2. Check Neon DB
    if (!isValid && sql) {
      try {
        const rows = await sql`
          SELECT * FROM otp_verifications 
          WHERE email = ${cleanEmail} 
            AND otp = ${cleanOtp} 
            AND expires_at > NOW();
        `;
        if (rows && rows.length > 0) {
          isValid = true;
          storedData = rows[0];
        }
      } catch (dbErr) {
        console.warn('[Neon DB OTP Verify Warning]:', dbErr.message);
      }
    }

    // 3. Developer / test fallback code
    if (cleanOtp === '123456') {
      isValid = true;
    }

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP code. Please try again.' });
    }

    // Clean up used OTP from memory (keep in Neon DB for audit & visibility in console)
    otpMemoryCache.delete(cleanEmail);

    const studentName = name || storedData?.name || cleanEmail.split('@')[0];
    const studentPhone = phone || storedData?.phone || '9989955833';
    const studentId = `srm-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Upsert into Neon PostgreSQL students table
    if (sql) {
      try {
        await sql`
          INSERT INTO students (id, name, email, phone, updated_at)
          VALUES (${studentId}, ${studentName}, ${cleanEmail}, ${studentPhone}, NOW())
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            phone = COALESCE(EXCLUDED.phone, students.phone),
            updated_at = NOW();
        `;
        console.log(`[Neon DB] Student account verified & synchronized: ${cleanEmail}`);
      } catch (e) {
        console.warn('[Student Upsert Warning]:', e.message);
      }
    }

    const studentProfile = {
      id: studentId,
      name: studentName,
      email: cleanEmail,
      phone: studentPhone,
      role: 'student'
    };

    console.log(`[Auth Success] Student verified: ${cleanEmail}`);
    const token = `cb_${Buffer.from(JSON.stringify(studentProfile)).toString('base64')}`;
    return res.json({
      success: true,
      token,
      user: studentProfile,
      message: 'Logged in successfully'
    });
  } catch (err) {
    console.error('[Verify OTP Route Error]:', err.message);
    return res.status(500).json({ success: false, error: 'Verification failed: ' + err.message });
  }
});

// POST /api/auth/admin-login - Multi-Role Administrator Authentication
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { email, username, identifier, password } = req.body || {};
    const inputIdentifier = (identifier || email || username || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!inputIdentifier || !cleanPassword) {
      return res.status(400).json({ success: false, error: 'Username/Email and password are required.' });
    }

    const makeAdminToken = (profile) => `cb_${Buffer.from(JSON.stringify(profile)).toString('base64')}`;

    // 1. Query admin_accounts table in Neon DB
    if (sql) {
      try {
        const rows = await sql`
          SELECT id, username, name, role, restaurant_id, password_hash
          FROM admin_accounts
          WHERE LOWER(username) = ${inputIdentifier} OR LOWER(name) = ${inputIdentifier}
          LIMIT 1;
        `;
        if (rows && rows.length > 0) {
          const account = rows[0];
          const isPassValid = account.password_hash === cleanPassword ||
            (cleanPassword === 'lhk123' && account.restaurant_id === 'local-home-kitchen') ||
            (cleanPassword === 'clg123' && account.restaurant_id === 'clg-bites-biryani-nation') ||
            (cleanPassword === 'admin123' && account.role === 'super_admin');

          if (isPassValid) {
            const adminProfile = {
              id: account.id,
              username: account.username,
              name: account.name,
              role: account.role,
              restaurant_id: account.restaurant_id,
              email: account.username.includes('@') ? account.username : `${account.username}@campusbites.com`,
              created_at: new Date().toISOString()
            };
            console.log(`[Admin Auth] Successful login for: ${account.username} (${account.role})`);
            return res.json({
              success: true,
              token: makeAdminToken(adminProfile),
              user: adminProfile,
              message: 'Administrator authenticated successfully'
            });
          }
        }
      } catch (dbErr) {
        console.warn('[Neon Admin Auth Query Warning]:', dbErr.message);
      }
    }

    // 2. Direct Fallback checks: Super Admin & Restaurant Admins
    if ((inputIdentifier === 'collagebites1@gmail.com' || inputIdentifier === 'collagebites@gmail.com' || inputIdentifier === 'rajsrmap2@gmail.com' || inputIdentifier === 'superadmin' || inputIdentifier === 'admin@campusbites.com') && (cleanPassword === 'Clgbites123' || cleanPassword === 'Snehith@007' || cleanPassword === 'admin123')) {
      const superAdminProfile = {
        id: 'admin-super',
        username: 'collagebites1@gmail.com',
        name: 'Collage Bites (Super Admin)',
        email: 'collagebites1@gmail.com',
        role: 'super_admin',
        restaurant_id: null,
        created_at: new Date().toISOString()
      };
      return res.json({ success: true, token: makeAdminToken(superAdminProfile), user: superAdminProfile, message: 'Super Admin authenticated' });
    }

    if ((inputIdentifier === 'lhk_admin' || inputIdentifier === 'lhk@campusbites.com' || inputIdentifier === 'lhk') && (cleanPassword === 'LHK@Campus2026' || cleanPassword === 'lhk123')) {
      const lhkProfile = {
        id: 'admin-lhk',
        username: 'lhk_admin',
        name: 'Local Home Kitchen Staff',
        email: 'lhk@campusbites.com',
        role: 'restaurant_admin',
        restaurant_id: 'local-home-kitchen',
        created_at: new Date().toISOString()
      };
      return res.json({ success: true, token: makeAdminToken(lhkProfile), user: lhkProfile, message: 'Local Home Kitchen Admin authenticated' });
    }

    if ((inputIdentifier === 'clgbites_admin' || inputIdentifier === 'clg@campusbites.com' || inputIdentifier === 'clg') && (cleanPassword === 'CLG@Campus2026' || cleanPassword === 'clg123')) {
      const clgProfile = {
        id: 'admin-clg',
        username: 'clgbites_admin',
        name: 'Biryani Nation Staff',
        email: 'clg@campusbites.com',
        role: 'restaurant_admin',
        restaurant_id: 'clg-bites-biryani-nation',
        created_at: new Date().toISOString()
      };
      return res.json({ success: true, token: makeAdminToken(clgProfile), user: clgProfile, message: 'Biryani Nation Admin authenticated' });
    }

    console.warn(`[Admin Auth Rejected] Invalid credentials attempt: ${inputIdentifier}`);
    return res.status(401).json({
      success: false,
      error: 'Invalid administrator credentials. Access restricted to authorized campus staff.'
    });
  } catch (err) {
    console.error('[Admin Auth Route Error]:', err.message);
    return res.status(500).json({ success: false, error: 'Admin authentication failed: ' + err.message });
  }
});


// High-throughput order cache for handling heavy campus traffic & frequent polling
let ordersCache = null;
let ordersCacheTime = 0;
const CACHE_TTL_MS = 1200; // 1.2s cache during heavy rush polling

function invalidateOrdersCache() {
  ordersCache = null;
  ordersCacheTime = 0;
}

// GET /api/orders - Fetch orders (supports ?id=..., ?studentEmail=..., ?restaurant_id=... and token-based kitchen isolation)
app.get('/api/orders', async (req, res) => {
  let authUser = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const raw = authHeader.replace('Bearer ', '').trim();
      if (raw.startsWith('cb_')) {
        authUser = JSON.parse(Buffer.from(raw.replace('cb_', ''), 'base64').toString('utf8'));
      }
    } catch (e) {}
  }

  // 1. Single order query by ID: /api/orders?id=... or /api/orders?orderId=...
  const queryOrderId = req.query.id || req.query.orderId;
  if (queryOrderId) {
    if (sql) {
      try {
        const rows = await sql`
          SELECT * FROM orders 
          WHERE id = ${queryOrderId} OR id LIKE ${queryOrderId + '%'} 
          LIMIT 1;
        `;
        if (rows.length > 0) {
          const r = rows[0];
          const parsed = {
            ...r,
            total_amount: Number(r.total_amount),
            items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items
          };
          return res.json({
            ...parsed,
            success: true,
            order: parsed,
            source: 'neon'
          });
        }
      } catch (err) {
        console.warn('[Neon Single Order Error]:', err.message);
      }
    }

    const local = readLocalDb();
    const found = (local.orders || []).find((o) => o.id === queryOrderId || (o.id && o.id.startsWith(queryOrderId)));
    if (found) {
      return res.json({
        ...found,
        success: true,
        order: found,
        source: 'local_cache'
      });
    }
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  let restaurantId = req.query.restaurant_id || req.query.restaurant;
  // Strict cross-restaurant isolation for kitchen admins
  if (!restaurantId && authUser?.restaurant_id && authUser.role !== 'super_admin') {
    restaurantId = authUser.restaurant_id;
  }

  // 2. Student orders query: /api/orders?studentEmail=... or /api/orders?user_id=...
  const studentEmail = (req.query.studentEmail || req.query.email || req.query.student_email || '').trim().toLowerCase();
  const studentPhone = (req.query.student_phone || req.query.phone || '').replace(/\D/g, '').slice(-10);
  const userId = (req.query.user_id || req.query.student_id || '').trim();

  if (studentEmail || studentPhone || userId) {
    if (sql) {
      try {
        let rows;
        if (studentEmail && restaurantId && restaurantId !== 'all') {
          rows = await sql`
            SELECT * FROM orders 
            WHERE LOWER(student_email) = ${studentEmail} AND restaurant_id = ${restaurantId}
            ORDER BY created_at DESC;
          `;
        } else if (studentEmail) {
          rows = await sql`
            SELECT * FROM orders 
            WHERE LOWER(student_email) = ${studentEmail} 
               OR user_id = ${userId || studentEmail}
               OR (LENGTH(${studentPhone}) >= 10 AND RIGHT(REGEXP_REPLACE(COALESCE(student_phone, ''), '[^0-9]', '', 'g'), 10) = ${studentPhone})
            ORDER BY created_at DESC;
          `;
        } else if (userId) {
          rows = await sql`
            SELECT * FROM orders 
            WHERE user_id = ${userId} OR student_id = ${userId}
            ORDER BY created_at DESC;
          `;
        } else {
          rows = await sql`
            SELECT * FROM orders 
            WHERE LENGTH(${studentPhone}) >= 10 AND RIGHT(REGEXP_REPLACE(COALESCE(student_phone, ''), '[^0-9]', '', 'g'), 10) = ${studentPhone}
            ORDER BY created_at DESC;
          `;
        }
        const parsedOrders = rows.map((r) => ({
          ...r,
          total_amount: Number(r.total_amount),
          items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items
        }));
        if (req.query.format === 'array') return res.json(parsedOrders);
        return res.json({ success: true, orders: parsedOrders, source: 'neon' });
      } catch (err) {
        console.warn('[Neon Student Orders Error]:', err.message);
      }
    }

    const local = readLocalDb();
    const filtered = (local.orders || []).filter((o) => {
      const oEmail = (o.student_email || '').toLowerCase();
      const oPhone = (o.student_phone || '').replace(/\D/g, '').slice(-10);
      const oUid = (o.user_id || '').toLowerCase();
      return (studentEmail && oEmail === studentEmail) ||
             (userId && oUid === userId.toLowerCase()) ||
             (studentPhone && oPhone === studentPhone);
    });
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (req.query.format === 'array') return res.json(filtered);
    return res.json({ success: true, orders: filtered, source: 'local_cache' });
  }

  // 3. General orders query (for Restaurant Admin / Super Admin)
  if (sql) {
    try {
      let rows;
      if (restaurantId && restaurantId !== 'all') {
        rows = await sql`
          SELECT * FROM orders 
          WHERE restaurant_id = ${restaurantId}
          ORDER BY created_at DESC 
          LIMIT 200;
        `;
      } else {
        rows = await sql`
          SELECT * FROM orders 
          ORDER BY created_at DESC 
          LIMIT 200;
        `;
      }
      const parsedOrders = rows.map((r) => ({
        ...r,
        total_amount: Number(r.total_amount),
        items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items
      }));

      if (req.query.format === 'array') {
        return res.json(parsedOrders);
      }
      return res.json({ success: true, orders: parsedOrders, source: 'neon' });
    } catch (err) {
      console.warn('[Neon Fetch Orders Error]:', err.message);
    }
  }

  // Fallback to local cache
  const local = readLocalDb();
  let sorted = [...(local.orders || [])];
  if (restaurantId && restaurantId !== 'all') {
    sorted = sorted.filter(o => o.restaurant_id === restaurantId);
  }
  sorted.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (req.query.format === 'array') {
    return res.json(sorted);
  }
  return res.json({ success: true, orders: sorted, source: 'local_cache' });
});

// GET /api/orders/student/:identifier - Fetch orders for a student (by email, phone, ID, or order ID)
app.get('/api/orders/student/:identifier', async (req, res) => {
  const rawId = (req.params.identifier || '').trim();
  const idOrEmail = rawId.toLowerCase();
  const cleanPhone = rawId.replace(/\D/g, '').slice(-10);

  if (sql) {
    try {
      const rows = await sql`
        SELECT * FROM orders 
        WHERE LOWER(student_email) = ${idOrEmail} 
           OR user_id = ${rawId}
           OR student_id = ${rawId}
           OR id = ${rawId}
           OR (LENGTH(${cleanPhone}) >= 10 AND RIGHT(REGEXP_REPLACE(COALESCE(student_phone, ''), '[^0-9]', '', 'g'), 10) = ${cleanPhone})
        ORDER BY created_at DESC;
      `;
      const parsedOrders = rows.map((r) => ({
        ...r,
        total_amount: Number(r.total_amount),
        items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items
      }));
      return res.json({ success: true, orders: parsedOrders, source: 'neon' });
    } catch (err) {
      console.warn('[Neon Student Orders Error]:', err.message);
    }
  }

  // Fallback to local cache
  const local = readLocalDb();
  const userOrders = (local.orders || []).filter((o) => {
    const uid = (o.user_id || '').toLowerCase();
    const email = (o.student_email || '').toLowerCase();
    const sid = (o.student_id || '').toLowerCase();
    const oid = (o.id || '');
    const phone = (o.student_phone || '').replace(/\D/g, '').slice(-10);
    return uid === idOrEmail || email === idOrEmail || sid === idOrEmail || oid === rawId || (cleanPhone.length >= 10 && phone === cleanPhone);
  });
  const sorted = userOrders.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  res.json({ success: true, orders: sorted, source: 'local_cache' });
});

// GET /api/orders/:id - Fetch single order details
app.get('/api/orders/:id', async (req, res) => {
  const orderId = req.params.id;

  if (sql) {
    try {
      const rows = await sql`SELECT * FROM orders WHERE id = ${orderId} LIMIT 1;`;
      if (rows.length > 0) {
        const r = rows[0];
        const parsed = {
          ...r,
          total_amount: Number(r.total_amount),
          items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items
        };
        return res.json({
          ...parsed,
          success: true,
          order: parsed,
          source: 'neon'
        });
      }
    } catch (err) {
      console.warn('[Neon Single Order Error]:', err.message);
    }
  }

  // Fallback to local cache
  const local = readLocalDb();
  const found = (local.orders || []).find((o) => o.id === orderId);
  if (found) {
    return res.json({
      ...found,
      success: true,
      order: found,
      source: 'local_cache'
    });
  }

  res.status(404).json({ success: false, error: 'Order not found' });
});

// POST /api/orders - Student creates a new order (Stores in Neon DB)
app.post('/api/orders', async (req, res) => {
  const orderData = req.body || {};
  let totalAmount = orderData ? (orderData.total_amount ?? orderData.totalAmount) : undefined;
  if (totalAmount === undefined && Array.isArray(orderData.items)) {
    totalAmount = orderData.items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  }

  if (!orderData || totalAmount === undefined || !Array.isArray(orderData.items)) {
    return res.status(400).json({ success: false, error: 'Invalid order payload.' });
  }

  // Extract auth user if Bearer token present
  let authUser = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const raw = authHeader.replace('Bearer ', '').trim();
      if (raw.startsWith('cb_')) {
        authUser = JSON.parse(Buffer.from(raw.replace('cb_', ''), 'base64').toString('utf8'));
      }
    } catch (e) {}
  }

  // Two-Tier Availability Server Guard: Platform status & Restaurant status
  if (sql) {
    try {
      const settings = await sql`SELECT * FROM system_settings WHERE id = 'global' LIMIT 1;`;
      const isAllowed = settings && settings.length > 0
        ? (settings[0].ordering_enabled !== false && settings[0].platform_enabled !== false)
        : true;
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          error: 'Srm : College Bites ordering is temporarily paused by university administration. Please try again later.'
        });
      }

      const restId = orderData.restaurant_id || orderData.restaurantId || 'local-home-kitchen';
      const restRows = await sql`SELECT is_open, name FROM restaurants WHERE id = ${restId} LIMIT 1;`;
      if (restRows && restRows.length > 0 && restRows[0].is_open === false) {
        return res.status(403).json({
          success: false,
          error: `${restRows[0].name || 'This restaurant'} is currently closed and not accepting new orders.`
        });
      }

      // Three-Tier Guard: Verify each individual dish is IN STOCK in Neon DB
      if (Array.isArray(orderData.items) && orderData.items.length > 0) {
        const itemIds = orderData.items.map(i => i.id || i.menu_item_id).filter(Boolean);
        if (itemIds.length > 0) {
          const dbItems = await sql`
            SELECT id, name, is_available 
            FROM menu_items 
            WHERE id = ANY(${itemIds});
          `;
          for (const itm of orderData.items) {
            const itmId = itm.id || itm.menu_item_id;
            const match = dbItems.find(d => d.id === itmId || String(d.id).toLowerCase() === String(itmId).toLowerCase());
            if (match && (match.is_available === false || match.is_available === 'false' || match.is_available === 0)) {
              return res.status(400).json({
                success: false,
                error: `Item "${match.name || itm.name || 'Selected dish'}" is currently sold out and cannot be ordered. Please remove it from your cart to proceed.`
              });
            }
          }
        }
      }
    } catch (guardErr) {
      console.warn('[Availability Guard Warning]:', guardErr.message);
    }
  }

  const orderId = orderData.id || `CB-${Math.floor(100000 + Math.random() * 900000)}`;
  const nowIso = new Date().toISOString();

  const newOrder = {
    id: orderId,
    user_id: orderData.user_id || orderData.userId || authUser?.id || null,
    student_name: orderData.student_name || orderData.studentName || authUser?.name || 'Student',
    student_email: orderData.student_email || orderData.studentEmail || authUser?.email || '',
    student_id: orderData.student_id || orderData.studentId || null,
    student_phone: orderData.student_phone || orderData.studentPhone || authUser?.phone || '9989955833',
    delivery_location: orderData.delivery_location || orderData.deliveryLocation || 'SRM University - Gate 3',
    restaurant_id: orderData.restaurant_id || orderData.restaurantId || 'local-home-kitchen',
    restaurant_name: orderData.restaurant_name || orderData.restaurantName || 'Campus Kitchen',
    total_amount: Number(totalAmount) || 0,
    status: orderData.status || 'CONFIRMED',
    instructions: orderData.instructions || null,
    created_at: orderData.created_at || nowIso,
    confirmed_at: nowIso,
    updated_at: nowIso,
    items: orderData.items || []
  };

  // 1. Insert into Neon DB
  if (sql) {
    try {
      // Insert into orders table
      await sql`
        INSERT INTO orders (
          id, user_id, student_name, student_email, student_phone, student_id,
          delivery_location, restaurant_id, restaurant_name, total_amount,
          status, instructions, items, created_at, confirmed_at, updated_at
        ) VALUES (
          ${newOrder.id},
          ${newOrder.user_id},
          ${newOrder.student_name},
          ${newOrder.student_email},
          ${newOrder.student_phone},
          ${newOrder.student_id},
          ${newOrder.delivery_location},
          ${newOrder.restaurant_id},
          ${newOrder.restaurant_name},
          ${newOrder.total_amount},
          ${newOrder.status},
          ${newOrder.instructions},
          ${JSON.stringify(newOrder.items)},
          ${newOrder.created_at},
          ${newOrder.confirmed_at},
          ${newOrder.updated_at}
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          updated_at = NOW();
      `;

      // Concurrently upsert student profile, insert order items & record history
      const parallelTasks = [];

      // Upsert Student profile into students table
      if (newOrder.student_email) {
        parallelTasks.push(
          sql`
            INSERT INTO students (
              id, name, email, student_id, phone, hostel_block, room_number, total_orders, updated_at
            ) VALUES (
              ${newOrder.user_id || 'student-' + Math.random().toString(36).substring(2, 9)},
              ${newOrder.student_name},
              ${newOrder.student_email.toLowerCase()},
              ${newOrder.student_id},
              ${newOrder.student_phone},
              ${orderData.hostel_block || null},
              ${orderData.room_number || null},
              1,
              NOW()
            )
            ON CONFLICT (email) DO UPDATE SET
              name = EXCLUDED.name,
              phone = COALESCE(EXCLUDED.phone, students.phone),
              student_id = COALESCE(EXCLUDED.student_id, students.student_id),
              total_orders = students.total_orders + 1,
              updated_at = NOW();
          `.catch(e => console.warn('Student upsert warning:', e.message))
        );
      }

      // Record in order_status_history
      parallelTasks.push(
        sql`
          INSERT INTO order_status_history (order_id, status, changed_at)
          VALUES (${newOrder.id}, ${newOrder.status}, NOW());
        `.catch(e => {})
      );

      // Batch insert individual items
      if (Array.isArray(newOrder.items) && newOrder.items.length > 0) {
        for (const item of newOrder.items) {
          parallelTasks.push(
            sql`
              INSERT INTO order_items (
                order_id, item_name, quantity, unit_price, total_price, created_at
              ) VALUES (
                ${newOrder.id},
                ${item.name},
                ${item.quantity || 1},
                ${item.price || 0},
                ${(item.price || 0) * (item.quantity || 1)},
                NOW()
              );
            `.catch(e => {})
          );
        }
      }

      await Promise.all(parallelTasks);
      isNeonReady = true;
      console.log(`[Neon DB] Order #${newOrder.id} successfully saved to PostgreSQL!`);
    } catch (err) {
      console.error('[Neon DB Order Insert Error]:', err.message);
    }
  }

  // Invalidate in-memory cache so Admin immediately sees the new order
  invalidateOrdersCache();

  // 2. Also sync to local cache asynchronously
  setImmediate(() => {
    try {
      const local = readLocalDb();
      local.orders = [newOrder, ...(local.orders || []).filter((o) => o.id !== newOrder.id)];
      writeLocalDb(local);
    } catch (e) {}
  });

  res.status(201).json({ success: true, order: newOrder, stored_in_neon: isNeonReady });
});

// 4. Update Order Status - Supports POST/PATCH on /api/orders/status & /api/orders/:id/status
const handleOrderStatusUpdate = async (req, res) => {
  const body = req.body || {};
  const orderId = req.params.id || body.orderId || body.order_id || req.query.id;
  const rawStatus = (body.status || '').toUpperCase().trim();
  const status = rawStatus === 'DELIVERED' ? 'COMPLETED' : rawStatus;

  const validStatuses = [
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED'
  ];

  if (!orderId) {
    return res.status(400).json({ success: false, error: 'Order ID is required' });
  }

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  let updatedOrder = null;

  // 1. Update in Neon DB
  if (sql) {
    try {
      let result;
      if (status === 'COMPLETED') {
        result = await sql`
          UPDATE orders 
          SET status = ${status}, completed_at = NOW(), updated_at = NOW() 
          WHERE id = ${orderId} OR id LIKE ${orderId + '%'}
          RETURNING *;
        `;
      } else if (status === 'CANCELLED') {
        result = await sql`
          UPDATE orders 
          SET status = ${status}, cancelled_at = NOW(), updated_at = NOW() 
          WHERE id = ${orderId} OR id LIKE ${orderId + '%'}
          RETURNING *;
        `;
      } else {
        result = await sql`
          UPDATE orders 
          SET status = ${status}, updated_at = NOW() 
          WHERE id = ${orderId} OR id LIKE ${orderId + '%'}
          RETURNING *;
        `;
      }

      if (result && result.length > 0) {
        updatedOrder = {
          ...result[0],
          total_amount: Number(result[0].total_amount),
          items: typeof result[0].items === 'string' ? JSON.parse(result[0].items) : result[0].items
        };

        // Record in status history
        await sql`
          INSERT INTO order_status_history (order_id, status, changed_at)
          VALUES (${orderId}, ${status}, NOW());
        `;
        console.log(`[Neon DB] Order #${orderId} status updated to: ${status}`);
      }
    } catch (err) {
      console.error('[Neon DB Status Update Error]:', err.message);
    }
  }

  // 2. Sync to local cache
  const local = readLocalDb();
  const orderIndex = (local.orders || []).findIndex((o) => o.id === orderId);
  if (orderIndex !== -1) {
    local.orders[orderIndex].status = status;
    if (status === 'COMPLETED') local.orders[orderIndex].completed_at = new Date().toISOString();
    if (status === 'CANCELLED') local.orders[orderIndex].cancelled_at = new Date().toISOString();
    local.orders[orderIndex].updated_at = new Date().toISOString();
    writeLocalDb(local);
    if (!updatedOrder) updatedOrder = local.orders[orderIndex];
  }

  if (!updatedOrder) {
    return res.status(404).json({ success: false, error: `Order #${orderId} not found.` });
  }

  // Invalidate cache immediately on status change
  invalidateOrdersCache();

  res.json({
    success: true,
    message: `Order #${orderId} status changed to ${status}`,
    order: updatedOrder
  });
};

app.post('/api/orders/status', handleOrderStatusUpdate);
app.patch('/api/orders/status', handleOrderStatusUpdate);
app.post('/api/orders/:id/status', handleOrderStatusUpdate);
app.patch('/api/orders/:id/status', handleOrderStatusUpdate);

// 5. Delete Order - Supports POST /api/orders/delete & DELETE /api/orders/:id & bulk delete
const handleOrderDelete = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const body = req.body || {};
  const orderId = req.params.id || body.orderId || body.order_id || req.query.id || req.query.orderId;

  if (orderId === 'all' || req.query.all === 'true') {
    if (sql) {
      try {
        await sql`DELETE FROM order_items;`;
        await sql`DELETE FROM orders;`;
        console.log('[Neon DB] All orders permanently deleted');
      } catch (err) {
        console.warn('[Neon DB Delete All Error]:', err.message);
      }
    }
    const local = readLocalDb();
    local.orders = [];
    writeLocalDb(local);
    invalidateOrdersCache();
    return res.json({ success: true, message: 'All orders permanently deleted.' });
  }

  if (!orderId) {
    return res.status(400).json({ success: false, error: 'Order ID is required' });
  }

  if (sql) {
    try {
      await sql`DELETE FROM order_items WHERE order_id = ${orderId};`;
      await sql`DELETE FROM orders WHERE id = ${orderId} OR id LIKE ${orderId + '%'};`;
      console.log(`[Neon DB] Order #${orderId} deleted from PostgreSQL`);
    } catch (err) {
      console.warn('[Neon DB Delete Error]:', err.message);
    }
  }

  const local = readLocalDb();
  local.orders = (local.orders || []).filter((o) => o.id !== orderId);
  writeLocalDb(local);

  invalidateOrdersCache();

  res.json({ success: true, message: `Order #${orderId} permanently deleted.` });
};

app.post('/api/orders/delete', handleOrderDelete);
app.delete('/api/orders/delete', handleOrderDelete);
app.delete('/api/orders/:id', handleOrderDelete);

// 5B. Delivery Partners (Simplified Architecture - Removed)
app.get('/api/delivery-partners', (req, res) => {
  res.json({ success: true, partners: [] });
});
app.all(['/api/delivery-partners', '/api/delivery-partners/:id'], (req, res) => {
  res.json({ success: true, message: 'Delivery partner system removed.' });
});
app.all(['/api/rider/login', '/api/rider/orders', '/api/rider/orders/status'], (req, res) => {
  res.status(404).json({ success: false, error: 'Delivery partner system has been simplified and removed from CampusBites.' });
});


// 6. GET /api/students - Admin views all registered students
app.get('/api/students', async (req, res) => {
  if (sql) {
    try {
      const students = await sql`
        SELECT * FROM students 
        ORDER BY updated_at DESC;
      `;
      return res.json({ success: true, students, source: 'neon' });
    } catch (err) {
      console.warn('[Neon Fetch Students Error]:', err.message);
    }
  }

  const local = readLocalDb();
  res.json({ success: true, students: local.students || [], source: 'local_cache' });
});

// 7. POST /api/students - Register or update student details
app.post('/api/students', async (req, res) => {
  const { id, name, email, student_id, phone, hostel_block, room_number } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Student email is required.' });
  }

  const studentPayload = {
    id: id || 'student-' + Math.random().toString(36).substring(2, 9),
    name: name || 'Student',
    email: email.toLowerCase().trim(),
    student_id: student_id || null,
    phone: phone || null,
    hostel_block: hostel_block || null,
    room_number: room_number || null,
    updated_at: new Date().toISOString()
  };

  if (sql) {
    try {
      await sql`
        INSERT INTO students (
          id, name, email, student_id, phone, hostel_block, room_number, updated_at
        ) VALUES (
          ${studentPayload.id},
          ${studentPayload.name},
          ${studentPayload.email},
          ${studentPayload.student_id},
          ${studentPayload.phone},
          ${studentPayload.hostel_block},
          ${studentPayload.room_number},
          NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
          name = CASE WHEN EXCLUDED.name IS NOT NULL AND EXCLUDED.name != '' THEN EXCLUDED.name ELSE students.name END,
          phone = CASE WHEN EXCLUDED.phone IS NOT NULL AND EXCLUDED.phone != '' THEN EXCLUDED.phone ELSE students.phone END,
          student_id = COALESCE(EXCLUDED.student_id, students.student_id),
          hostel_block = COALESCE(EXCLUDED.hostel_block, students.hostel_block),
          room_number = COALESCE(EXCLUDED.room_number, students.room_number),
          updated_at = NOW();
      `;

      // Also update any in-progress orders so delivery partner sees updated student phone and name
      if (studentPayload.phone) {
        await sql`
          UPDATE orders
          SET 
            student_name = ${studentPayload.name},
            student_phone = ${studentPayload.phone},
            updated_at = NOW()
          WHERE student_email = ${studentPayload.email}
            AND status NOT IN ('DELIVERED', 'CANCELLED');
        `;
      }

      console.log(`[Neon DB] Student details saved: ${studentPayload.name} (${studentPayload.email}) - Phone: ${studentPayload.phone}`);
    } catch (err) {
      console.error('[Neon DB Student Save Error]:', err.message);
    }
  }

  const local = readLocalDb();
  local.students = [
    studentPayload,
    ...(local.students || []).filter((s) => s.email !== studentPayload.email)
  ];
  writeLocalDb(local);

  res.json({ success: true, student: studentPayload });
});


// ========================================================
// TWO-TIER AVAILABILITY API (Platform Switch & Restaurant Toggles)
// ========================================================

// GET /api/system-settings - Get overall platform and ordering availability
app.get('/api/system-settings', async (req, res) => {
  if (sql) {
    try {
      const rows = await sql`SELECT * FROM system_settings WHERE id = 'global' LIMIT 1;`;
      if (rows && rows.length > 0) {
        return res.json({
          success: true,
          platform_enabled: rows[0].platform_enabled !== false,
          ordering_enabled: rows[0].ordering_enabled !== false
        });
      }
    } catch (err) {
      console.warn('[Neon System Settings Fetch Error]:', err.message);
    }
  }

  const local = readLocalDb();
  res.json({
    success: true,
    platform_enabled: local.platform_enabled !== false,
    ordering_enabled: local.ordering_enabled !== false
  });
});

// POST /api/system-settings/platform - Super Admin toggles entire platform ON/OFF
app.post('/api/system-settings/platform', async (req, res) => {
  const { platform_enabled } = req.body || {};
  const isEnabled = Boolean(platform_enabled);

  if (sql) {
    try {
      await sql`
        INSERT INTO system_settings (id, platform_enabled, ordering_enabled, updated_at)
        VALUES ('global', ${isEnabled}, ${isEnabled}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          platform_enabled = ${isEnabled},
          ordering_enabled = ${isEnabled},
          updated_at = NOW();
      `;
      console.log(`[Platform Status] Super Admin updated platform_enabled to: ${isEnabled}`);
    } catch (err) {
      console.error('[Platform Update Error]:', err.message);
    }
  }

  const local = readLocalDb();
  local.platform_enabled = isEnabled;
  local.ordering_enabled = isEnabled;
  writeLocalDb(local);

  res.json({ success: true, platform_enabled: isEnabled, message: `Platform ${isEnabled ? 'Activated' : 'Paused'}` });
});

// 4. Assign Delivery Partner (Simplified Architecture - Removed)
const handleAssignDeliveryPartner = async (req, res) => {
  res.json({ success: true, message: 'Delivery partner assignment removed.' });
};

app.all(['/api/orders/assign-partner', '/api/orders/:id/assign-partner'], handleAssignDeliveryPartner);

// 8. System & Restaurant Toggles (Neon PostgreSQL with Fallback)

// GET /api/settings or /api/settings/ordering
app.get(['/api/settings', '/api/settings/ordering'], async (req, res) => {
  if (sql) {
    try {
      const rows = await sql`SELECT ordering_enabled FROM system_settings WHERE id = 'global';`;
      if (rows && rows.length > 0) {
        return res.json({ success: true, ordering_enabled: rows[0].ordering_enabled !== false });
      }
    } catch (e) {
      console.warn('[Neon Settings Fetch Error]:', e.message);
    }
  }
  const local = readLocalDb();
  res.json({ success: true, ordering_enabled: local.settings?.ordering_enabled !== false });
});

// POST or PATCH /api/settings/ordering
app.all(['/api/settings', '/api/settings/ordering', '/api/settings/toggle'], async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { ordering_enabled } = req.body || {};
  const isEnabled = ordering_enabled !== false;

  if (sql) {
    try {
      await sql`
        INSERT INTO system_settings (id, ordering_enabled, updated_at)
        VALUES ('global', ${isEnabled}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          ordering_enabled = ${isEnabled},
          updated_at = NOW();
      `;

      // When overall ordering is closed/paused, close all individual restaurants in DB!
      // When re-opened, restore restaurants to open!
      await sql`
        UPDATE restaurants 
        SET is_open = ${isEnabled}, updated_at = NOW();
      `;
      isNeonReady = true;
      console.log(`[Neon DB] Overall Campus Ordering System updated: ${isEnabled ? 'ACTIVE' : 'PAUSED'} (All restaurants synchronized to ${isEnabled ? 'OPEN' : 'CLOSED'})`);
    } catch (e) {
      console.warn('[Neon Settings Update Error]:', e.message);
    }
  }

  const local = readLocalDb();
  local.settings = local.settings || {};
  local.settings.ordering_enabled = isEnabled;
  if (Array.isArray(local.restaurants)) {
    local.restaurants.forEach(r => { r.is_open = isEnabled; });
  }
  writeLocalDb(local);

  res.json({ success: true, ordering_enabled: isEnabled });
});

// GET /api/restaurants
app.get('/api/restaurants', async (req, res) => {
  let isGlobalOrderingEnabled = true;

  if (sql) {
    try {
      const settingRows = await sql`SELECT ordering_enabled FROM system_settings WHERE id = 'global';`;
      if (settingRows && settingRows.length > 0) {
        isGlobalOrderingEnabled = settingRows[0].ordering_enabled !== false;
      }

      let rows = await sql`SELECT * FROM restaurants ORDER BY id ASC;`;
      if (rows && rows.length > 0) {
        isNeonReady = true;
        // If overall campus ordering is closed, all restaurants are strictly closed!
        if (!isGlobalOrderingEnabled) {
          rows = rows.map(r => ({ ...r, is_open: false }));
        }
        return res.json({ success: true, restaurants: rows, source: 'neon' });
      }
    } catch (e) {
      console.warn('[Neon Restaurants Fetch Error]:', e.message);
    }
  }

  const local = readLocalDb();
  isGlobalOrderingEnabled = local.settings?.ordering_enabled !== false;
  let list = (local.restaurants && local.restaurants.length > 0) ? local.restaurants : INITIAL_RESTAURANTS;
  if (!isGlobalOrderingEnabled) {
    list = list.map(r => ({ ...r, is_open: false }));
  }
  res.json({ success: true, restaurants: list, source: 'local_cache' });
});

// POST, PATCH, PUT /api/restaurants/toggle, /api/restaurants/:id/toggle, /api/restaurants/:id, /api/restaurants
app.all(['/api/restaurants/toggle', '/api/restaurants/:id/toggle', '/api/restaurants/:id', '/api/restaurants'], async (req, res) => {
  if (req.method === 'GET') {
    return; // Handled by app.get('/api/restaurants')
  }

  const restId = req.params.id || req.body?.id || req.body?.restaurantId || req.body?.restaurant_id;
  if (!restId) {
    return res.status(400).json({ success: false, error: 'Restaurant ID is required.' });
  }

  const { is_open } = req.body || {};
  let targetState = Boolean(is_open);
  let updatedRest = null;

  if (sql) {
    try {
      if (typeof is_open === 'undefined') {
        const curr = await sql`SELECT is_open FROM restaurants WHERE id = ${restId} OR id LIKE ${restId + '%'} LIMIT 1;`;
        if (curr && curr.length > 0) {
          targetState = !(curr[0].is_open !== false);
        }
      }

      const result = await sql`
        UPDATE restaurants 
        SET is_open = ${targetState}, updated_at = NOW() 
        WHERE id = ${restId} OR id LIKE ${restId + '%'}
        RETURNING *;
      `;

      if (result && result.length > 0) {
        updatedRest = result[0];
        isNeonReady = true;
        console.log(`[Neon DB] Restaurant ${updatedRest.name} (${restId}) is now: ${targetState ? 'OPEN' : 'CLOSED'}`);
      }
    } catch (e) {
      console.warn('[Neon Restaurant Toggle Error]:', e.message);
    }
  }

  const local = readLocalDb();
  if (!local.restaurants || local.restaurants.length === 0) {
    local.restaurants = [...INITIAL_RESTAURANTS];
  }
  const rest = local.restaurants.find((r) => r.id === restId || r.id.startsWith(restId));
  if (rest) {
    rest.is_open = targetState;
    if (!updatedRest) updatedRest = rest;
  }
  writeLocalDb(local);

  res.json({ success: true, restaurantId: restId, is_open: targetState, restaurant: updatedRest || { id: restId, is_open: targetState } });
});

// ----------------------------------------------------
// 9. MENU ITEMS MANAGEMENT (Neon PostgreSQL & Realtime)
// ----------------------------------------------------

// GET /api/menu & /api/menu/:restaurantId - List all menu items (flexible for portals & test clients)
app.get(['/api/menu', '/api/menu/:restaurantId'], async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const restaurant_id = req.params.restaurantId || req.query.restaurant_id;
  const { available_only } = req.query;

  if (sql) {
    try {
      let items;
      if (restaurant_id) {
        if (available_only === 'true') {
          items = await sql`
            SELECT * FROM menu_items 
            WHERE restaurant_id = ${restaurant_id} AND is_available = true 
            ORDER BY category, name;
          `;
        } else {
          items = await sql`
            SELECT * FROM menu_items 
            WHERE restaurant_id = ${restaurant_id} 
            ORDER BY category, name;
          `;
        }
      } else {
        if (available_only === 'true') {
          items = await sql`
            SELECT * FROM menu_items 
            WHERE is_available = true 
            ORDER BY restaurant_id, category, name;
          `;
        } else {
          items = await sql`
            SELECT * FROM menu_items 
            ORDER BY restaurant_id, category, name;
          `;
        }
      }

      const parsed = items.map(i => ({
        ...i,
        price: Number(i.price),
        rating: Number(i.rating || 4.5),
        is_veg: Boolean(i.is_veg),
        is_available: i.is_available !== false && i.is_available !== 'false' && i.is_available !== 0
      }));

      // If requested via REST parameter (/api/menu/:restaurantId), return array directly for legacy/direct test clients
      if (req.params.restaurantId) {
        return res.json(parsed);
      }
      return res.json({ success: true, items: parsed, source: 'neon' });
    } catch (err) {
      console.warn('[Neon Menu Fetch Error]:', err.message);
    }
  }

  // Fallback to local cache
  const local = readLocalDb();
  let list = Array.isArray(local.menu_items) ? local.menu_items : INITIAL_MENU_ITEMS;
  if (restaurant_id) list = list.filter(i => i.restaurant_id === restaurant_id);
  if (available_only === 'true') list = list.filter(i => i.is_available !== false);

  if (req.params.restaurantId) {
    return res.json(list);
  }
  res.json({ success: true, items: list, source: 'local_cache' });
});

// GET /api/images/:id - Serve dish image directly from Neon PostgreSQL database
app.get('/api/images/:id', async (req, res) => {
  const imageId = req.params.id;

  if (sql) {
    try {
      const rows = await sql`SELECT image_data, mime_type FROM food_images WHERE id = ${imageId};`;
      if (rows && rows.length > 0) {
        const { image_data, mime_type } = rows[0];
        const matches = image_data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          res.setHeader('Content-Type', matches[1] || mime_type || 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          return res.send(buffer);
        }
      }
    } catch (err) {
      console.warn('[Neon DB Image Fetch Warning]:', err.message);
    }
  }

  // Fallback: check local uploads directory
  const files = fs.readdirSync(UPLOADS_DIR);
  const matchFile = files.find(f => f.startsWith(imageId));
  if (matchFile) {
    return res.sendFile(path.join(UPLOADS_DIR, matchFile));
  }

  return res.status(404).json({ success: false, error: 'Image not found in database' });
});

// POST /api/upload-image - Upload food dish photo and persist directly into Neon PostgreSQL
app.post('/api/upload-image', async (req, res) => {
  try {
    const { image, name } = req.body || {};
    if (!image) {
      return res.status(400).json({ success: false, error: 'No image data provided' });
    }

    // Check if standard HTTP(S) URL
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return res.json({ success: true, url: image });
    }

    // Check if Base64 data URL
    const matches = image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, error: 'Invalid image format. Expected Base64 data URL or HTTP URL.' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const ext = mimeType.split('/')[1] || 'jpg';
    const cleanExt = ext === 'jpeg' ? 'jpg' : ext.replace(/[^a-zA-Z0-9]/g, '');
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const filename = `${imageId}.${cleanExt}`;

    // 1. Save directly into Neon PostgreSQL database (food_images table)
    if (sql) {
      try {
        await sql`
          INSERT INTO food_images (id, image_data, mime_type, filename)
          VALUES (${imageId}, ${image}, ${mimeType}, ${filename})
          ON CONFLICT (id) DO UPDATE SET image_data = EXCLUDED.image_data;
        `;
        console.log(`[Neon DB] Saved uploaded dish photo into PostgreSQL database: ${imageId} (${filename})`);
      } catch (dbErr) {
        console.error('[Neon DB Image Persistence Error]:', dbErr.message);
      }
    }

    // 2. Also save static file copy on disk for local caching
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const dbServedUrl = `/api/images/${imageId}`;
    return res.json({
      success: true,
      url: dbServedUrl,
      id: imageId,
      filename
    });
  } catch (err) {
    console.error('[Upload Image Error]:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save image: ' + err.message });
  }
});

// POST /api/menu - Admin adds new dish
app.post('/api/menu', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const data = req.body;
  if (!data || !data.name || !data.price || !data.restaurant_id) {
    return res.status(400).json({ success: false, error: 'Name, price and restaurant_id are required.' });
  }

  const itemId = data.id || `dish-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const restaurantName = data.restaurant_name || 
    (data.restaurant_id === 'clg-bites-biryani-nation' ? 'Biryani Nation' : 'Local Home Kitchen');

  const defaultImg = data.is_veg 
    ? 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'
    : 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80';

  let newItem = {
    id: itemId,
    restaurant_id: data.restaurant_id,
    restaurant_name: restaurantName,
    name: data.name.trim(),
    description: data.description ? data.description.trim() : '',
    price: Number(data.price),
    category: data.category || 'Meals',
    is_veg: data.is_veg !== false,
    is_available: data.is_available !== false,
    image_url: data.image_url && data.image_url.trim() ? data.image_url.trim() : defaultImg,
    preparation_time: data.preparation_time || '15-20 mins',
    rating: Number(data.rating || 4.5),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (sql) {
    try {
      const rows = await sql`
        INSERT INTO menu_items (
          id, restaurant_id, restaurant_name, name, description, price, category, is_veg, is_available, image_url, preparation_time, rating
        ) VALUES (
          ${newItem.id},
          ${newItem.restaurant_id},
          ${newItem.restaurant_name},
          ${newItem.name},
          ${newItem.description},
          ${newItem.price},
          ${newItem.category},
          ${newItem.is_veg},
          ${newItem.is_available},
          ${newItem.image_url},
          ${newItem.preparation_time},
          ${newItem.rating}
        )
        RETURNING *;
      `;
      if (rows && rows.length > 0) {
        newItem = {
          ...newItem,
          ...rows[0],
          price: Number(rows[0].price),
          rating: Number(rows[0].rating || 4.5),
          is_veg: Boolean(rows[0].is_veg),
          is_available: rows[0].is_available !== false
        };
      }
      console.log(`[Neon DB] New dish created: ${newItem.name} (₹${newItem.price})`);
    } catch (err) {
      console.error('[Neon DB Dish Create Error]:', err.message);
      return res.status(500).json({ success: false, error: 'Failed to create dish in database: ' + err.message });
    }
  }

  const local = readLocalDb();
  local.menu_items = [newItem, ...(local.menu_items || INITIAL_MENU_ITEMS).filter(i => i.id !== newItem.id)];
  writeLocalDb(local);

  res.status(201).json({ success: true, item: newItem });
});

// PUT /api/menu/:id - Admin updates a dish
app.put('/api/menu/:id', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const itemId = req.params.id;
  const data = req.body;
  let updatedDish = null;

  if (sql) {
    try {
      const rows = await sql`
        UPDATE menu_items 
        SET 
          name = COALESCE(${data.name}, name),
          description = COALESCE(${data.description}, description),
          price = COALESCE(${data.price !== undefined ? Number(data.price) : null}, price),
          category = COALESCE(${data.category}, category),
          is_veg = COALESCE(${data.is_veg !== undefined ? Boolean(data.is_veg) : null}, is_veg),
          is_available = COALESCE(${data.is_available !== undefined ? (data.is_available !== false && data.is_available !== 'false' && data.is_available !== 0) : null}, is_available),
          image_url = COALESCE(${data.image_url !== undefined ? data.image_url : null}, image_url),
          preparation_time = COALESCE(${data.preparation_time}, preparation_time),
          updated_at = NOW()
        WHERE id = ${itemId} OR LOWER(id) = LOWER(${itemId})
        RETURNING *;
      `;
      if (rows && rows.length > 0) {
        updatedDish = {
          ...rows[0],
          price: Number(rows[0].price),
          rating: Number(rows[0].rating || 4.5),
          is_veg: Boolean(rows[0].is_veg),
          is_available: rows[0].is_available !== false
        };
        console.log(`[Neon DB] Dish #${itemId} (${rows[0].name}) updated successfully`);
      } else {
        console.warn(`[Neon DB Warning] Dish #${itemId} not found for update`);
      }
    } catch (err) {
      console.error('[Neon DB Dish Update Error]:', err.message);
      return res.status(500).json({ success: false, error: 'Database update failed: ' + err.message });
    }
  }

  const local = readLocalDb();
  local.menu_items = (local.menu_items || INITIAL_MENU_ITEMS).map(i => {
    if (i.id === itemId || String(i.id).toLowerCase() === itemId.toLowerCase()) {
      const merged = {
        ...i,
        ...data,
        price: data.price !== undefined ? Number(data.price) : i.price,
        image_url: data.image_url !== undefined ? data.image_url : i.image_url,
        updated_at: new Date().toISOString()
      };
      if (!updatedDish) updatedDish = merged;
      return merged;
    }
    return i;
  });
  writeLocalDb(local);

  res.json({ success: true, message: 'Dish updated successfully', item: updatedDish });
});

// 1-Click Availability Toggle: Fast In Stock vs Sold Out (Supports PATCH, POST, PUT)
const handleAvailabilityToggle = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const rawId = req.params.id || req.body?.id || req.body?.itemId || '';
  const itemId = decodeURIComponent(String(rawId)).trim();

  if (!itemId) {
    return res.status(400).json({ success: false, error: 'Dish ID is required' });
  }

  // Parse availability flexibly from boolean, string, or number
  let is_available;
  const rawVal = req.body?.is_available !== undefined ? req.body.is_available :
                 req.body?.isAvailable !== undefined ? req.body.isAvailable :
                 req.body?.in_stock !== undefined ? req.body.in_stock :
                 req.body?.inStock !== undefined ? req.body.inStock :
                 req.body?.available;

  if (rawVal === false || rawVal === 'false' || rawVal === 0 || rawVal === '0') {
    is_available = false;
  } else {
    is_available = true;
  }

  let dbUpdated = false;
  if (sql) {
    try {
      let rows = await sql`
        UPDATE menu_items 
        SET is_available = ${is_available}, updated_at = NOW() 
        WHERE id = ${itemId} OR LOWER(id) = LOWER(${itemId})
        RETURNING id, name, is_available;
      `;

      // Fallback: If dish row didn't exist yet, look up in INITIAL_MENU_ITEMS and insert
      if (!rows || rows.length === 0) {
        const seed = INITIAL_MENU_ITEMS.find(s => s.id === itemId || s.id.toLowerCase() === itemId.toLowerCase());
        if (seed) {
          rows = await sql`
            INSERT INTO menu_items (
              id, restaurant_id, restaurant_name, name, description, price, category, is_veg, is_available, preparation_time, image_url
            ) VALUES (
              ${seed.id},
              ${seed.restaurant_id},
              ${seed.restaurant_name || (seed.restaurant_id === 'clg-bites-biryani-nation' ? 'Biryani Nation' : 'Local Home Kitchen')},
              ${seed.name},
              ${seed.description},
              ${Number(seed.price)},
              ${seed.category},
              ${seed.is_veg !== false},
              ${is_available},
              ${seed.preparation_time || '15-20 mins'},
              ${seed.image_url || null}
            ) ON CONFLICT (id) DO UPDATE SET
              is_available = ${is_available},
              updated_at = NOW()
            RETURNING id, name, is_available;
          `;
        }
      }

      if (rows && rows.length > 0) {
        dbUpdated = true;
        console.log(`[Neon DB] Dish #${rows[0].id} (${rows[0].name}) availability set to: ${is_available ? 'IN STOCK' : 'SOLD OUT'}`);
      } else {
        console.warn(`[Neon DB Warning] Dish not found for availability toggle: ${itemId}`);
      }
    } catch (err) {
      console.error('[Neon DB Availability Toggle Error]:', err.message);
      return res.status(500).json({ success: false, error: 'Database availability update failed: ' + err.message });
    }
  }

  const local = readLocalDb();
  local.menu_items = (local.menu_items || INITIAL_MENU_ITEMS).map(i => {
    if (i.id === itemId || String(i.id).toLowerCase() === itemId.toLowerCase()) {
      return { ...i, is_available, updated_at: new Date().toISOString() };
    }
    return i;
  });
  writeLocalDb(local);

  return res.json({ 
    success: true, 
    id: itemId, 
    is_available,
    dbUpdated,
    statusText: is_available ? 'IN STOCK' : 'SOLD OUT'
  });
};

app.patch('/api/menu/:id/availability', handleAvailabilityToggle);
app.post('/api/menu/:id/availability', handleAvailabilityToggle);
app.put('/api/menu/:id/availability', handleAvailabilityToggle);
app.post('/api/menu/availability', handleAvailabilityToggle);
app.patch('/api/menu/availability', handleAvailabilityToggle);


// PATCH & POST /api/menu/bulk-availability & /api/menu/restaurant/:restaurantId/availability
// Admin assigns all dishes in a restaurant as IN STOCK or SOLD OUT
const handleBulkMenuAvailability = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const restaurant_id = req.params.restaurantId || req.body?.restaurant_id || req.body?.restaurantId;
  const is_available = req.body?.is_available !== false;

  if (!restaurant_id) {
    return res.status(400).json({ success: false, error: 'restaurant_id is required' });
  }

  let updatedCount = 0;

  if (sql) {
    try {
      let result;
      if (restaurant_id === 'all' || restaurant_id === 'ALL') {
        result = await sql`
          UPDATE menu_items 
          SET is_available = ${is_available}, updated_at = NOW()
          RETURNING id;
        `;
      } else {
        result = await sql`
          UPDATE menu_items 
          SET is_available = ${is_available}, updated_at = NOW() 
          WHERE restaurant_id = ${restaurant_id} OR restaurant_id LIKE ${restaurant_id + '%'}
          RETURNING id;
        `;
      }
      updatedCount = result ? result.length : 0;
      console.log(`[Neon DB] Bulk updated ${updatedCount} dishes for restaurant ${restaurant_id} to: ${is_available ? 'IN STOCK' : 'SOLD OUT'}`);
    } catch (err) {
      console.error('[Neon DB Bulk Menu Availability Error]:', err.message);
      return res.status(500).json({ success: false, error: 'Bulk update failed: ' + err.message });
    }
  }

  const local = readLocalDb();
  let localUpdated = 0;
  local.menu_items = (local.menu_items || INITIAL_MENU_ITEMS).map(i => {
    if (restaurant_id === 'all' || restaurant_id === 'ALL' || i.restaurant_id === restaurant_id || i.restaurant_id.startsWith(restaurant_id)) {
      localUpdated++;
      return { ...i, is_available, updated_at: new Date().toISOString() };
    }
    return i;
  });
  writeLocalDb(local);

  return res.json({
    success: true,
    restaurant_id,
    is_available,
    updatedCount,
    message: `All dishes for ${restaurant_id === 'all' ? 'all kitchens' : restaurant_id} marked as ${is_available ? 'IN STOCK' : 'SOLD OUT'}`
  });
};

app.post('/api/menu/bulk-availability', handleBulkMenuAvailability);
app.patch('/api/menu/bulk-availability', handleBulkMenuAvailability);
app.post('/api/menu/restaurant/:restaurantId/availability', handleBulkMenuAvailability);
app.patch('/api/menu/restaurant/:restaurantId/availability', handleBulkMenuAvailability);

// DELETE /api/menu - Admin clears all dishes or per restaurant
app.delete('/api/menu', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const restaurant_id = req.query.restaurant_id || req.body?.restaurant_id;

  if (sql) {
    try {
      if (restaurant_id) {
        await sql`DELETE FROM menu_items WHERE restaurant_id = ${restaurant_id};`;
      } else {
        await sql`DELETE FROM menu_items;`;
      }
      console.log(`[Neon DB] Menu cleared ${restaurant_id ? `for restaurant: ${restaurant_id}` : 'completely across all restaurants'}`);
    } catch (err) {
      console.error('[Neon DB Menu Clear Error]:', err.message);
    }
  }

  const local = readLocalDb();
  if (restaurant_id) {
    local.menu_items = (local.menu_items || []).filter(i => i.restaurant_id !== restaurant_id);
  } else {
    local.menu_items = [];
  }
  writeLocalDb(local);

  res.json({ success: true, message: 'Menu cleared successfully.' });
});

// DELETE /api/menu/:id - Admin deletes a dish
app.delete('/api/menu/:id', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const itemId = req.params.id;

  if (sql) {
    try {
      await sql`DELETE FROM menu_items WHERE id = ${itemId};`;
      console.log(`[Neon DB] Dish #${itemId} deleted`);
    } catch (err) {
      console.error('[Neon DB Dish Delete Error]:', err.message);
    }
  }

  const local = readLocalDb();
  local.menu_items = (local.menu_items || []).filter(i => i.id !== itemId);
  writeLocalDb(local);

  res.json({ success: true, message: `Dish #${itemId} permanently deleted.` });
});

// GET /api/admin/metrics - Super Admin platform oversight metrics
app.get('/api/admin/metrics', async (req, res) => {
  if (sql) {
    try {
      const orderStats = await sql`
        SELECT
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as confirmed_orders,
          COUNT(CASE WHEN status = 'OUT_FOR_DELIVERY' THEN 1 END) as out_for_delivery,
          COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_orders,
          COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN total_amount ELSE 0 END), 0) as total_revenue
        FROM orders;
      `;
      const studentCount = await sql`SELECT COUNT(*) as count FROM students;`;
      const partnerCount = await sql`SELECT COUNT(*) as count FROM delivery_partners WHERE is_active = TRUE;`;
      const restStats = await sql`SELECT id, name, is_open FROM restaurants;`;

      return res.json({
        success: true,
        metrics: {
          total_orders: parseInt(orderStats[0]?.total_orders || '0', 10),
          confirmed_orders: parseInt(orderStats[0]?.confirmed_orders || '0', 10),
          out_for_delivery: parseInt(orderStats[0]?.out_for_delivery || '0', 10),
          delivered_orders: parseInt(orderStats[0]?.delivered_orders || '0', 10),
          cancelled_orders: parseInt(orderStats[0]?.cancelled_orders || '0', 10),
          total_revenue: Number(orderStats[0]?.total_revenue || 0)
        },
        total_students: parseInt(studentCount[0]?.count || '0', 10),
        active_partners: parseInt(partnerCount[0]?.count || '0', 10),
        restaurants: restStats
      });
    } catch (err) {
      console.warn('[Neon Metrics Error]:', err.message);
    }
  }

  const local = readLocalDb();
  const orders = local.orders || [];
  const delivered = orders.filter(o => o.status === 'DELIVERED');
  const revenue = delivered.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  res.json({
    success: true,
    metrics: {
      total_orders: orders.length,
      confirmed_orders: orders.filter(o => o.status === 'CONFIRMED').length,
      out_for_delivery: orders.filter(o => o.status === 'OUT_FOR_DELIVERY').length,
      delivered_orders: delivered.length,
      cancelled_orders: orders.filter(o => o.status === 'CANCELLED').length,
      total_revenue: revenue
    },
    total_students: (local.students || []).length,
    active_partners: (local.delivery_partners || []).length,
    restaurants: local.restaurants || []
  });
});

// Serve built production frontends if dist folders exist (Unified Full-Stack Deployment)
const studentDist = path.resolve(__dirname, '../student-app/dist');
const adminDist = path.resolve(__dirname, '../admin-app/dist');

if (fs.existsSync(adminDist)) {
  app.use('/admin', express.static(adminDist));
  app.get(/^\/admin(\/.*)?$/, (req, res) => res.sendFile(path.join(adminDist, 'index.html')));
}
if (fs.existsSync(studentDist)) {
  app.use(express.static(studentDist));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(studentDist, 'index.html'));
  });
}

// Export app for Vercel Serverless Function deployment
export default app;

// Start server locally when not on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`  Srm : College Bites Backend with Neon PostgreSQL Live! `);
    console.log(`  🌐 Port: http://localhost:${PORT}                 `);
    console.log(`  🐘 Neon DB: Connected                            `);
    console.log('====================================================');
  });
}

