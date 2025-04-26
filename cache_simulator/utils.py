"""
Utility functions for cache simulator.
"""
from typing import Tuple
import math


def parse_size(size_str: str) -> int:
    """Convert a size string (e.g., '1KB', '512B') to number of bytes.
    
    Args:
        size_str: String representing size with optional unit suffix
        
    Returns:
        Size in bytes as integer
        
    Raises:
        ValueError: If size string format is invalid
    """
    try:
        size_str = str(size_str).upper().strip()
        
        # Handle pure numbers
        if size_str.isdigit():
            return int(size_str)
        
        # Define size multipliers
        multipliers = {
            'B': 1,
            'KB': 1024,
            'MB': 1024 * 1024,
            'GB': 1024 * 1024 * 1024
        }
        
        # Extract number and unit
        number = ''
        unit = ''
        
        for char in size_str:
            if char.isdigit() or char == '.':
                number += char
            else:
                unit += char.upper()
        
        unit = unit.strip()
        
        # Validate and convert
        if not number or not unit:
            raise ValueError(f"Invalid size format: {size_str}")
        
        if unit not in multipliers:
            raise ValueError(f"Unknown unit: {unit}")
        
        value = float(number) * multipliers[unit]
        return int(value)
        
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid size format: {size_str}") from e


def get_address_parts(address: int, block_size: int, num_sets: int) -> Tuple[int, int, int]:
    """Break down a memory address into tag, index, and offset components.
    
    Args:
        address: The memory address to break down
        block_size: Size of each cache block in bytes
        num_sets: Number of sets in the cache
        
    Returns:
        Tuple of (tag, index, offset)
    """
    # Calculate required bits for each component
    offset_bits = int(math.log2(block_size))
    index_bits = int(math.log2(num_sets)) if num_sets > 1 else 0
    
    # Extract components using bit masks
    offset = address & ((1 << offset_bits) - 1)
    index = (address >> offset_bits) & ((1 << index_bits) - 1) if index_bits > 0 else 0
    tag = address >> (offset_bits + index_bits)
    
    return tag, index, offset


def calculate_cache_parameters(total_size: int, block_size: int, associativity: int) -> Tuple[int, int]:
    """Calculate number of sets and ways for the cache configuration.
    
    Args:
        total_size: Total cache size in bytes
        block_size: Size of each cache block in bytes
        associativity: Number of ways (1 for direct-mapped, -1 for fully associative)
        
    Returns:
        Tuple of (num_sets, ways_per_set)
        
    Raises:
        ValueError: If parameters are invalid or incompatible
    """
    if total_size <= 0 or block_size <= 0:
        raise ValueError("Cache and block sizes must be positive")
    if total_size % block_size != 0:
        raise ValueError("Cache size must be divisible by block size")
    
    total_blocks = total_size // block_size
    
    # Fully associative
    if associativity == -1:
        return 1, total_blocks
    
    # Direct mapped
    if associativity == 1:
        return total_blocks, 1
    
    # N-way set associative
    if total_blocks % associativity != 0:
        raise ValueError("Number of blocks must be divisible by associativity")
    
    return total_blocks // associativity, associativity


class CacheStatistics:
    """Track and calculate cache performance statistics."""
    
    def __init__(self):
        """Initialize statistics counters."""
        self.accesses = 0
        self.hits = 0
        self.misses = 0
        self.evictions = 0
    
    def record_access(self, hit: bool, eviction: bool = False):
        """Record a cache access.
        
        Args:
            hit: Whether the access was a cache hit
            eviction: Whether the access caused an eviction
        """
        self.accesses += 1
        if hit:
            self.hits += 1
        else:
            self.misses += 1
        if eviction:
            self.evictions += 1
    
    @property
    def hit_rate(self) -> float:
        """Calculate the cache hit rate."""
        return self.hits / self.accesses if self.accesses > 0 else 0.0
    
    @property
    def miss_rate(self) -> float:
        """Calculate the cache miss rate."""
        return self.misses / self.accesses if self.accesses > 0 else 0.0
    
    def get_stats(self) -> dict:
        """Get all statistics as a dictionary."""
        # Ensure properties are evaluated before creating the dict
        current_hit_rate = self.hit_rate
        current_miss_rate = self.miss_rate
        return {
            'accesses': self.accesses,
            'hits': self.hits,
            'misses': self.misses,
            'evictions': self.evictions,
            'hit_rate': current_hit_rate,
            'miss_rate': current_miss_rate
        } 