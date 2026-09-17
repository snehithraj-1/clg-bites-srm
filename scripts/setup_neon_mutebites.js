import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import authentic data
import { AUTHENTIC_RESTAURANTS as MUTE_RESTAURANTS, AUTHENTIC_MENU_ITEMS as MUTE_MENU } from '../../mute-bites-vitap/server/authenticMenuData.js';
import { AUTHENTIC_RESTAURANTS as SRM_RESTAURANTS, AUTHENTIC_MENU_ITEMS as SRM_MENU } from '../server/authenticMenuData.js';

let connectionString = process.env.DATABASE_URL || '';
if (!connectionString) {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
      if (match && match[1]) connectionString = match[1].trim();
    }
  } catch (e) {}
}

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set in environment or .env');
  process.exit(1);
}

console.log('🚀 Connecting to Neon PostgreSQL database: mute bites...');
const sql = neon(connectionString);

async function runSetup() {
  try {
    const connCheck = await sql`SELECT 1 as ok, current_database(), now() as current_time;`;
    console.log(`✅ Connected successfully to database: "${connCheck[0].current_database}" at ${connCheck[0].current_time}`);

    console.log('\n📦 Step 1: Creating database tables...');

    // 1. Students Table
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
    console.log('   ✔ students table ready');

    // 2. Orders Table
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
        cancelled_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        confirmed_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    console.log('   ✔ orders table ready');

    // 3. Order Status History Table
    await sql`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        changed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    console.log('   ✔ order_status_history table ready');

    // 4. Menu Items Table
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
    console.log('   ✔ menu_items table ready');

    // 5. Food Images Table
    await sql`
      CREATE TABLE IF NOT EXISTS food_images (
        id VARCHAR(100) PRIMARY KEY,
        image_data TEXT NOT NULL,
        mime_type VARCHAR(50) DEFAULT 'image/jpeg',
        filename VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    console.log('   ✔ food_images table ready');

    // 6. OTP Verifications Table
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
    console.log('   ✔ otp_verifications table ready');

    // 7. Delivery Partners Table
    await sql`
      CREATE TABLE IF NOT EXISTS delivery_partners (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        pin VARCHAR(20) DEFAULT '1234',
        restaurant_id VARCHAR(100) DEFAULT 'all',
        is_active BOOLEAN DEFAULT true,
        is_available BOOLEAN DEFAULT true,
        total_deliveries INT DEFAULT 0,
        email VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    console.log('   ✔ delivery_partners table ready');

    // 8. Delivery Locations Table
    await sql`
      CREATE TABLE IF NOT EXISTS delivery_locations (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        delivery_partner_id VARCHAR(50) NOT NULL,
        latitude NUMERIC(10, 7) NOT NULL,
        longitude NUMERIC(10, 7) NOT NULL,
        accuracy NUMERIC(10, 2),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    console.log('   ✔ delivery_locations table ready');

    // 9. System Settings Table
    await sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        id VARCHAR(50) PRIMARY KEY,
        ordering_enabled BOOLEAN DEFAULT true,
        platform_enabled BOOLEAN DEFAULT true,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`
      INSERT INTO system_settings (id, ordering_enabled, platform_enabled, updated_at)
      VALUES ('global', true, true, NOW())
      ON CONFLICT (id) DO UPDATE SET
        ordering_enabled = EXCLUDED.ordering_enabled,
        platform_enabled = EXCLUDED.platform_enabled,
        updated_at = NOW();
    `;
    console.log('   ✔ system_settings table ready');

    // 10. Restaurants Table
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
    console.log('   ✔ restaurants table ready');

    // 11. Admin Accounts Table
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
    console.log('   ✔ admin_accounts table ready');

    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_student_email ON orders(student_email);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_menu_restaurant ON menu_items(restaurant_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category);`;
    console.log('   ✔ Indexes created');

    console.log('\n🏪 Step 2: Seeding Restaurants into Neon DB...');
    // Combine unique restaurants
    const allRestaurants = [...MUTE_RESTAURANTS];
    for (const srmR of SRM_RESTAURANTS) {
      if (!allRestaurants.some(r => r.id === srmR.id)) {
        allRestaurants.push(srmR);
      }
    }

    for (const r of allRestaurants) {
      await sql`
        INSERT INTO restaurants (
          id, name, description, cuisine, location, phone, rating, prep_time, image_url, is_open, created_at, updated_at
        ) VALUES (
          ${r.id}, ${r.name}, ${r.description}, ${r.cuisine}, ${r.location}, ${r.phone}, ${r.rating}, ${r.prep_time}, ${r.image_url}, ${r.is_open !== false}, NOW(), NOW()
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          cuisine = EXCLUDED.cuisine,
          location = EXCLUDED.location,
          phone = EXCLUDED.phone,
          rating = EXCLUDED.rating,
          prep_time = EXCLUDED.prep_time,
          image_url = EXCLUDED.image_url,
          is_open = EXCLUDED.is_open,
          updated_at = NOW();
      `;
      console.log(`   ✨ Seeded restaurant: ${r.name} (${r.id})`);
    }

    console.log('\n🍛 Step 3: Seeding Menu Items...');
    const allMenuItems = [...MUTE_MENU];
    for (const srmItem of SRM_MENU) {
      if (!allMenuItems.some(item => item.id === srmItem.id)) {
        allMenuItems.push(srmItem);
      }
    }

    let menuCount = 0;
    for (const item of allMenuItems) {
      await sql`
        INSERT INTO menu_items (
          id, restaurant_id, restaurant_name, category, name, description, price, is_veg, is_available, image_url, preparation_time, rating, created_at, updated_at
        ) VALUES (
          ${item.id},
          ${item.restaurant_id},
          ${item.restaurant_name},
          ${item.category},
          ${item.name},
          ${item.description || ''},
          ${item.price},
          ${item.is_veg !== false},
          ${item.is_available !== false},
          ${item.image_url || ''},
          ${item.preparation_time || '15-20 mins'},
          ${item.rating || 4.5},
          NOW(),
          NOW()
        ) ON CONFLICT (id) DO UPDATE SET
          restaurant_id = EXCLUDED.restaurant_id,
          restaurant_name = EXCLUDED.restaurant_name,
          category = EXCLUDED.category,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          is_veg = EXCLUDED.is_veg,
          is_available = EXCLUDED.is_available,
          image_url = EXCLUDED.image_url,
          preparation_time = EXCLUDED.preparation_time,
          rating = EXCLUDED.rating,
          updated_at = NOW();
      `;
      menuCount++;
    }
    console.log(`   ✔ Successfully seeded/upserted ${menuCount} menu items across all restaurants!`);

    console.log('\n👤 Step 4: Seeding Admin Accounts...');
    const adminAccounts = [
      { id: 'admin-super', username: 'collagebites1@gmail.com', name: 'Collage Bites (Super Admin)', role: 'super_admin', restaurantId: null, pass: 'Clgbites123' },
      { id: 'admin-super-alias', username: 'collagebites@gmail.com', name: 'Collage Bites Admin', role: 'super_admin', restaurantId: null, pass: 'Clgbites123' },
      { id: 'admin-bheemasena', username: 'bheemasena_admin', name: 'Bheemasena Restaurant Staff', role: 'restaurant_admin', restaurantId: 'bheemasena-restaurant', pass: 'Bheema@Campus2026' },
      { id: 'admin-a1', username: 'a1_admin', name: 'A1 Biryani Point Staff', role: 'restaurant_admin', restaurantId: 'a1-biryani-point', pass: 'A1@Campus2026' },
      { id: 'admin-bismillah', username: 'bismillah_admin', name: 'Bismillah Fruit Juice Staff', role: 'restaurant_admin', restaurantId: 'bismillah-fruit-juice', pass: 'Bismillah@Campus2026' },
      { id: 'admin-fruits', username: 'fruits_admin', name: 'Mutebites Fresh Fruits Staff', role: 'restaurant_admin', restaurantId: 'mutebites-fresh-fruits', pass: 'Fruits@Campus2026' },
      { id: 'admin-chinese', username: 'chinese_admin', name: 'Food Corner Staff', role: 'restaurant_admin', restaurantId: 'mutebites-chinese', pass: 'Chinese@Campus2026' },
      { id: 'admin-lhk', username: 'lhk_admin', name: 'Local Home Kitchen Staff', role: 'restaurant_admin', restaurantId: 'local-home-kitchen', pass: 'LHK@Campus2026' },
      { id: 'admin-clg', username: 'clgbites_admin', name: 'Biryani Nation Staff', role: 'restaurant_admin', restaurantId: 'clg-bites-biryani-nation', pass: 'CLG@Campus2026' }
    ];

    for (const adm of adminAccounts) {
      await sql`
        INSERT INTO admin_accounts (id, username, name, role, restaurant_id, password_hash, created_at, updated_at)
        VALUES (${adm.id}, ${adm.username}, ${adm.name}, ${adm.role}, ${adm.restaurantId}, ${adm.pass}, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          restaurant_id = EXCLUDED.restaurant_id,
          password_hash = EXCLUDED.password_hash,
          updated_at = NOW();
      `;
      console.log(`   ✔ Admin Account: ${adm.username} (${adm.role})`);
    }

    console.log('\n🛵 Step 5: Seeding Delivery Partners...');
    const partners = [
      { id: 'dp-bheema-1', name: 'Ramesh Kumar (Rider)', phone: '8247075652', restaurantId: 'bheemasena-restaurant' },
      { id: 'dp-a1-1', name: 'Suresh Reddy (Rider)', phone: '8247075652', restaurantId: 'a1-biryani-point' },
      { id: 'dp-bismillah-1', name: 'Basha (Rider)', phone: '8247075652', restaurantId: 'bismillah-fruit-juice' },
      { id: 'dp-campus-1', name: 'Campus Express Delivery', phone: '8247075652', restaurantId: 'all' },
      { id: 'dp-lhk-1', name: 'Ramesh Kumar (LHK Rider)', phone: '9989955833', restaurantId: 'local-home-kitchen' },
      { id: 'dp-clg-1', name: 'Rajesh Sharma (Rider)', phone: '8247840765', restaurantId: 'clg-bites-biryani-nation' }
    ];

    for (const dp of partners) {
      await sql`
        INSERT INTO delivery_partners (id, name, phone, restaurant_id, pin, is_active, is_available, created_at, updated_at)
        VALUES (${dp.id}, ${dp.name}, ${dp.phone}, ${dp.restaurantId}, '1234', true, true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          restaurant_id = EXCLUDED.restaurant_id,
          is_active = EXCLUDED.is_active,
          is_available = EXCLUDED.is_available,
          updated_at = NOW();
      `;
      console.log(`   ✔ Delivery Partner: ${dp.name} (${dp.id})`);
    }

    console.log('\n📊 Step 6: Verification and Data Summary in Neon DB...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log('\nTables currently in public schema:');
    for (const t of tables) {
      const countRes = await sql.query(`SELECT count(*)::int as c FROM "${t.table_name}";`);
      console.log(` - ${t.table_name}: ${countRes[0]?.c ?? 0} rows`);
    }

    console.log('\n🎉 ALL TABLES CREATED AND DATA STORED SUCCESSFULLY IN NEON DATABASE "mute bites"!');
  } catch (error) {
    console.error('❌ Error during setup:', error);
    process.exit(1);
  }
}

runSetup();
