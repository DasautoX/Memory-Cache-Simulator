"""
Core cache simulator implementation.
"""
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from .policies import ReplacementPolicy, create_policy
from .utils import calculate_cache_parameters, get_address_parts, CacheStatistics


@dataclass
class CacheBlock:
    """Represents a cache block/line."""
    tag: int
    valid: bool = False
    dirty: bool = False
    data: Optional[bytearray] = None


class CacheSet:
    """Represents a set in the cache (contains one or more blocks)."""
    
    def __init__(self, num_ways: int, block_size: int, policy: ReplacementPolicy):
        """Initialize a cache set.
        
        Args:
            num_ways: Number of blocks in this set
            block_size: Size of each block in bytes
            policy: Replacement policy for this set
        """
        self.blocks: List[CacheBlock] = [CacheBlock(tag=0) for _ in range(num_ways)]
        self.block_size = block_size
        self.policy = policy
    
    def find_block(self, tag: int) -> Tuple[bool, Optional[int]]:
        """Look for a block with the given tag in this set.
        
        Args:
            tag: Tag to search for
            
        Returns:
            Tuple of (hit_found, block_index_if_found)
        """
        for i, block in enumerate(self.blocks):
            if block.valid and block.tag == tag:
                return True, i
        return False, None
    
    def find_empty_block(self) -> Optional[int]:
        """Find an empty block in the set.
        
        Returns:
            Index of empty block if found, None if set is full
        """
        for i, block in enumerate(self.blocks):
            if not block.valid:
                return i
        return None
    
    def access(self, tag: int) -> Tuple[bool, Optional[CacheBlock], Optional[CacheBlock]]:
        """Access the set with the given tag.
        
        Args:
            tag: Tag to access
            
        Returns:
            Tuple of (hit, accessed_block, evicted_block)
        """
        hit, block_idx = self.find_block(tag)
        
        if hit:
            # Cache hit - update policy and return block
            self.policy.access(tag)
            return True, self.blocks[block_idx], None
        
        # Cache miss - need to load block
        empty_idx = self.find_empty_block()
        evicted_block = None
        
        if empty_idx is not None:
            # Empty block available
            block_idx = empty_idx
        else:
            # Need to evict - get victim from policy
            victim_tag = self.policy.get_victim()
            if victim_tag is None:
                raise RuntimeError("No victim found but set is full")
            
            # Find and evict victim block
            for i, block in enumerate(self.blocks):
                if block.valid and block.tag == victim_tag:
                    block_idx = i
                    evicted_block = CacheBlock(
                        tag=block.tag,
                        valid=True,
                        dirty=block.dirty,
                        data=block.data.copy() if block.data else None
                    )
                    self.policy.remove(victim_tag)
                    break
            else:
                raise RuntimeError("Victim tag not found in set")
        
        # Load new block
        self.blocks[block_idx].tag = tag
        self.blocks[block_idx].valid = True
        self.blocks[block_idx].dirty = False
        self.blocks[block_idx].data = bytearray(self.block_size)
        self.policy.add(tag)
        
        return False, self.blocks[block_idx], evicted_block


class Cache:
    """Main cache simulator implementation."""
    
    def __init__(self, total_size: int, block_size: int, associativity: int = 1,
                 policy_type: str = "LRU"):
        """Initialize the cache.
        
        Args:
            total_size: Total cache size in bytes
            block_size: Size of each block in bytes
            associativity: Number of ways (1 for direct-mapped, -1 for fully associative)
            policy_type: Replacement policy type ("LRU" or "FIFO")
        """
        self.block_size = block_size
        self.num_sets, self.ways = calculate_cache_parameters(
            total_size, block_size, associativity
        )
        
        # Create sets with appropriate replacement policies
        self.sets = []
        for _ in range(self.num_sets):
            policy = create_policy(policy_type)
            self.sets.append(CacheSet(self.ways, block_size, policy))
        
        # Initialize statistics
        self.stats = CacheStatistics()
    
    def access(self, address: int, is_write: bool = False) -> Tuple[bool, Optional[CacheBlock]]:
        """Access the cache at the given address.
        
        Args:
            address: Memory address to access
            is_write: Whether this is a write access
            
        Returns:
            Tuple of (hit, evicted_block_if_any)
        """
        tag, index, offset = get_address_parts(address, self.block_size, self.num_sets)
        
        # Access the appropriate set
        hit, block, evicted = self.sets[index].access(tag)
        
        # Update block state and statistics
        if block:
            if is_write:
                block.dirty = True
        
        self.stats.record_access(hit, eviction=evicted is not None)
        
        return hit, evicted
    
    def get_contents(self) -> Dict:
        """Get the current contents of the cache.
        
        Returns:
            Dictionary containing cache contents and state
        """
        contents = {
            'sets': [],
            'stats': self.stats.get_stats(),
            'config': {
                'numSets': self.num_sets,
                'waysPerSet': self.ways,
                'blockSize': self.block_size
            }
        }
        
        for i, cache_set in enumerate(self.sets):
            set_info = {
                'index': i,
                'blocks': []
            }
            for block in cache_set.blocks:
                block_info = {
                    'tag': block.tag,
                    'valid': block.valid,
                    'dirty': block.dirty,
                    'data': block.data.hex() if block.data else None
                }
                set_info['blocks'].append(block_info)
            contents['sets'].append(set_info)
        
        return contents 