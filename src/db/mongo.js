import mongoose from "mongoose";
import "dotenv/config";

// Cached so concurrent callers (every service imports this on startup)
// share one in-flight connection attempt instead of racing mongoose.connect().
let connectingPromise = null;

export function connectMongo() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose.connection);
  }

  if (!connectingPromise) {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      return Promise.reject(new Error("MONGO_URI is not set"));
    }

    connectingPromise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 5000 })
      .then((conn) => {
        console.log("MongoDB connected successfully");
        return conn;
      })
      .catch((error) => {
        connectingPromise = null; // allow the next call to retry
        throw error;
      });
  }

  return connectingPromise;
}

export async function disconnectMongo() {
  connectingPromise = null;
  await mongoose.disconnect();
}
