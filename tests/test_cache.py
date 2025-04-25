"""
Tests for cache simulator implementation.
"""
import pytest
from cache_simulator import Cache, parse_size


def test_direct_mapped_cache():
    """Test direct-mapped cache behavior."""
    # Create a small direct-mapped cache (16 bytes total, 4-byte blocks = 4 lines)
    cache = Cache(total_size=16, block_size=4, associativity=1)
    
    # Access pattern: 0, 4, 8, 0 (should be: miss, miss, miss, hit)
    assert cache.access(0)[0] is False  # miss
    assert cache.access(4)[0] is False  # miss
    assert cache.access(8)[0] is False  # miss
    assert cache.access(0)[0] is True   # hit
    
    stats = cache.stats.get_stats()
    assert stats['hits'] == 1
    assert stats['misses'] == 3
    assert stats['hit_rate'] == 0.25


def test_fully_associative_cache():
    """Test fully associative cache behavior."""
    # Create a small fully associative cache (16 bytes total, 4-byte blocks = 4 lines)
    cache = Cache(total_size=16, block_size=4, associativity=-1, policy_type="LRU")
    
    # Access pattern that would cause conflicts in direct-mapped but not here
    # Addresses 0, 4, 8, 12 (all misses, filling cache)
    assert cache.access(0)[0] is False
    assert cache.access(4)[0] is False
    assert cache.access(8)[0] is False
    assert cache.access(12)[0] is False
    
    # Access them all again - should all be hits since cache can hold all blocks
    assert cache.access(0)[0] is True
    assert cache.access(4)[0] is True
    assert cache.access(8)[0] is True
    assert cache.access(12)[0] is True
    
    stats = cache.stats.get_stats()
    assert stats['hits'] == 4
    assert stats['misses'] == 4
    assert stats['hit_rate'] == 0.5


def test_set_associative_cache():
    """Test set-associative cache behavior."""
    # Create a 2-way set associative cache (16 bytes total, 4-byte blocks = 4 blocks in 2 sets)
    cache = Cache(total_size=16, block_size=4, associativity=2, policy_type="LRU")
    
    # Access pattern that tests set associativity
    # Addresses 0 and 8 map to set 0, 4 and 12 map to set 1
    assert cache.access(0)[0] is False   # miss, load to set 0
    assert cache.access(4)[0] is False   # miss, load to set 1
    assert cache.access(8)[0] is False   # miss, load to set 0
    assert cache.access(0)[0] is True    # hit in set 0 (LRU keeps it)
    assert cache.access(12)[0] is False  # miss, load to set 1
    assert cache.access(4)[0] is True    # hit in set 1
    
    stats = cache.stats.get_stats()
    assert stats['hits'] == 2
    assert stats['misses'] == 4
    assert stats['hit_rate'] == 1/3


def test_replacement_policies():
    """Test LRU and FIFO replacement policies."""
    # Create small fully associative caches with different policies
    lru_cache = Cache(total_size=8, block_size=4, associativity=-1, policy_type="LRU")
    fifo_cache = Cache(total_size=8, block_size=4, associativity=-1, policy_type="FIFO")
    
    # Fill caches (2 blocks total)
    lru_cache.access(0)
    lru_cache.access(4)
    fifo_cache.access(0)
    fifo_cache.access(4)
    
    # Access first block again
    lru_cache.access(0)  # Makes block 0 most recently used
    fifo_cache.access(0)  # Doesn't change FIFO order
    
    # Access new block - should evict different blocks in LRU vs FIFO
    _, lru_evicted = lru_cache.access(8)  # Should evict block 4 (least recently used)
    _, fifo_evicted = fifo_cache.access(8)  # Should evict block 0 (first in)
    
    assert lru_evicted.tag == 1   # Block 4's tag
    assert fifo_evicted.tag == 0   # Block 0's tag


def test_size_parsing():
    """Test size string parsing."""
    assert parse_size("1024") == 1024
    assert parse_size("1KB") == 1024
    assert parse_size("1kb") == 1024
    assert parse_size("1MB") == 1024 * 1024
    
    with pytest.raises(ValueError):
        parse_size("invalid")


def test_invalid_parameters():
    """Test error handling for invalid cache parameters."""
    # Cache size not divisible by block size
    with pytest.raises(ValueError):
        Cache(total_size=10, block_size=4)
    
    # Invalid associativity for cache size
    with pytest.raises(ValueError):
        Cache(total_size=16, block_size=4, associativity=3)
    
    # Invalid replacement policy
    with pytest.raises(ValueError):
        Cache(total_size=16, block_size=4, policy_type="INVALID") 