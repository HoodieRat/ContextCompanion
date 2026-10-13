# Batch boundaries

Fictional test documentation.

NacreKit sendBatch accepts at most 32 operations in this fixture. Larger submissions must be split into separate batches. A partial result reports failed operation IDs; only those failures are candidates for retry.
