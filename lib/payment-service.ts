import "server-only";

import { randomUUID } from "node:crypto";
import connectToDatabase from "@/lib/mongodb";
import Allocation from "@/models/Allocation";
import Payment from "@/models/Payment";
import Ticket from "@/models/Ticket";
import { createRazorpayOrder, LIVE_DEMO_AMOUNT, LIVE_DEMO_CURRENCY, verifyRazorpaySignature } from "@/lib/razorpay";

export async function createPaymentOrder(clerkId: string, allocationId: string) {
  await connectToDatabase();
  const allocation = await Allocation.findOne({ allocationId, clerkId }).lean();
  if (!allocation) throw new Error("ALLOCATION_NOT_FOUND");
  const existing = await Payment.findOne({ allocationId, clerkId }).lean();
  if (existing?.status === "VERIFIED") return { payment: existing, alreadyVerified: true };
  if (existing) return { payment: existing, alreadyVerified: false };
  const order = await createRazorpayOrder(`fd_${allocation.allocationId.slice(-24)}`);
  const payment = await Payment.create({ paymentId: `pay_${randomUUID().replaceAll("-", "")}`, razorpayOrderId: order.id, razorpayPaymentId: null, allocationId, clerkId, amount: LIVE_DEMO_AMOUNT, currency: LIVE_DEMO_CURRENCY, status: "CREATED", verifiedAt: null });
  return { payment: payment.toObject(), alreadyVerified: false };
}

export async function verifyPayment(clerkId: string, orderId: string, razorpayPaymentId: string, signature: string) {
  await connectToDatabase();
  const payment = await Payment.findOne({ razorpayOrderId: orderId, clerkId });
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  if (payment.status === "VERIFIED") {
    const ticket = await Ticket.findOne({ paymentId: payment.paymentId }).lean();
    return { ticket, alreadyVerified: true };
  }
  if (!verifyRazorpaySignature(orderId, razorpayPaymentId, signature)) throw new Error("INVALID_PAYMENT_SIGNATURE");
  const allocation = await Allocation.findOne({ allocationId: payment.allocationId, clerkId }).lean();
  if (!allocation) throw new Error("ALLOCATION_NOT_FOUND");
  payment.status = "VERIFIED"; payment.razorpayPaymentId = razorpayPaymentId; payment.verifiedAt = new Date();
  await payment.save();
  const ticket = await Ticket.findOneAndUpdate(
    { allocationId: allocation.allocationId },
    { $setOnInsert: { ticketId: `tkt_${randomUUID().replaceAll("-", "")}`, ticketCode: `FD-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`, allocationId: allocation.allocationId, paymentId: payment.paymentId, clerkId, dropId: allocation.dropId, seatId: allocation.seatId, issuedAt: new Date() } },
    { upsert: true, returnDocument: "after" }
  ).lean();
  return { ticket, alreadyVerified: false };
}

export async function getTicketsForUser(clerkId: string) {
  await connectToDatabase();
  return Ticket.find({ clerkId }).sort({ issuedAt: -1 }).lean();
}
