import mongoose, { Document, Model, Schema } from "mongoose";

export interface IExperiment extends Document {
  experimentId: string; name: string; scenario: string; configuration: Record<string, unknown>; seed: number;
  baselineRunId: string; fairDropRunId: string; status: string; baselineMetrics: Record<string, unknown> | null;
  fairDropMetrics: Record<string, unknown> | null; comparison: Record<string, unknown> | null;
  startedAt: Date | null; completedAt: Date | null; error: string | null; createdAt: Date; updatedAt: Date;
}
const ExperimentSchema = new Schema<IExperiment>({
  experimentId: { type: String, required: true, unique: true }, name: { type: String, required: true, trim: true, maxlength: 100 },
  scenario: { type: String, required: true }, configuration: { type: Schema.Types.Mixed, required: true }, seed: { type: Number, required: true },
  baselineRunId: { type: String, required: true }, fairDropRunId: { type: String, required: true },
  status: { type: String, required: true, enum: ["CREATED", "RUNNING_BASELINE", "RUNNING_FAIRDROP", "COMPARING", "COMPLETED", "FAILED", "CANCELLED"] },
  baselineMetrics: { type: Schema.Types.Mixed, default: null }, fairDropMetrics: { type: Schema.Types.Mixed, default: null }, comparison: { type: Schema.Types.Mixed, default: null },
  startedAt: { type: Date, default: null }, completedAt: { type: Date, default: null }, error: { type: String, default: null },
}, { timestamps: true, collection: "experiments" });
ExperimentSchema.index({ createdAt: -1 });
const Experiment: Model<IExperiment> = mongoose.models.Experiment || mongoose.model<IExperiment>("Experiment", ExperimentSchema);
export default Experiment;
