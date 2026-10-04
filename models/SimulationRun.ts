import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISimulationRun extends Document {
  simulationRunId: string; dropId: string; scenario: string; status: string;
  ownerClerkId?: string | null;
  configuration: Record<string, unknown>; metrics: Record<string, unknown>; startedAt: Date | null; completedAt: Date | null; errorSummary: string | null;
  createdAt: Date; updatedAt: Date;
}
const SimulationRunSchema = new Schema<ISimulationRun>({
  simulationRunId: { type: String, required: true, unique: true }, dropId: { type: String, required: true }, scenario: { type: String, required: true },
  status: { type: String, required: true, enum: ["CREATED", "STARTING", "RUNNING", "STOPPING", "COMPLETED", "FAILED", "CANCELLED"] },
  configuration: { type: Schema.Types.Mixed, required: true }, metrics: { type: Schema.Types.Mixed, required: true },
  ownerClerkId: { type: String, default: null, index: true },
  startedAt: { type: Date, default: null }, completedAt: { type: Date, default: null }, errorSummary: { type: String, default: null },
}, { timestamps: true, collection: "simulationRuns" });
SimulationRunSchema.index({ createdAt: -1 });
const SimulationRun: Model<ISimulationRun> = mongoose.models.SimulationRun || mongoose.model<ISimulationRun>("SimulationRun", SimulationRunSchema);
export default SimulationRun;
