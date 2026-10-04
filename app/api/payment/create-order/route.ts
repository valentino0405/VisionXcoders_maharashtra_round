import { auth } from "@clerk/nextjs/server";
import { createPaymentOrder } from "@/lib/payment-service";
import { getRazorpayConfig } from "@/lib/razorpay";
export const dynamic = "force-dynamic"; export const runtime = "nodejs";
export async function POST(request: Request) {
  const { userId } = await auth(); if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { allocationId } = await request.json(); if (typeof allocationId !== "string" || allocationId.length > 160) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    const result = await createPaymentOrder(userId, allocationId);
    if (result.alreadyVerified) return Response.json({ verified: true });
    const { keyId } = getRazorpayConfig();
    return Response.json({ verified: false, keyId, orderId: result.payment.razorpayOrderId, amount: result.payment.amount, currency: result.payment.currency, name: "FairDrop Live Demo" });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PAYMENT_UNAVAILABLE";
    return Response.json({ error: code }, { status: code === "ALLOCATION_NOT_FOUND" ? 404 : 503 });
  }
}
