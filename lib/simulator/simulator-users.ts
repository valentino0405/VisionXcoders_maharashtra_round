import type { ResolvedSimulationConfig, VirtualUser, VirtualUserProfile } from "./simulator-types.ts";

function randomFromSeed(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function profileForUser(index: number, config: ResolvedSimulationConfig): VirtualUserProfile {
  if (config.scenario !== "MIXED_ATTACK") return config.scenario;
  const random = randomFromSeed(config.seed + index * 2654435761);
  const point = random() * 100;
  let cumulative = 0;
  for (const [profile, percentage] of Object.entries(config.attackDistribution) as [VirtualUserProfile, number][]) {
    cumulative += percentage;
    if (point < cumulative) return profile;
  }
  return "NORMAL_TRAFFIC";
}

export function createVirtualUser(index: number, runId: string, config: ResolvedSimulationConfig): VirtualUser {
  const displayId = String(index + 1).padStart(6, "0");
  return {
    index,
    virtualUserId: `sim-user-${displayId}`,
    clerkId: `sim_${runId}_${displayId}`,
    profile: profileForUser(index, config),
    seed: (config.seed + index * 1103515245) >>> 0,
  };
}
