"""
Web interface for cache simulator.
"""
import logging
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix

from cache_simulator import Cache, parse_size

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app)  # Handle proxy headers

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Global cache instance (will be initialized with configuration)
cache_instance = None


@app.route('/')
def index():
    """Render the main page."""
    try:
        return render_template('index.html')
    except Exception as e:
        logger.error("Error rendering index page: %s", str(e))
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


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

        logger.info("Configuring cache with parameters: %s", data)

        # Parse cache parameters
        try:
            total_size = parse_size(data['size'])
            block_size = parse_size(data['blockSize'])
        except (KeyError, ValueError) as e:
            logger.warning("Invalid size format: %s", str(e))
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
            logger.warning("Invalid associativity value: %s", data.get('associativity'))
            return jsonify({
                'success': False,
                'error': 'Invalid associativity value'
            }), 400

        # Validate policy
        if 'policy' not in data or data['policy'] not in ['LRU', 'FIFO']:
            logger.warning("Invalid replacement policy: %s", data.get('policy'))
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
            logger.info("Cache configured successfully")
        except ValueError as e:
            logger.error("Error creating cache instance: %s", str(e))
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
        logger.error("Unexpected error in configure_cache: %s", str(e))
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@app.route('/api/access', methods=['POST'])
def access_cache():
    """Process a memory access."""
    global cache_instance
    
    if cache_instance is None:
        logger.warning("Attempted to access unconfigured cache")
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
            logger.info("Processing %s access at address %d", 
                       "write" if is_write else "read", address)
        except (KeyError, ValueError):
            logger.warning("Invalid address format: %s", data.get('address'))
            return jsonify({
                'success': False,
                'error': 'Invalid address format'
            }), 400
        
        # Perform cache access
        hit, evicted_block = cache_instance.access(address, is_write)
        
        # Get updated cache state
        contents = cache_instance.get_contents()
        
        logger.info("Access result: %s, eviction: %s", 
                   "hit" if hit else "miss",
                   "yes" if evicted_block else "no")
        
        # Prepare evicted block info for JSON response (avoid bytearray)
        evicted_info = None
        if evicted_block:
            evicted_info = {
                'tag': evicted_block.tag,
                'dirty': evicted_block.dirty
                # We don't include 'data' as it's bytearray
            }
            
        return jsonify({
            'success': True,
            'result': {
                'hit': hit,
                'evicted': evicted_info, # Send serializable info
                'state': contents
            }
        })
        
    except Exception as e:
        logger.error("Error processing cache access: %s", str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/state')
def get_state():
    """Get current cache state."""
    global cache_instance
    
    if cache_instance is None:
        logger.warning("Attempted to get state of unconfigured cache")
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
        logger.error("Error getting cache state: %s", str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/stats')
def get_stats():
    """Get cache statistics."""
    global cache_instance
    
    if cache_instance is None:
        logger.warning("Attempted to get stats of unconfigured cache")
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
        logger.error("Error getting cache stats: %s", str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/reset', methods=['POST'])
def reset_cache():
    """Reset the cache (clear configuration)."""
    global cache_instance
    logger.info("Resetting cache configuration")
    cache_instance = None
    return jsonify({'success': True})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 