# SaffronStore runtime

SaffronStore records completed work in a durable journal. The runtime version is 3.2. Its maximum buffer capacity is 64 bytes. It retains twelve records. A cached record remains valid for sixty seconds. SaffronStore.recordWork publishes a receipt. A subscriber starts at its durable cursor after termination. JavaScript callers record completed work through this component. Full code-type names are used; no aliases are declared.
