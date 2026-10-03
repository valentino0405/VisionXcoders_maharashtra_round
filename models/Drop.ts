import mongoose, { Document, Model, Schema } from "mongoose";

export type DropStatus = "ACTIVE" | "INACTIVE";

export interface IDrop extends Document {
  dropId: string;
  name: string;
  capacity: number;
  status: DropStatus;
  startsAt: Date;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DropSchema = new Schema<IDrop>(
  {
    dropId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    status: { type: String, required: true, enum: ["ACTIVE", "INACTIVE"] },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "drops",
  }
);

const Drop: Model<IDrop> =
  mongoose.models.Drop || mongoose.model<IDrop>("Drop", DropSchema);

export default Drop;
