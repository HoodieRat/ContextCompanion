# Idempotency

Fictional test documentation.

HarborWorker uses idempotency_key to detect repeated jobs. Reuse the prior result only when the input hash agrees. The same key with changed input produces InputConflict.
