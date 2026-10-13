# Checkpoint ownership

Fictional test documentation.

HarborWorker commits a Checkpoint only after durable output is stored. queue.ack(job_id) is sent after that checkpoint. A crash before acknowledgement may deliver the same job again.
