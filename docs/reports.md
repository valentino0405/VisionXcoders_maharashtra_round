# Reports

`/admin/reports` renders presentation-ready, aggregate reports for completed experiments only. It reads the persisted baseline/FairDrop metrics and comparison produced by Phases 9–10; it never generates synthetic results or exposes identities, tokens, or Redis data.

The report API is `GET /api/admin/reports/{experimentId}` and uses the existing Clerk plus `FAIRDROP_ADMIN_CLERK_IDS` protection. Missing, incomplete, and incompatible experiment results return explicit unavailable states. Baseline-only abuse/token controls remain `NOT_APPLICABLE`.

Reports include performance, queue, abuse, allocation, integrity, and Phase 5 fairness rates/confidence intervals, plus small data-backed comparison charts. CSV and print output are available in the web view. Results describe the observed deterministic experiment workload, not universal guarantees.
