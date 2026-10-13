# Independent behavioral reference
Tamarind sends buffered values after accumulating a group. Concurrent consumers run independently; a sequential stream delivers one item after another in the original sequence. Pending work may be cancelled. Waiting pauses the caller until an item arrives; a polling attempt yields immediately when none is available.
