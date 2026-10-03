import { loadEnvFile } from "node:process";
import { MongoClient } from "mongodb";
import { Redis } from "@upstash/redis";

loadEnvFile(".env.local");

const mongoUri = process.env.MONGODB_URI;
const client = new MongoClient(mongoUri);

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "bitnbuild");
  const collections = await db.listCollections().toArray();
  console.log("MongoDB Collections:", collections.map((c) => c.name));

  for (const coll of collections) {
    const indexes = await db.collection(coll.name).indexes();
    const count = await db.collection(coll.name).countDocuments();
    console.log(`\nCollection [${coll.name}] - Count: ${count}`);
    console.log("Indexes:", JSON.stringify(indexes, null, 2));
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const ping = await redis.ping();
  console.log("\nRedis PING response:", ping);
} finally {
  await client.close();
}
