# Cache Memory Simulator (Web Interface)

An interactive web-based cache memory simulator developed for educational purposes at Texas A&M University at Qatar. It allows users to configure and visualize the behavior of direct-mapped, set-associative, and fully associative caches using LRU or FIFO replacement policies.

![TAMUQ Logo](static/img/tamuq-logo.png) <!-- Assuming logo is placed here -->

## Features

-   **Flexible Configuration:** Set total cache size, block size, associativity (direct, N-way, fully), and replacement policy (LRU, FIFO).
-   **Interactive Visualization:** See the cache structure (sets and blocks) update in real-time.
-   **Visual Feedback:** Blocks are color-coded (valid/invalid), show tag information, indicate dirty status with an icon, and flash on hit/miss.
-   **Memory Access:** Simulate individual memory accesses or run comma-separated address traces.
-   **Step-by-Step Trace:** Execute address traces one step at a time.
-   **Address Breakdown:** View the Tag, Index, and Offset components for any entered address based on the current configuration.
-   **Real-time Statistics:** Track accesses, hits, misses, evictions, hit rate, and miss rate.
-   **Responsive Design:** Adapts to different screen sizes.

## Setup

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd Memory-Cache-Simulator
    ```
2.  **Create and Activate Virtual Environment:**
    ```bash
    # Create the environment
    python -m venv .venv

    # Activate (Windows PowerShell)
    .venv\Scripts\Activate.ps1

    # Or Activate (Git Bash / Linux / macOS)
    # source .venv/bin/activate
    ```
3.  **Install Dependencies:**
    Install the package in editable mode along with development dependencies:
    ```bash
    pip install -e .[dev]
    ```
    *This installs Flask, Flask-Cors, and the dev tools listed in `setup.py`.*

4.  **Place Logo:**
    Ensure the TAMUQ logo file is present at `static/img/tamuq-logo.png`.

## Running the Simulator

1.  **Start the Flask Server:**
    ```bash
    python app.py
    ```
2.  **Open in Browser:**
    Navigate to `http://127.0.0.1:5000` (or the address provided in the terminal).

## Usage

1.  **Configure:** Use the form in the top-left panel to set cache parameters and click "Configure".
2.  **Access:**
    *   Enter a single address in the "Memory Access" panel and click "Access".
    *   Enter a comma-separated list of addresses in the "Address Trace" textarea.
        *   Click "Run Trace" to simulate all addresses automatically.
        *   Click "Step" to simulate one address at a time.
        *   Click "Reset Trace" to clear the trace state.
3.  **Observe:**
    *   Watch the "Cache Visualization" panel update.
    *   Hover over blocks for tooltips.
    *   View the hit/miss status below the access controls.
    *   Check the "Address Breakdown" panel.
    *   Monitor the "Statistics" panel.
4.  **Reset:** Click the main "Reset" button in the Configuration panel to clear the cache and start over.

## Development

-   **Run Tests:** `pytest tests/`
-   **Format Code:** `black .`
-   **Lint Code:** `pylint cache_simulator/ app.py`

## Project Structure

```
.
├── app.py                  # Flask web application
├── cache_simulator/        # Core simulation logic
│   ├── __init__.py
│   ├── cache.py
│   ├── policies.py
│   └── utils.py
├── static/
│   ├── css/style.css
│   ├── js/main.js
│   └── img/tamuq-logo.png  # <-- Place logo here
├── templates/
│   └── index.html
├── tests/
│   └── test_cache.py
├── .gitignore              # (Recommended)
├── README.md
├── requirements.txt        # Runtime dependencies
└── setup.py                # Package setup
```

## Credits

Developed by: **Ejmen Al-Ubejdij** & **Umair Gavankar** 