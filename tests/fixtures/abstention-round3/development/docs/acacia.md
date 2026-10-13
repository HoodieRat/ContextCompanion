# Acacia import reference

Acacia supports Go clients on Windows. Its CLI imports records in bulk. Capital letters in record names are preserved. The current date and time are stored with each import. The rate of imports is limited to five batches per minute. The latest version provides a mass import operation. The price of an import is reported in internal credits. The size of each batch is at most one hundred records. A durable checkpoint remembers completed batches so interrupted work can resume.

The public API validates names before writing records. A failed validation leaves the original data unchanged.
