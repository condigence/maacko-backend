import mongoose from 'mongoose';
import "dotenv/config";

let connection = null;
const isMockMode = process.env.USE_MOCK === "true";

export async function connectMongo() {

  // SAD PATH: Environment flag explicitly tells us to use mock
  if (isMockMode) {
    console.log("⚡using mock data,Bypassing MongoDB connection.");
    return false;
  }

  if (connection && mongoose.connection.readyState === 1) {
    return connection;
  }

  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/maako';

  connection = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log('MongoDB connected successfully');
  return connection;
}

export async function disconnectMongo() {
  if (connection) {
    await mongoose.disconnect();
    connection = null;
  }
}
