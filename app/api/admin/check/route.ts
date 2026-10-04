import { auth } from "@clerk/nextjs/server";
import { isFairDropAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ isAdmin: false }, { status: 401 });
  }

  return Response.json({ isAdmin: isFairDropAdmin(userId) });
}
