#!/usr/bin/env python3
"""
Command-line interface for cache simulator.
"""
import argparse
import sys
from typing import List, Optional

from cache_simulator import Cache, parse_size


def format_cache_state(cache: Cache) -> str:
    """Format current cache state as a string."""
    contents = cache.get_contents()
    lines = []
    
    # Format each set
    for set_info in contents['sets']:
        set_idx = set_info['index']
        blocks = set_info['blocks']
        if blocks:
            block_str = ', '.join(f"T:{b['tag']}" + ("*" if b['dirty'] else "") 
                                for b in blocks)
            lines.append(f"Set {set_idx}: [{block_str}]")
        else:
            lines.append(f"Set {set_idx}: [empty]")
    
    # Add statistics
    stats = contents['stats']
    lines.extend([
        "",
        f"Accesses: {stats['accesses']}",
        f"Hits: {stats['hits']}",
        f"Misses: {stats['misses']}",
        f"Hit Rate: {stats['hit_rate']:.2%}",
        f"Evictions: {stats['evictions']}"
    ])
    
    return "\n".join(lines)


def parse_trace(trace_str: str) -> List[int]:
    """Parse a comma-separated list of addresses."""
    try:
        return [int(addr.strip()) for addr in trace_str.split(',')]
    except ValueError:
        print("Error: Trace must be comma-separated list of integers")
        sys.exit(1)


def main(args: Optional[List[str]] = None):
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Simulate cache memory with various mapping strategies"
    )
    
    parser.add_argument(
        '--size',
        default='1KB',
        help='Total cache size (e.g., 1KB, 512B)'
    )
    parser.add_argument(
        '--block-size',
        default='64B',
        help='Block/line size (e.g., 64B, 4B)'
    )
    parser.add_argument(
        '--associativity',
        type=str,
        default='1',
        help='Associativity (1=direct, fully=fully associative, or N for N-way)'
    )
    parser.add_argument(
        '--policy',
        choices=['LRU', 'FIFO'],
        default='LRU',
        help='Replacement policy'
    )
    parser.add_argument(
        '--trace',
        help='Comma-separated list of addresses to access'
    )
    parser.add_argument(
        '--interactive',
        action='store_true',
        help='Run in interactive mode'
    )
    
    args = parser.parse_args(args)
    
    # Parse cache parameters
    try:
        total_size = parse_size(args.size)
        block_size = parse_size(args.block_size)
        
        if args.associativity.lower() == 'fully':
            associativity = -1
        else:
            associativity = int(args.associativity)
        
        cache = Cache(
            total_size=total_size,
            block_size=block_size,
            associativity=associativity,
            policy_type=args.policy
        )
    except (ValueError, TypeError) as e:
        print(f"Error configuring cache: {e}")
        sys.exit(1)
    
    # Print initial configuration
    print("\nCache Configuration:")
    print(f"Total Size: {args.size}")
    print(f"Block Size: {args.block_size}")
    print(f"Associativity: {args.associativity}")
    print(f"Replacement Policy: {args.policy}")
    print(f"Number of Sets: {cache.num_sets}")
    print(f"Ways per Set: {cache.ways}\n")
    
    if args.interactive:
        # Interactive mode - process addresses one at a time
        print("Enter memory addresses to access (Ctrl+D or empty line to exit):")
        while True:
            try:
                line = input("> ")
                if not line:
                    break
                
                addr = int(line)
                hit, evicted = cache.access(addr)
                
                print(f"\nAccessed {addr}: {'HIT' if hit else 'MISS'}")
                if evicted:
                    print(f"Evicted block with tag {evicted.tag}")
                print("\nCache State:")
                print(format_cache_state(cache))
                print()
                
            except (ValueError, KeyboardInterrupt):
                break
            except EOFError:
                break
    
    elif args.trace:
        # Process trace from command line
        addresses = parse_trace(args.trace)
        print("\nProcessing trace...")
        
        for addr in addresses:
            hit, evicted = cache.access(addr)
            print(f"\nAccessed {addr}: {'HIT' if hit else 'MISS'}")
            if evicted:
                print(f"Evicted block with tag {evicted.tag}")
            print("\nCache State:")
            print(format_cache_state(cache))
            print()
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main() 