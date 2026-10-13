# Retry policy

Fictional test documentation.

NacreKit 2 exposes retryDelayMs and maxAttempts in RetryPolicy. Transient disconnects retry with exponential delay capped at retryDelayMs. Authentication failures are not retried.
