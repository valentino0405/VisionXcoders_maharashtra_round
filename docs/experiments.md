# Experiments and dashboard

An experiment resolves one Phase 8 configuration and seed once, then executes that exact virtual-user schedule against an isolated in-memory FIFO baseline and an isolated real FairDrop drop. Both runs store aggregate `SimulationRun` metrics; the `Experiment` record stores their safe comparison and Phase 5 rate metrics.

Baseline is deliberately conventional but not malicious: first-come queueing, idempotent entries, and a capacity of 500. Abuse/token-only values are `NOT_APPLICABLE`, never artificial zeroes. FairDrop executes its existing services and cleans its temporary `fairdrop-exp-*` drop and Redis/Mongo state.

Admin routes require Clerk plus `FAIRDROP_ADMIN_CLERK_IDS`: start/list/get/stop under `/api/admin/experiments`. `/admin/experiments` and `/admin` poll only while an active run exists. The dashboard uses persisted aggregate simulator/experiment data and exposes no raw identities, tokens, or Redis contents.
