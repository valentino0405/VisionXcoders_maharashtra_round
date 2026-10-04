import "server-only";

import type { SimulationConfig } from "@/lib/simulator/simulator-types";

export const LIVE_DEMO_PRESETS = {
  last_seat_499: { label: "Last-seat proof · 499 users", virtualUsers: 499, durationSeconds: 90, maxConcurrency: 100, requestRate: 250, scenario: "NORMAL_TRAFFIC", seed: 12030, jitterMs: 0 },
  sold_out_500: { label: "Sold-out proof · 500 users", virtualUsers: 500, durationSeconds: 90, maxConcurrency: 100, requestRate: 250, scenario: "NORMAL_TRAFFIC", seed: 12029, jitterMs: 0 },
  quick_1k: { label: "Quick demo · 1,000 virtual users", virtualUsers: 1_000, durationSeconds: 120, maxConcurrency: 150, requestRate: 250, scenario: "MIXED_ATTACK", seed: 12031, jitterMs: 35 },
  judge_5k: { label: "Judge demo · 5,000 virtual users", virtualUsers: 5_000, durationSeconds: 180, maxConcurrency: 300, requestRate: 700, scenario: "MIXED_ATTACK", seed: 12032, jitterMs: 25 },
  stress_50k: { label: "Stress mode · 50,000 virtual users", virtualUsers: 50_000, durationSeconds: 300, maxConcurrency: 500, requestRate: 2_000, scenario: "MIXED_ATTACK", seed: 12033, jitterMs: 10 },
} as const satisfies Record<string, SimulationConfig & { label: string }>;

export type LiveDemoPreset = keyof typeof LIVE_DEMO_PRESETS;

export function resolveLiveDemoPreset(value: unknown): { preset: LiveDemoPreset; config: SimulationConfig } | null {
  if (typeof value !== "string" || !(value in LIVE_DEMO_PRESETS)) return null;
  const preset = value as LiveDemoPreset;
  const selected = LIVE_DEMO_PRESETS[preset];
  return { preset, config: { virtualUsers: selected.virtualUsers, durationSeconds: selected.durationSeconds, maxConcurrency: selected.maxConcurrency, requestRate: selected.requestRate, scenario: selected.scenario, seed: selected.seed, jitterMs: selected.jitterMs } };
}
