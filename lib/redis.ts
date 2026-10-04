import "server-only";

import { Redis } from "@upstash/redis";

let cachedRedis: Redis | null = null;

export function getRedisClient(): Redis {
  if (cachedRedis) {
    return cachedRedis;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url) {
    throw new Error("UPSTASH_REDIS_REST_URL environment variable is not configured");
  }

  if (!token) {
    throw new Error("UPSTASH_REDIS_REST_TOKEN environment variable is not configured");
  }

  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}
