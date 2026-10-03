import "server-only";

import { createClient } from "@redis/client";

function buildRedisClient(redisUrl: string) {
  return createClient({ url: redisUrl });
}

type RedisClient = ReturnType<typeof buildRedisClient>;

const globalForRedis = globalThis as typeof globalThis & {
  redisClient?: RedisClient;
  redisConnectionPromise?: Promise<RedisClient>;
};

function createRedisClient(): RedisClient {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is not configured");
  }

  const client = buildRedisClient(redisUrl);

  client.on("error", () => {
    console.error("Redis client error");
  });

  return client;
}

export async function getRedisClient(): Promise<RedisClient> {
  const client = globalForRedis.redisClient ?? createRedisClient();
  globalForRedis.redisClient = client;

  if (client.isOpen) {
    return client;
  }

  if (!globalForRedis.redisConnectionPromise) {
    globalForRedis.redisConnectionPromise = client.connect().then(() => client);
  }

  try {
    return await globalForRedis.redisConnectionPromise;
  } catch (error) {
    if (globalForRedis.redisClient === client) {
      globalForRedis.redisClient = undefined;
    }

    throw error;
  } finally {
    globalForRedis.redisConnectionPromise = undefined;
  }
}
