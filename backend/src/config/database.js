import pgPromise from 'pg-promise';
import dotenv from 'dotenv';

dotenv.config();

const pgp = pgPromise();

const db = pgp({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

export async function initializeDatabase() {
  try {
    const result = await db.one('SELECT NOW()');
    console.log('Database connection successful:', result);
    return db;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

export { db, pgp };
