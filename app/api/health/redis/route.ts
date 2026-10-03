import { getRedisClient } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const redis = await getRedisClient();
    const response = await redis.ping();

    if (response !== "PONG") {
      throw new Error("Unexpected Redis PING response");
    }

    return Response.json({ redis: "ok" });
  } catch {
    console.error("Redis health check failed");
    return Response.json({ redis: "error" }, { status: 500 });
  }
}
