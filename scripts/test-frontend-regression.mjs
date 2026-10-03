import assert from "node:assert/strict";

const baseUrl = "http://127.0.0.1:3000";

const routes = [
  { path: "/", expectedStatus: 200, expectedText: "FairDrop" },
  { path: "/drop", expectedStatus: 200, expectedText: "GLOBAL DROP" },
  { path: "/queue", expectedStatus: 200, expectedText: "QUEUE" },
  { path: "/ticket", expectedStatus: 200, expectedText: "ALLOCATION CONFIRMED" },
  { path: "/account", expectedStatus: 200, expectedText: "Account" },
  { path: "/admin", expectedStatus: 200, expectedText: "Operations Center" },
  { path: "/admin/fairness", expectedStatus: 200, expectedText: "Fairness" },
  { path: "/admin/simulator", expectedStatus: 200, expectedText: "Simulator" },
  { path: "/admin/threats", expectedStatus: 200, expectedText: "Threats" },
  { path: "/admin/reports", expectedStatus: 200, expectedText: "Reports" },
  { path: "/sign-in", expectedStatus: 200, expectedText: "clerk" },
  { path: "/sign-up", expectedStatus: 200, expectedText: "clerk" },
  { path: "/test-user", expectedStatus: 200, expectedText: "Clerk" },
  { path: "/api/health/redis", expectedStatus: 200, expectedText: "ok" },
  { path: "/api/me", expectedStatus: 401, expectedText: "UNAUTHORIZED" },
  { path: "/api/drop/join", method: "POST", expectedStatus: 401, expectedText: "UNAUTHORIZED" },
  { path: "/api/queue/join", method: "POST", expectedStatus: 401, expectedText: "UNAUTHORIZED" },
  { path: "/api/queue/status?dropId=fairdrop-demo", expectedStatus: 401, expectedText: "UNAUTHORIZED" },
  { path: "/nonexistent-page-xyz", expectedStatus: 404, expectedText: "404" },
];

console.log("Checking all routes on live production server...\n");

let passed = 0;
let failed = 0;

for (const r of routes) {
  const url = `${baseUrl}${r.path}`;
  try {
    const res = await fetch(url, {
      method: r.method || "GET",
      redirect: "manual",
    });
    const text = await res.text();

    const statusMatch = res.status === r.expectedStatus;
    const contentMatch = text.toLowerCase().includes(r.expectedText.toLowerCase());

    if (statusMatch && contentMatch) {
      console.log(`[PASS] ${r.method || "GET"} ${r.path} -> Status: ${res.status}`);
      passed++;
    } else {
      console.error(
        `[FAIL] ${r.method || "GET"} ${r.path} -> Expected ${r.expectedStatus} with "${r.expectedText}", got ${res.status}`
      );
      failed++;
    }
  } catch (err) {
    console.error(`[ERROR] ${r.method || "GET"} ${r.path} -> ${err.cause?.message || err.message}`);
    failed++;
  }
}

console.log(`\nResults: ${passed} PASSED, ${failed} FAILED out of ${routes.length} routes tested.`);
assert.equal(failed, 0, "All frontend and API routes must pass regression testing");
