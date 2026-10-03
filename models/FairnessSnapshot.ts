import mongoose, { Document, Model, Schema } from "mongoose";

export interface IFairnessSnapshot extends Document {
  experimentId: string;
  dropId: string;
  startedAt: Date;
  endedAt: Date;
  snapshot: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const FairnessSnapshotSchema = new Schema<IFairnessSnapshot>(
  {
    experimentId: { type: String, required: true, unique: true },
    dropId: { type: String, required: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    // Aggregate-only metric result. Raw subjects and request-event histories are never stored here.
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, collection: "fairnessSnapshots" }
);

FairnessSnapshotSchema.index({ dropId: 1, startedAt: -1 });

const FairnessSnapshot: Model<IFairnessSnapshot> =
  mongoose.models.FairnessSnapshot ||
  mongoose.model<IFairnessSnapshot>("FairnessSnapshot", FairnessSnapshotSchema);

export default FairnessSnapshot;
