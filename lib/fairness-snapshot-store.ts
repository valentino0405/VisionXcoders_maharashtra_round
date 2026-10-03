import "server-only";

import connectToDatabase from "@/lib/mongodb";
import type { FairnessSnapshot as FairnessSnapshotData } from "@/lib/fairness-engine";
import FairnessSnapshot from "@/models/FairnessSnapshot";

/** Persist only a computed aggregate snapshot. This is intentionally not an API route. */
export async function saveFairnessSnapshot(snapshot: FairnessSnapshotData): Promise<void> {
  await connectToDatabase();
  await FairnessSnapshot.findOneAndUpdate(
    { experimentId: snapshot.experimentId },
    {
      experimentId: snapshot.experimentId,
      dropId: snapshot.dropId,
      startedAt: new Date(snapshot.startedAt),
      endedAt: new Date(snapshot.endedAt),
      snapshot,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec();
}
