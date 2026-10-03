import mongoose, { Document, Model, Schema } from "mongoose";

export type ParticipationStatus = "JOINED";

export interface IParticipation extends Document {
  participantId: string;
  dropId: string;
  clerkId: string;
  joinedAt: Date;
  status: ParticipationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipationSchema = new Schema<IParticipation>(
  {
    participantId: { type: String, required: true },
    dropId: { type: String, required: true },
    clerkId: { type: String, required: true },
    joinedAt: { type: Date, required: true },
    status: { type: String, required: true, enum: ["JOINED"] },
  },
  {
    timestamps: true,
    collection: "participations",
  }
);

ParticipationSchema.index({ dropId: 1, clerkId: 1 }, { unique: true });

const Participation: Model<IParticipation> =
  mongoose.models.Participation ||
  mongoose.model<IParticipation>("Participation", ParticipationSchema);

export default Participation;
