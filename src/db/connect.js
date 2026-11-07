import { MongoClient } from 'mongodb';

let client;
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

  const newClient = new MongoClient(connectionString);

  try {
    await newClient.connect();
    const newDatabase = newClient.db(databaseName);
    await newDatabase.collection('authors').createIndex({ id: 1 }, { unique: true });
    await newDatabase.collection('books').createIndex({ authorId: 1 });
    await newDatabase.collection('books').createIndex({ id: 1 }, { unique: true });
    client = newClient;
    database = newDatabase;
    return database;
  } catch (error) {
    await newClient.close();
    throw error;
  }
};

const getDb = () => {
  if (!database) {
    throw new Error('Database not initialized. Call connectToDb first.');
  }
  return database;
};

const getClient = () => {
  if (!client) {
    throw new Error('Database not initialized. Call connectToDb first.');
  }
  return client;
};

const closeDb = async () => {
  if (client) {
    await client.close();
    client = undefined;
    database = undefined;
  }
};

export { closeDb, connectToDb, getClient, getDb };
