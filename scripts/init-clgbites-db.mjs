import { neon } from '@neondatabase/serverless';
import { AUTHENTIC_RESTAURANTS, AUTHENTIC_MENU_ITEMS } from '../server/authenticMenuData.js';
import { VILASA_RESTAURANT, VILASA_MENU_ITEMS } from './add-vilasa-cafe.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl) {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
      if (match && match[1]) dbUrl = match[1].trim();
    }
  } catch (e) {}
}

if (!dbUrl) {
  console.error('❌ DATABASE_URL is not defined in environment or .env');
  process.exit(1);
}

console.log('Connecting to Neon database:', dbUrl.replace(/:[^:@]+@/, ':****@'));
const sql = neon(dbUrl);

async function initClgBites() {
  try {
    const dbInfo = await sql`SELECT current_database(), now()`;
    console.log(`Connected to database: ${dbInfo[0].current_database} at ${dbInfo[0].now}`);

    console.log('1. Creating `students` table...');
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

    console.log('2. Creating `orders` table...');
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
        status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
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

    console.log('3. Creating `order_status_history` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        changed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log('4. Creating `restaurants` table...');
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

    console.log('5. Creating `restaurant_statuses` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS restaurant_statuses (
        restaurant_id VARCHAR(100) PRIMARY KEY,
        status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log('6. Creating `menu_items` table...');
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
        rating NUMERIC DEFAULT 4.8,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log('7. Creating `food_images` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS food_images (
        id VARCHAR(100) PRIMARY KEY,
        image_data TEXT NOT NULL,
        mime_type VARCHAR(50) DEFAULT 'image/jpeg',
        filename VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log('8. Creating `otp_verifications` table...');
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

    console.log('9. Creating `delivery_partners` table...');
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

    console.log('10. Creating `system_settings` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        id VARCHAR(50) PRIMARY KEY,
        setting_key VARCHAR(100),
        setting_value TEXT,
        ordering_enabled BOOLEAN DEFAULT true,
        platform_enabled BOOLEAN DEFAULT true,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log('11. Creating `admin_accounts` table...');
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

    console.log('12. Seeding restaurants...');
    const allRestaurants = [...AUTHENTIC_RESTAURANTS, VILASA_RESTAURANT];
    for (const r of allRestaurants) {
      await sql`
        INSERT INTO restaurants (
          id, name, description, cuisine, location, phone, rating, prep_time, image_url, is_open, created_at, updated_at
        ) VALUES (
          ${r.id}, ${r.name}, ${r.description}, ${r.cuisine}, ${r.location}, ${r.phone}, ${r.rating || 4.8}, ${r.prep_time || '15-20 min'}, ${r.image_url}, ${r.is_open ?? true}, NOW(), NOW()
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

      await sql`
        INSERT INTO restaurant_statuses (restaurant_id, status, updated_at)
        VALUES (${r.id}, 'OPEN', NOW())
        ON CONFLICT (restaurant_id) DO NOTHING;
      `;
    }

    console.log('13. Seeding menu items...');
    const allMenuItems = [...AUTHENTIC_MENU_ITEMS, ...VILASA_MENU_ITEMS];
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
          ${item.description},
          ${item.price},
          ${item.is_veg},
          true,
          ${item.image_url},
          '15-20 mins',
          4.8,
          NOW(),
          NOW()
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          category = EXCLUDED.category,
          is_veg = EXCLUDED.is_veg,
          image_url = EXCLUDED.image_url,
          updated_at = NOW();
      `;
    }

    console.log('14. Seeding admin accounts...');
    await sql`
      INSERT INTO admin_accounts (id, username, name, role, restaurant_id, password_hash)
      VALUES 
        ('admin-super', 'collagebites1@gmail.com', 'Collage Bites (Super Admin)', 'super_admin', null, 'Clgbites123'),
        ('admin-super-alias', 'collagebites@gmail.com', 'Collage Bites Admin', 'super_admin', null, 'Clgbites123'),
        ('admin-super-raj', 'rajsrmap2@gmail.com', 'Raj (Super Admin)', 'super_admin', null, 'Clgbites123'),
        ('admin-lhk', 'lhk_admin', 'Local Home Kitchen Staff', 'restaurant_admin', 'local-home-kitchen', 'LHK@Campus2026'),
        ('admin-clg', 'clgbites_admin', 'Biryani Nation Staff', 'restaurant_admin', 'clg-bites-biryani-nation', 'CLG@Campus2026'),
        ('admin-vilasa', 'vilasa_admin', 'Vilasa Café Admin', 'restaurant_admin', 'vilasa-cafe', 'Vilasa@Campus2026')
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        restaurant_id = EXCLUDED.restaurant_id;
    `;

    console.log('15. Seeding delivery partners...');
    await sql`
      INSERT INTO delivery_partners (id, name, phone, restaurant_id, pin, is_active, is_available)
      VALUES 
        ('dp-lhk-1', 'Ramesh Kumar (LHK Rider)', '9989955833', 'local-home-kitchen', '1234', true, true),
        ('dp-lhk-2', 'Suresh Reddy (LHK Rider)', '9398414231', 'local-home-kitchen', '1234', true, true),
        ('dp-clg-1', 'Rajesh Sharma (Rider)', '8247840765', 'clg-bites-biryani-nation', '1234', true, true),
        ('dp-clg-2', 'Lenka Babu (Rider)', '8240756887', 'clg-bites-biryani-nation', '1234', true, true),
        ('dp-vilasa-1', 'Ravi Teja (Vilasa Rider)', '9848012345', 'vilasa-cafe', '1234', true, true)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        restaurant_id = EXCLUDED.restaurant_id,
        is_active = EXCLUDED.is_active;
    `;

    console.log('16. Seeding system settings...');
    await sql`
      INSERT INTO system_settings (id, setting_key, setting_value, ordering_enabled, platform_enabled, updated_at)
      VALUES 
        ('global', 'overall_ordering', 'true', true, true, NOW())
      ON CONFLICT (id) DO UPDATE SET
        ordering_enabled = true,
        platform_enabled = true,
        updated_at = NOW();
    `;

    // Performance Indexes
    console.log('17. Creating performance indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_student_email ON orders(student_email);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_menu_restaurant ON menu_items(restaurant_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category);`;

    console.log('\n====================================================');
    console.log('🎉 ALL TABLES, RESTAURANTS, MENUS & ACCOUNTS STORED IN `clg bites`!');
    console.log('====================================================');

    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`;
    console.log('\nTables in public schema:');
    console.table(tables);

    const rCount = await sql`SELECT count(*) FROM restaurants;`;
    const mCount = await sql`SELECT count(*) FROM menu_items;`;
    const aCount = await sql`SELECT count(*) FROM admin_accounts;`;
    const dCount = await sql`SELECT count(*) FROM delivery_partners;`;
    console.log(`Summary: ${rCount[0].count} restaurants, ${mCount[0].count} menu items, ${aCount[0].count} admin accounts, ${dCount[0].count} delivery partners.`);

  } catch (err) {
    console.error('❌ Database initialization error:', err);
    process.exit(1);
  }
}

initClgBites();
