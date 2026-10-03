# Final demo flow

Public flow: sign in, join the demo drop, enter/recover the queue, claim an eligible allocation, view the ticket, then review the account. Queue and ticket recovery use the existing durable session path and remain idempotent.

Admin flow: Dashboard → Simulator → Experiments → Fairness → Reports. All admin metrics are aggregate persisted data; empty states explain how to create data and no values are fabricated. Simulator and experiment resources are isolated from `fairdrop-demo`.

Limitations: active simulator/experiment workers are in-process and do not survive a restart or multi-instance deployment. Reports describe observed deterministic experiment workloads, not universal guarantees.
