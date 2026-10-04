import { MAX_CONCURRENCY, MAX_REQUEST_RATE, MAX_VIRTUAL_USERS, type SimulationConfig, type SimulationScenario, type VirtualUserProfile } from "./simulator/simulator-types.ts";

export type LiveScenarioId = "last_seat" | "sold_out" | "bot_swarm" | "mixed_attack" | "normal_rush" | "custom";
export type LiveScenarioInput = { preset: LiveScenarioId; capacity?: number; preloadedAllocated?: number; normalUsers?: number; botUsers?: number; duplicateUsers?: number; tokenReplayUsers?: number; requestFloodUsers?: number; queueManipulationUsers?: number; requestRate?: number; maxConcurrency?: number };
export type ResolvedLiveScenario = { preset: LiveScenarioId; title: string; description: string; capacity: number; preloadedAllocated: number; virtualUsers: number; config: SimulationConfig; configuredGroups: Record<string, number> };

const PRESETS: Record<Exclude<LiveScenarioId, "custom">, Omit<LiveScenarioInput, "preset"> & { title: string; description: string }> = {
  last_seat: { title: "You get the last seat", description: "499 seats are already allocated. Your real queue entry is the next eligible participant.", capacity: 500, preloadedAllocated: 499, normalUsers: 2_000, botUsers: 0, requestRate: 500, maxConcurrency: 200 },
  sold_out: { title: "You are #501", description: "All 500 seats are allocated before you arrive. The allocation engine must refuse another seat.", capacity: 500, preloadedAllocated: 500, normalUsers: 1_000, botUsers: 0, requestRate: 400, maxConcurrency: 200 },
  bot_swarm: { title: "Bot swarm", description: "Legitimate and automated traffic compete while FairDrop records throttles, blocks and security events.", capacity: 500, preloadedAllocated: 0, normalUsers: 500, botUsers: 3_000, duplicateUsers: 500, tokenReplayUsers: 250, requestFloodUsers: 250, requestRate: 1_000, maxConcurrency: 350 },
  mixed_attack: { title: "Mixed attack", description: "Normal traffic runs alongside request floods, duplicate attempts, token replay and queue manipulation.", capacity: 500, preloadedAllocated: 0, normalUsers: 1_000, requestFloodUsers: 1_000, duplicateUsers: 1_000, tokenReplayUsers: 500, queueManipulationUsers: 500, requestRate: 1_000, maxConcurrency: 350 },
  normal_rush: { title: "Normal rush", description: "High legitimate demand arrives at nearly the same time without attack profiles.", capacity: 500, preloadedAllocated: 0, normalUsers: 5_000, requestRate: 1_000, maxConcurrency: 350 },
};

const boundedInteger = (value: unknown, fallback: number) => typeof value === "number" && Number.isSafeInteger(value) ? value : fallback;
export function resolveLiveScenario(input: unknown): ResolvedLiveScenario | null {
  if (!input || typeof input !== "object") return null;
  const request = input as LiveScenarioInput;
  if (!(request.preset in PRESETS) && request.preset !== "custom") return null;
  const base = request.preset === "custom" ? { title: "Custom scenario", description: "A bounded, isolated FairDrop workload configured for this demonstration.", capacity: 500, preloadedAllocated: 0, normalUsers: 500, requestRate: 250, maxConcurrency: 100 } : PRESETS[request.preset];
  const capacity = boundedInteger(request.capacity, base.capacity ?? 500);
  const preloadedAllocated = boundedInteger(request.preloadedAllocated, base.preloadedAllocated ?? 0);
  const groups: Record<VirtualUserProfile, number> = {
    NORMAL_TRAFFIC: boundedInteger(request.normalUsers, base.normalUsers ?? 0),
    BOT_SWARM: boundedInteger(request.botUsers, base.botUsers ?? 0),
    DUPLICATE_ATTEMPTS: boundedInteger(request.duplicateUsers, base.duplicateUsers ?? 0),
    TOKEN_REPLAY: boundedInteger(request.tokenReplayUsers, base.tokenReplayUsers ?? 0),
    REQUEST_FLOOD: boundedInteger(request.requestFloodUsers, base.requestFloodUsers ?? 0),
    QUEUE_MANIPULATION: boundedInteger(request.queueManipulationUsers, base.queueManipulationUsers ?? 0),
  };
  const virtualUsers = Object.values(groups).reduce((sum, value) => sum + value, 0);
  const requestRate = boundedInteger(request.requestRate, base.requestRate ?? 250);
  const maxConcurrency = boundedInteger(request.maxConcurrency, base.maxConcurrency ?? 100);
  if (capacity < 1 || preloadedAllocated < 0 || preloadedAllocated > capacity || virtualUsers < 1 || virtualUsers > MAX_VIRTUAL_USERS || requestRate < 1 || requestRate > MAX_REQUEST_RATE || maxConcurrency < 1 || maxConcurrency > MAX_CONCURRENCY || maxConcurrency > virtualUsers) return null;
  const scenario: SimulationScenario = Object.entries(groups).filter(([, count]) => count > 0).length === 1 && groups.NORMAL_TRAFFIC > 0 ? "NORMAL_TRAFFIC" : groups.BOT_SWARM === virtualUsers ? "BOT_SWARM" : "MIXED_ATTACK";
  const profiles = Object.keys(groups) as VirtualUserProfile[];
  let remainingPercent = 100;
  const attackDistribution = {} as Partial<Record<VirtualUserProfile, number>>;
  profiles.forEach((profile, index) => { const value = index === profiles.length - 1 ? remainingPercent : (groups[profile] / virtualUsers) * 100; attackDistribution[profile] = value; remainingPercent -= value; });
  return { preset: request.preset, title: base.title, description: base.description, capacity, preloadedAllocated, virtualUsers, configuredGroups: groups, config: { virtualUsers, durationSeconds: 300, maxConcurrency, requestRate, scenario, seed: 42000 + capacity + preloadedAllocated, jitterMs: scenario === "NORMAL_TRAFFIC" ? 5 : 15, warmupSeconds: preloadedAllocated ? 30 : 0, attackDistribution } };
}
