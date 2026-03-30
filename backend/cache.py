"""
Image result cache for NutriVision backend.

Provides an in-memory LRU cache keyed on SHA-256 of raw image bytes,
so repeated identical uploads skip GPU inference entirely.

Thread-safe via an internal Lock (separate from the GPU lock in main.py).
"""

from __future__ import annotations

import hashlib
import threading
from collections import OrderedDict


def hash_image_bytes(data: bytes) -> str:
    """Return the SHA-256 hex digest of raw image bytes."""
    return hashlib.sha256(data).hexdigest()


class LRUImageCache:
    """Bounded LRU cache mapping image-hash → cached nutrition result.

    Stores only the lightweight nutrition dict (not the raw bytes),
    so memory footprint is minimal even at max_size=100 entries.
    """

    def __init__(self, max_size: int = 100) -> None:
        self._max_size = max_size
        # OrderedDict: oldest entries at the front (FIFO eviction)
        self._store: OrderedDict[str, dict] = OrderedDict()
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> dict | None:
        """Return cached entry for *key*, or None on miss.

        Moves the entry to the end (most-recently-used) on hit.
        """
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return None
            # Promote to MRU position
            self._store.move_to_end(key)
            self._hits += 1
            return entry

    def put(self, key: str, nutrition: dict, processing_time_ms: float) -> None:
        """Insert or update an entry. Evicts the LRU entry if at capacity."""
        with self._lock:
            if key in self._store:
                self._store.move_to_end(key)
            self._store[key] = {
                "nutrition": nutrition,
                "processing_time_ms": processing_time_ms,
            }
            if len(self._store) > self._max_size:
                # Evict oldest (front of OrderedDict)
                self._store.popitem(last=False)

    def stats(self) -> dict:
        """Return cache statistics (hits, misses, current size, max size)."""
        with self._lock:
            return {
                "hits": self._hits,
                "misses": self._misses,
                "size": len(self._store),
                "max_size": self._max_size,
            }

    def clear(self) -> None:
        """Clear all entries and reset counters (useful for testing)."""
        with self._lock:
            self._store.clear()
            self._hits = 0
            self._misses = 0
