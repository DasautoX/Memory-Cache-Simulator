"""
Web interface for cache simulator.
"""
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

from cache_simulator import Cache, parse_size

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global cache instance (will be initialized with configuration)
cache_instance = None


@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')


@app.route('/api/configure', methods=['POST'])
def configure_cache():
    """Configure the cache with the given parameters."""
    global cache_instance
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No configuration data provided'
            }), 400

        # Parse cache parameters
        try:
            total_size = parse_size(data['size'])
            block_size = parse_size(data['blockSize'])
        except (KeyError, ValueError) as e:
            return jsonify({
                'success': False,
                'error': f'Invalid size format: {str(e)}'
            }), 400
        
        # Handle associativity
        try:
            assoc = data['associativity']
            if assoc == 'fully':
                associativity = -1
            else:
                associativity = int(assoc)
        except (KeyError, ValueError):
            return jsonify({
                'success': False,
                'error': 'Invalid associativity value'
            }), 400

        # Validate policy
        if 'policy' not in data or data['policy'] not in ['LRU', 'FIFO']:
            return jsonify({
                'success': False,
                'error': 'Invalid replacement policy'
            }), 400
        
        # Create new cache instance
        try:
            cache_instance = Cache(
                total_size=total_size,
                block_size=block_size,
                associativity=associativity,
                policy_type=data['policy']
            )
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
        
        return jsonify({
            'success': True,
            'config': {
                'numSets': cache_instance.num_sets,
                'waysPerSet': cache_instance.ways,
                'blockSize': block_size
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/access', methods=['POST'])
def access_cache():
    """Process a memory access."""
    global cache_instance
    
    if cache_instance is None:
        return jsonify({
            'success': False,
            'error': 'Cache not configured'
        }), 400
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No access data provided'
            }), 400

        try:
            address = int(data['address'])
            is_write = data.get('isWrite', False)
        except (KeyError, ValueError):
            return jsonify({
                'success': False,
                'error': 'Invalid address format'
            }), 400
        
        # Perform cache access
        hit, evicted = cache_instance.access(address, is_write)
        
        # Get updated cache state
        contents = cache_instance.get_contents()
        
        return jsonify({
            'success': True,
            'result': {
                'hit': hit,
                'evicted': evicted,
                'state': contents
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/state')
def get_state():
    """Get current cache state."""
    global cache_instance
    
    if cache_instance is None:
        return jsonify({
            'success': False,
            'error': 'Cache not configured'
        }), 400
    
    try:
        return jsonify({
            'success': True,
            'state': cache_instance.get_contents()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/stats')
def get_stats():
    """Get cache statistics."""
    global cache_instance
    
    if cache_instance is None:
        return jsonify({
            'success': False,
            'error': 'Cache not configured'
        }), 400
    
    try:
        stats = cache_instance.stats.get_stats()
        return jsonify({
            'success': True,
            'stats': {
                'totalAccesses': stats['accesses'],
                'hits': stats['hits'],
                'misses': stats['misses'],
                'evictions': stats['evictions'],
                'hitRate': stats['hit_rate'],
                'missRate': stats['miss_rate']
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/reset', methods=['POST'])
def reset_cache():
    """Reset the cache (clear configuration)."""
    global cache_instance
    cache_instance = None
    return jsonify({'success': True})


if __name__ == '__main__':
    app.run(debug=True) 