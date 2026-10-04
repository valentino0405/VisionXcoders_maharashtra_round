import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITicket extends Document {
  ticketId: string; ticketCode: string; allocationId: string; paymentId: string; clerkId: string; dropId: string; seatId: string; issuedAt: Date; createdAt: Date; updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>({
  ticketId: { type: String, required: true, unique: true }, ticketCode: { type: String, required: true, unique: true },
  allocationId: { type: String, required: true, unique: true }, paymentId: { type: String, required: true, unique: true },
  clerkId: { type: String, required: true }, dropId: { type: String, required: true }, seatId: { type: String, required: true }, issuedAt: { type: Date, required: true },
}, { timestamps: true, collection: "tickets" });
TicketSchema.index({ clerkId: 1, issuedAt: -1 });
const Ticket: Model<ITicket> = mongoose.models.Ticket || mongoose.model<ITicket>("Ticket", TicketSchema);
export default Ticket;
