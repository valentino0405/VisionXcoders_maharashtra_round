import mongoose, { Document, Model, Schema } from "mongoose";

export type PaymentStatus = "CREATED" | "VERIFIED";

export interface IPayment extends Document {
  paymentId: string; razorpayOrderId: string; razorpayPaymentId: string | null; allocationId: string; clerkId: string;
  amount: number; currency: string; status: PaymentStatus; verifiedAt: Date | null; createdAt: Date; updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  paymentId: { type: String, required: true, unique: true },
  razorpayOrderId: { type: String, required: true, unique: true },
  razorpayPaymentId: { type: String, default: null, unique: true, sparse: true },
  allocationId: { type: String, required: true, unique: true }, clerkId: { type: String, required: true },
  amount: { type: Number, required: true, min: 1 }, currency: { type: String, required: true },
  status: { type: String, required: true, enum: ["CREATED", "VERIFIED"] }, verifiedAt: { type: Date, default: null },
}, { timestamps: true, collection: "payments" });
PaymentSchema.index({ clerkId: 1, createdAt: -1 });
const Payment: Model<IPayment> = mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
export default Payment;
