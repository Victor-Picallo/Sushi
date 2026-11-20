import '../config/env.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;

export const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    })
  : null;

export const db = pool ? drizzle(pool, { schema }) : null;
