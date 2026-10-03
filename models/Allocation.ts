import mongoose, { Document, Model, Schema } from "mongoose";

export type AllocationStatus = "ALLOCATED";

export interface IAllocation extends Document {
  allocationId: string;
  dropId: string;
  participantId: string;
  clerkId: string;
  queueEntryId: string;
  queueSequence: number;
  seatId: string;
  status: AllocationStatus;
  allocatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AllocationSchema = new Schema<IAllocation>(
  {
    allocationId: { type: String, required: true, unique: true },
    dropId: { type: String, required: true },
    participantId: { type: String, required: true },
    clerkId: { type: String, required: true },
    queueEntryId: { type: String, required: true },
    queueSequence: { type: Number, required: true, min: 1 },
    seatId: { type: String, required: true },
    status: { type: String, required: true, enum: ["ALLOCATED"] },
    allocatedAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "allocations" }
);

AllocationSchema.index({ dropId: 1, participantId: 1 }, { unique: true });
AllocationSchema.index({ dropId: 1, seatId: 1 }, { unique: true });
AllocationSchema.index({ dropId: 1, queueEntryId: 1 }, { unique: true });

const Allocation: Model<IAllocation> =
  mongoose.models.Allocation || mongoose.model<IAllocation>("Allocation", AllocationSchema);

export default Allocation;
