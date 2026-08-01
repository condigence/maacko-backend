import dns from "node:dns";
import mongoose from "mongoose";
import "dotenv/config";

// Cached so concurrent callers (every service imports this on startup)
// share one in-flight connection attempt instead of racing mongoose.connect().
let connectingPromise = null;

// Some local/router/ISP DNS resolvers refuse SRV record queries (used by
// mongodb+srv:// URIs to discover the replica set members) even though they
// resolve plain A/AAAA records fine - this shows up as
// "querySrv ECONNREFUSED _mongodb._tcp.<cluster>". Public resolvers handle
// SRV lookups correctly, so retry once against them before giving up.
const FALLBACK_DNS_SERVERS = ["8.8.8.8", "1.1.1.1"];

function isSrvDnsRefusal(error) {
  return error?.code === "ECONNREFUSED" && /querySrv/i.test(error?.message || "");
}

async function connectWithDnsFallback(uri, options) {
  try {
    return await mongoose.connect(uri, options);
  } catch (error) {
    if (!isSrvDnsRefusal(error)) {
      throw error;
    }

    console.warn(
      "MongoDB SRV DNS lookup was refused by the system resolver; retrying via public DNS (8.8.8.8, 1.1.1.1)"
    );
    dns.setServers(FALLBACK_DNS_SERVERS);
    return mongoose.connect(uri, options);
  }
}

export function connectMongo() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose.connection);
  }

  if (!connectingPromise) {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      return Promise.reject(new Error("MONGO_URI is not set"));
    }

    connectingPromise = connectWithDnsFallback(uri, { serverSelectionTimeoutMS: 5000 })
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
