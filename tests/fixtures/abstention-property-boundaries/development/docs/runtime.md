# Hazel runtime reference

A request deadline is thirty seconds. The TTL is two minutes; cached records remain valid for this duration. The default configuration selects this expiration interval. The processing cadence is four operations per second. A retained batch occupies 64 bytes with 16 entries. A request accepts at most 256 characters. Artifact labels are assigned by the outputFile field. The release is 2.7. The event timestamp uses UTC. The creation date records the current calendar day. A caller receives a resultValue of 42. A subscription is priced at zero for local use. The default rate limit is four requests per second.

An atomic journal preserves completed receipts. Failed callbacks never advance the acknowledged cursor. Cancellation releases resources. Replays deduplicate completed work. A local operator can inspect the configured values; public references contain no actual production secrets.
