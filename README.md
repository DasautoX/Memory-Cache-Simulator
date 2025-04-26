# Cache Memory Simulator

An interactive web-based cache memory simulator that supports direct-mapped, set-associative, and fully associative caches with LRU and FIFO replacement policies.

## Features

- Multiple cache configurations:
  - Direct-mapped cache
  - N-way set associative cache
  - Fully associative cache
- Replacement policies:
  - LRU (Least Recently Used)
  - FIFO (First In First Out)
- Interactive visualization of cache operations
- Support for manual memory accesses and address traces
- Real-time statistics and performance metrics
- Guided examples for learning

## Setup

1. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. Install the package in development mode:
   ```bash
   pip install -e .[dev]
   ```

3. Run the tests to verify installation:
   ```bash
   pytest tests/
   ```

## Running the Simulator

1. Start the Flask development server:
   ```bash
   python app.py
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```

## Usage

1. Configure your cache:
   - Set the total cache size
   - Choose block/line size
   - Select associativity
   - Pick a replacement policy

2. Access memory:
   - Enter individual addresses for read/write operations
   - Run address traces for batch simulation
   - Use guided examples to learn about cache behavior

3. Analyze results:
   - View cache contents and state
   - Monitor hit/miss statistics
   - Understand address mapping
   - Follow step-by-step explanations

## Development

- Run tests: `pytest tests/`
- Format code: `black .`
- Lint code: `pylint cache_simulator/`

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

## License

MIT License 