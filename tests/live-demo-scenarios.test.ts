import test from "node:test";
import assert from "node:assert/strict";
import { resolveLiveScenario } from "../lib/live-demo.ts";

test("last-seat scenario preloads 499 real allocations while retaining one seat", () => {
  const scenario = resolveLiveScenario({ preset: "last_seat" });
  assert.ok(scenario); assert.equal(scenario.capacity, 500); assert.equal(scenario.preloadedAllocated, 499); assert.equal(scenario.capacity - scenario.preloadedAllocated, 1);
});
test("sold-out scenario preloads exactly its capacity and never exceeds it", () => {
  const scenario = resolveLiveScenario({ preset: "sold_out" });
  assert.ok(scenario); assert.equal(scenario.preloadedAllocated, scenario.capacity);
});
test("bot swarm and mixed attack use bounded real simulator profiles", () => {
  for (const preset of ["bot_swarm", "mixed_attack"] as const) { const scenario = resolveLiveScenario({ preset }); assert.ok(scenario); assert.ok(scenario.virtualUsers > 1_000); assert.equal(scenario.config.scenario, "MIXED_ATTACK"); }
});
test("custom scenarios reject impossible seats, concurrency and workload values", () => {
  assert.equal(resolveLiveScenario({ preset: "custom", capacity: 10, preloadedAllocated: 11 }), null);
  assert.equal(resolveLiveScenario({ preset: "custom", normalUsers: 10, maxConcurrency: 11 }), null);
  assert.equal(resolveLiveScenario({ preset: "custom", normalUsers: 50_001 }), null);
});
