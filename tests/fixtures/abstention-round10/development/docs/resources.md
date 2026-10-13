# Independent asynchronous behavior
Sorrel reuses idle resources. A pool lends channels to callers without constructing a fresh channel for each request. Its subscription supplies a sequence of notifications; a producer emits values to a listener.
