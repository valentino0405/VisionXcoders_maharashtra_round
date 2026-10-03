import mongoose, { Document, Model, Schema } from "mongoose";

export type QueueEntryStatus = "WAITING" | "ACTIVE";

export interface IQueueEntry extends Document {
  queueEntryId: string;
  dropId: string;
  participantId: string;
  clerkId: string;
  sequence: number;
  status: QueueEntryStatus;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QueueEntrySchema = new Schema<IQueueEntry>(
  {
    queueEntryId: { type: String, required: true, unique: true },
    dropId: { type: String, required: true },
    participantId: { type: String, required: true },
    clerkId: { type: String, required: true },
    sequence: { type: Number, required: true, min: 1 },
    status: { type: String, required: true, enum: ["WAITING", "ACTIVE"] },
    joinedAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    collection: "queueEntries",
  }
);

QueueEntrySchema.index({ dropId: 1, participantId: 1 }, { unique: true });
QueueEntrySchema.index({ dropId: 1, sequence: 1 }, { unique: true });

const QueueEntry: Model<IQueueEntry> =
  mongoose.models.QueueEntry ||
  mongoose.model<IQueueEntry>("QueueEntry", QueueEntrySchema);

export default QueueEntry;
