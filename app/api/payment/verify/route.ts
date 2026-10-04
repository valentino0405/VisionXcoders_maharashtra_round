import { auth } from "@clerk/nextjs/server";
import { verifyPayment } from "@/lib/payment-service";
export const dynamic = "force-dynamic"; export const runtime = "nodejs";
export async function POST(request: Request) {
  const { userId } = await auth(); if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const body = await request.json();
    if (![body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature].every((value) => typeof value === "string" && value.length <= 256)) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    const result = await verifyPayment(userId, body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature);
    return Response.json({ verified: true, ticket: result.ticket, alreadyVerified: result.alreadyVerified });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PAYMENT_VERIFICATION_FAILED";
    return Response.json({ error: code }, { status: code === "INVALID_PAYMENT_SIGNATURE" ? 400 : 503 });
  }
}
