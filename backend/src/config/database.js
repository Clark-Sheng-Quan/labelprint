import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://mongodb:27017';
const databaseName = process.env.MONGODB_DATABASE || 'label_printer';
const client = new MongoClient(mongoUri);
let db;

export async function initializeDatabase() {
  try {
    await client.connect();
    db = client.db(databaseName);
    await db.command({ ping: 1 });
    console.log(`MongoDB connection successful: ${databaseName}`);
    return db;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('MongoDB has not been initialized');
  }
  return db;
}

export { client };
