"""
Cache simulator package.
"""
from .cache import Cache, CacheBlock
from .policies import create_policy, LRUPolicy, FIFOPolicy
from .utils import parse_size, CacheStatistics

__all__ = [
    'Cache',
    'CacheBlock',
    'create_policy',
    'LRUPolicy',
    'FIFOPolicy',
    'parse_size',
    'CacheStatistics'
] 