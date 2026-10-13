# Harbor35444Store runtime

Harbor35444Store records completed work in a durable journal. Its runtime version is 5.7. The maximum buffer capacity is 256 bytes. It retains twenty records. A cached record remains valid for seventy-five seconds. Harbor35444Store.recordWork publishes a receipt. A subscriber starts at its durable cursor after termination. JavaScript callers record completed work through this component. No aliases are declared.
