"use server";
import { error } from "console";
import mongoose, { Connection } from "mongoose";

interface CachedConnection {
  conn: Connection | null;
  promise: Promise<typeof mongoose> | null;
}

const MONGODB_URI: string = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

const globalAny: any = global;

let cached: CachedConnection = globalAny.mongoose || {
  conn: null,
  promise: null,
};

async function dbConnect(): Promise<Connection> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log("DB Connected");
      return mongoose;
    });
  }

  try {
    const mongooseInstance = await cached.promise;
    cached.conn = mongooseInstance.connection;

    // Save the connection to global
    globalAny.mongoose = cached;
    return cached.conn;
  } catch (e) {
    cached.promise = null;

    console.error("Error connecting to MongodB " + e);

    throw e;
  }
}

export default dbConnect;
