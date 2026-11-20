import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://oe:oe_local_dev@localhost:5432/opportunity_engine';

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});
