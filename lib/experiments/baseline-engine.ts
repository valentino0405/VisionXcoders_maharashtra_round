import { runSimulation, type SimulationDependencies } from "../simulator/simulator-engine.ts";
import type { SimulationAction, SimulationActionResult, SimulationConfig, VirtualUser } from "../simulator/simulator-types.ts";

type BaselineUser = { participantId: string; queuePosition?: number; seatId?: string };

/** Conventional isolated FIFO allocation: idempotent and capacity-safe, without FairDrop abuse/token/session protections. */
export async function runBaselineSimulation(
  runId: string,
  dropId: string,
  config: SimulationConfig,
  control: { cancelled: boolean },
  onProgress?: Parameters<typeof runSimulation>[3]["onProgress"],
  runtime?: Pick<SimulationDependencies, "now" | "sleep">
) {
  const users = new Map<number, BaselineUser>();
  let queueDepth = 0;
  let allocated = 0;
  const capacity = 500;

  async function execute(user: VirtualUser, action: SimulationAction): Promise<SimulationActionResult> {
    const latencyMs = 1 + ((user.seed + action.length) % 8);
    const existing = users.get(user.index);
    if (action === "DROP_JOIN") {
      const state = existing ?? { participantId: `baseline-p-${user.index + 1}` };
      users.set(user.index, state);
      return { endpoint: "/api/drop/join", statusCode: existing ? 200 : 201, duplicate: Boolean(existing), participantId: state.participantId, latencyMs };
    }
    if (!existing) return { endpoint: action, statusCode: 409, latencyMs };
    if (action === "QUEUE_JOIN") {
      const duplicate = existing.queuePosition !== undefined;
      if (!duplicate) existing.queuePosition = ++queueDepth;
      return { endpoint: "/api/queue/join", statusCode: duplicate ? 200 : 201, duplicate, participantId: existing.participantId, queuePosition: existing.queuePosition, queueSize: queueDepth, latencyMs };
    }
    if (action === "ALLOCATION_CLAIM") {
      if (!existing.queuePosition) return { endpoint: "/api/allocation/claim", statusCode: 409, latencyMs };
      if (existing.seatId) return { endpoint: "/api/allocation/claim", statusCode: 200, duplicate: true, participantId: existing.participantId, seatId: existing.seatId, latencyMs };
      if (allocated >= capacity) return { endpoint: "/api/allocation/claim", statusCode: 409, participantId: existing.participantId, latencyMs };
      existing.seatId = `baseline-seat-${++allocated}`;
      return { endpoint: "/api/allocation/claim", statusCode: 201, participantId: existing.participantId, seatId: existing.seatId, latencyMs };
    }
    if (action === "TOKEN_REPLAY") return { endpoint: "/api/queue/status", statusCode: 404, latencyMs };
    return { endpoint: action === "SESSION_RECOVERY" ? "/api/session" : "/api/queue/status", statusCode: 200, latencyMs };
  }

  return runSimulation(runId, dropId, config, { executeAction: execute, isCancelled: () => control.cancelled, onProgress, ...runtime });
}
