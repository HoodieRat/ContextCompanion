# PearlBatch reference

Fictional independent test reference.

PearlBatch.flushBatch performs the supported operation. The batchLimit field selects its parameter. Buffered writes are committed together when the batch is flushed. PearlBatch uses this operation and field together. buffered writes group commit.

Use PearlBatch.flushBatch with batchLimit; changes become durable when the call returns. This document contains public reference information.
