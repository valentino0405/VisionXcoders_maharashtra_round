import { loadEnvFile } from "node:process";

import { MongoClient } from "mongodb";

loadEnvFile(".env.local");

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("MONGODB_URI environment variable is not configured");
}

const client = new MongoClient(mongoUri);

try {
  await client.connect();

  const database = client.db(process.env.MONGODB_DB || "bitnbuild");
  const drops = database.collection("drops");
  const now = new Date();

  await drops.createIndex({ dropId: 1 }, { unique: true });

  const result = await drops.updateOne(
    { dropId: "fairdrop-demo" },
    {
      $setOnInsert: {
        dropId: "fairdrop-demo",
        name: "FairDrop Demo Drop",
        capacity: 500,
        status: "ACTIVE",
        startsAt: now,
        endsAt: null,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  console.log(result.upsertedCount === 1 ? "Demo drop created" : "Demo drop already exists");
} finally {
  await client.close();
}
