import { MongoClient } from 'mongodb';

let database;

const connectToDb = async () => {
  const connectionString = process.env.MONGODB_URI;
  if (!connectionString) {
    throw new Error('MONGODB_URI is required.');
  }

  const databaseName = process.env.MONGODB_DB_NAME;
  if (!databaseName) {
    throw new Error('MONGODB_DB_NAME is required.');
  }

  const client = new MongoClient(connectionString);
  await client.connect();
  database = client.db(databaseName);
  return database;
};

const getDb = () => {
  if (!database) {
    throw new Error('Database not initialized. Call connectToDb first.');
  }
  return database;
};

export { connectToDb, getDb };
