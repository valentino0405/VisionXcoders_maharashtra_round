import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

interface MongooseGlobal {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseGlobal | undefined;
}

const cached: MongooseGlobal = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

function getMongoPoolSize(): number {
  const configured = process.env.FAIRDROP_MONGODB_MAX_POOL_SIZE;
  if (configured === undefined || configured === "") return 500;
  const parsed = Number(configured);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 500) {
    throw new Error("FAIRDROP_MONGODB_MAX_POOL_SIZE must be an integer between 1 and 500");
  }
  return parsed;
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: process.env.MONGODB_DB || "bitnbuild",
      // The simulator is explicitly bounded at 500 concurrent workers. MongoDB's
      // default pool of 100 serializes the other 400 requests before they can
      // reach the real queue/allocation services. This is a maximum, not an
      // eagerly opened connection count, and can be lowered per environment.
      maxPoolSize: getMongoPoolSize(),
      maxConnecting: 32,
    };

    cached.promise = mongoose.connect(MONGODB_URI as string, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
