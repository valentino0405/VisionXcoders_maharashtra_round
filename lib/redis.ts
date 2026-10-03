import "server-only";

import { Redis } from "@upstash/redis";

export function getRedisClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url) {
    throw new Error("UPSTASH_REDIS_REST_URL environment variable is not configured");
  }

  if (!token) {
    throw new Error("UPSTASH_REDIS_REST_TOKEN environment variable is not configured");
  }

  return new Redis({ url, token });
}
