# Memory Cache Simulator

A Python-based memory cache simulator that supports direct-mapped, fully associative, and set-associative cache configurations with visualization capabilities.

## Features

- Supports multiple cache mapping types:
  - Direct-mapped cache
  - Fully associative cache
  - N-way set associative cache
- Implements common replacement policies:
  - LRU (Least Recently Used)
  - FIFO (First In First Out)
- Interactive visualization of cache state
- Real-time statistics tracking
- Configurable cache parameters:
  - Cache size
  - Block size
  - Associativity
  - Replacement policy

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run tests:
```bash
pytest tests/
```

4. Start the web interface:
```bash
python app.py
```

## Project Structure

```
.
├── app.py                  # Web application entry point
├── cache_simulator/        # Core simulation logic
│   ├── __init__.py
│   ├── cache.py           # Cache implementation
│   ├── policies.py        # Replacement policies
│   └── utils.py           # Utility functions
├── tests/                 # Test suite
│   ├── __init__.py
│   └── test_cache.py      # Cache tests
├── static/                # Frontend assets
└── templates/             # HTML templates
```

## Usage

1. Configure cache parameters through the web interface
2. Input memory access patterns
3. View cache behavior and statistics in real-time
4. Export results and analysis

## License

MIT License 