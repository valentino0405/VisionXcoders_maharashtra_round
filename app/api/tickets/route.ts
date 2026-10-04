import { auth } from "@clerk/nextjs/server";
import { getTicketsForUser } from "@/lib/payment-service";
export const dynamic = "force-dynamic"; export const runtime = "nodejs";
export async function GET() { const { userId } = await auth(); if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 }); return Response.json({ tickets: await getTicketsForUser(userId) }); }
