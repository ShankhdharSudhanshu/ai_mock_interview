import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

/** Cached connection — reused across hot-reloads in dev and across requests in prod */
let cached = global._mongooseCache;
if (!cached) cached = global._mongooseCache = { conn: null, promise: null };

export async function connectDB() {
  if (!MONGODB_URI) {
    // Gracefully degrade — MongoDB is optional; Supabase is the primary store
    return null;
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands:    false,
        maxPoolSize:       10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS:   45000,
      })
      .then(m => m.connection);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

/** Lightweight check — returns true if MongoDB is configured */
export const hasMongoConfig = () => Boolean(process.env.MONGODB_URI);
