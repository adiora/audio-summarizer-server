import 'dotenv/config';
import { pool } from '../config/db.js';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS uploads (
        id UUID PRIMARY KEY,
        original_filename TEXT NOT NULL,
        r2_key TEXT NOT NULL UNIQUE,
        content_type TEXT NOT NULL,
        file_size BIGINT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        uploaded_at TIMESTAMPTZ,
        summary TEXT
      );
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_uploads_r2_key ON uploads(r2_key);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);`);
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
    process.exit();
  }
}

migrate();
