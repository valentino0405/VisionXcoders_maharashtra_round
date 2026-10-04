import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const LIVE_DEMO_AMOUNT = 49_900; // ₹499.00, always calculated server-side.
export const LIVE_DEMO_CURRENCY = "INR";

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("PAYMENT_NOT_CONFIGURED");
  return { keyId, keySecret };
}

export async function createRazorpayOrder(receipt: string) {
  const { keyId, keySecret } = getRazorpayConfig();
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST", cache: "no-store",
    headers: { "Authorization": `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: LIVE_DEMO_AMOUNT, currency: LIVE_DEMO_CURRENCY, receipt, payment_capture: 1 }),
  });
  if (!response.ok) throw new Error("PAYMENT_PROVIDER_UNAVAILABLE");
  const order = await response.json() as { id?: string; amount?: number; currency?: string };
  if (!order.id || order.amount !== LIVE_DEMO_AMOUNT || order.currency !== LIVE_DEMO_CURRENCY) throw new Error("PAYMENT_PROVIDER_INVALID_RESPONSE");
  return order as { id: string; amount: number; currency: string };
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string) {
  const { keySecret } = getRazorpayConfig();
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const received = Buffer.from(signature, "hex");
  const target = Buffer.from(expected, "hex");
  return received.length === target.length && timingSafeEqual(received, target);
}
