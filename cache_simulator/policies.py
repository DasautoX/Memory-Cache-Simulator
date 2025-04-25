"""
Cache replacement policies implementation.
"""
from abc import ABC, abstractmethod
from collections import OrderedDict
from typing import Any, Optional


class ReplacementPolicy(ABC):
    """Abstract base class for cache replacement policies."""
    
    @abstractmethod
    def access(self, key: Any) -> None:
        """Record an access to the given key."""
        pass
    
    @abstractmethod
    def add(self, key: Any) -> None:
        """Add a new key to the policy tracking."""
        pass
    
    @abstractmethod
    def remove(self, key: Any) -> None:
        """Remove a key from policy tracking."""
        pass
    
    @abstractmethod
    def get_victim(self) -> Optional[Any]:
        """Get the key that should be evicted according to this policy."""
        pass


class LRUPolicy(ReplacementPolicy):
    """Least Recently Used replacement policy implementation."""
    
    def __init__(self):
        """Initialize LRU policy with ordered dictionary to track access order."""
        self._access_order = OrderedDict()
    
    def access(self, key: Any) -> None:
        """Record an access to the given key by moving it to the end (most recent)."""
        if key in self._access_order:
            self._access_order.move_to_end(key)
    
    def add(self, key: Any) -> None:
        """Add a new key as the most recently used."""
        self._access_order[key] = None
    
    def remove(self, key: Any) -> None:
        """Remove a key from tracking."""
        if key in self._access_order:
            del self._access_order[key]
    
    def get_victim(self) -> Optional[Any]:
        """Return the least recently used key (first in ordered dict)."""
        try:
            return next(iter(self._access_order))
        except StopIteration:
            return None


class FIFOPolicy(ReplacementPolicy):
    """First In First Out replacement policy implementation."""
    
    def __init__(self):
        """Initialize FIFO policy with ordered dictionary to track insertion order."""
        self._insertion_order = OrderedDict()
    
    def access(self, key: Any) -> None:
        """Record an access (no-op for FIFO as order doesn't change on access)."""
        pass
    
    def add(self, key: Any) -> None:
        """Add a new key to the end of the FIFO queue."""
        self._insertion_order[key] = None
    
    def remove(self, key: Any) -> None:
        """Remove a key from tracking."""
        if key in self._insertion_order:
            del self._insertion_order[key]
    
    def get_victim(self) -> Optional[Any]:
        """Return the oldest inserted key (first in ordered dict)."""
        try:
            return next(iter(self._insertion_order))
        except StopIteration:
            return None


def create_policy(policy_type: str) -> ReplacementPolicy:
    """Factory function to create a replacement policy instance.
    
    Args:
        policy_type: String identifier for the policy ("LRU" or "FIFO")
        
    Returns:
        An instance of the requested replacement policy
        
    Raises:
        ValueError: If policy_type is not recognized
    """
    policy_map = {
        "LRU": LRUPolicy,
        "FIFO": FIFOPolicy
    }
    
    policy_class = policy_map.get(policy_type.upper())
    if policy_class is None:
        raise ValueError(f"Unknown replacement policy: {policy_type}")
    
    return policy_class() 