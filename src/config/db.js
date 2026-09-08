import pg from 'pg';
import config from './index.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20
});

export const query = (text, params) => pool.query(text, params);
