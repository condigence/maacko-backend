import mongoose from 'mongoose';

let connection = null;

export async function connectMongo() {
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
