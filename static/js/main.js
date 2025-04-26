document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    
    // State variables
    let traceAddresses = [];
    let traceIndex = 0;
    let isTraceRunning = false;
    let currentConfig = null;

    // DOM Elements
    const configForm = document.getElementById('config-form');
    const cacheSizeInput = document.getElementById('cache-size');
    const blockSizeInput = document.getElementById('block-size');
    const associativitySelect = document.getElementById('associativity');
    const policySelect = document.getElementById('policy');
    const resetBtn = document.getElementById('reset-btn');

    const accessPanel = document.getElementById('access-panel');
    const addressInput = document.getElementById('address');
    const accessBtn = document.getElementById('access-btn');
    const traceInput = document.getElementById('trace');
    const runTraceBtn = document.getElementById('run-trace-btn');
    const stepTraceBtn = document.getElementById('step-trace-btn');
    const resetTraceBtn = document.getElementById('reset-trace-btn');
    const accessStatusDiv = document.getElementById('access-status');

    const visualPanel = document.getElementById('visual-panel');
    const cacheVisDiv = document.getElementById('cache-visualization');
    const statsPanel = document.getElementById('stats-panel');
    const statsDisplayDiv = document.getElementById('stats-display');
    const breakdownPanel = document.getElementById('breakdown-panel');
    const breakdownDisplayDiv = document.getElementById('address-breakdown-display');
    const loadingIndicator = document.getElementById('loading-indicator');

    // --- Helper Functions ---
    function showError(message) {
        accessStatusDiv.textContent = `Error: ${message}`;
        accessStatusDiv.className = 'access-status error'; // Add error class for styling
        console.error(message);
    }

    function showStatus(message, isHit) {
        accessStatusDiv.textContent = message;
        if (isHit !== undefined) {
            accessStatusDiv.className = isHit ? 'access-status hit' : 'access-status miss';
        }
    }

    function parseAddressInput(inputStr) {
        const trimmed = inputStr.trim();
        if (!trimmed) return null;
        try {
            return parseInt(trimmed); // Handles dec and hex (0x...)
        } catch (e) {
            return null;
        }
    }

    // --- Loading Indicator Functions ---
    function showLoading() {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
            // Restart animation by removing/adding class or changing animation name
            loadingIndicator.style.animation = 'none';
            void loadingIndicator.offsetWidth; // Trigger reflow
            loadingIndicator.style.animation = 'fadeInOut 0.5s ease';
        }
    }

    function hideLoading() {
        // The fadeOut is part of the animation, just hide after delay
        // We rely on the animation to fade it out.
        // setTimeout(() => {
        //     if (loadingIndicator) loadingIndicator.style.display = 'none';
        // }, 500); // Match animation duration
    }

    // --- API Call Functions ---
    async function apiCall(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        showLoading(); // Show loading indicator before fetch
        try {
            console.log(`API Call: ${method} ${endpoint}`, body || '');
            const response = await fetch(endpoint, options);
            const data = await response.json();
            console.log(`API Response: ${endpoint}`, data);
            if (!response.ok || !data.success) {
                throw new Error(data.error || `Request failed with status ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            showError(error.message);
            return null; // Indicate failure
        } finally {
            hideLoading(); // Hide loading indicator after fetch (in finally)
        }
    }

    async function configureCache() {
        const config = {
            size: cacheSizeInput.value,
            blockSize: blockSizeInput.value,
            associativity: associativitySelect.value,
            policy: policySelect.value
        };
        
        const result = await apiCall('/api/configure', 'POST', config);
        if (result) {
            currentConfig = result.config; // Store current config
            showStatus('Cache configured successfully.');
            resetVisualizationAndStats();
            updateVisualization(await getCacheState()); // Fetch initial state
            updateStats(await getCacheStats());
            // Show other panels
            accessPanel.style.display = 'block';
            visualPanel.style.display = 'block';
            statsPanel.style.display = 'block';
            resetTraceState(); // Reset trace when reconfiguring
            breakdownPanel.style.display = 'none'; // Hide on reconfigure until address entered
            breakdownDisplayDiv.innerHTML = '<p>Enter an address to see breakdown.</p>';
        }
    }

    async function resetCache() {
        const result = await apiCall('/api/reset', 'POST');
        if (result) {
            currentConfig = null;
            showStatus('Cache reset.');
            resetVisualizationAndStats();
            // Hide panels
            accessPanel.style.display = 'none';
            visualPanel.style.display = 'none';
            statsPanel.style.display = 'none';
            resetTraceState();
            breakdownPanel.style.display = 'none';
        }
    }

    async function accessCache(address) {
        if (currentConfig === null) {
            showError('Cache not configured.');
            return null;
        }
        const addrInt = parseAddressInput(address.toString());
        if (addrInt === null) {
            showError('Invalid address format.');
            return null;
        }

        const result = await apiCall('/api/access', 'POST', { address: addrInt });
        if (result && result.result) {
            const accessData = result.result;
            showStatus(`Address ${addrInt}: ${accessData.hit ? 'HIT' : 'MISS'}${accessData.evicted ? ' (Eviction: Tag 0x' + accessData.evicted.tag.toString(16) + ')' : ''}`, accessData.hit);
            updateVisualization(accessData.state, addrInt);
            updateStats(await getCacheStats()); // Fetch latest stats
            updateAddressBreakdown(address.toString()); // Update breakdown on access
            return accessData; // Return hit/miss info
        }
        return null;
    }

    async function getCacheState() {
        const result = await apiCall('/api/state');
        return result ? result.state : null;
    }

    async function getCacheStats() {
        const result = await apiCall('/api/stats');
        return result ? result.stats : null;
    }

    // --- Visualization Update ---
    function resetVisualizationAndStats() {
        cacheVisDiv.innerHTML = '';
        statsDisplayDiv.innerHTML = '<p>Configure cache to see stats.</p>';
        showStatus(''); // Clear status
    }

    function updateVisualization(state, accessedAddress = null) {
        if (!state || !state.sets) {
            cacheVisDiv.innerHTML = '<p>Cache not configured or state unavailable.</p>';
            return;
        }
        cacheVisDiv.innerHTML = ''; // Clear previous state
        
        let blockToHighlight = null;
        if (accessedAddress !== null && currentConfig) {
            // Calculate which block corresponds to the accessed address
             try {
                const { blockSize, numSets } = currentConfig;
                const offsetBits = Math.log2(blockSize);
                const indexBits = numSets > 1 ? Math.log2(numSets) : 0;
                const indexMask = numSets > 1 ? ((1 << indexBits) - 1) << offsetBits : 0;
                const setIndex = numSets > 1 ? (accessedAddress & indexMask) >> offsetBits : 0;
                
                // Find the way - requires knowing the tag which isn't directly here
                // We'll highlight the whole set for now, or the first block as a placeholder
                // A more accurate highlight requires returning the accessed way index from backend
                // Let's find the block by tag instead if possible
                const tagMask = (~((1 << (offsetBits + indexBits)) - 1)) >>> 0;
                const tag = (accessedAddress & tagMask) >>> (offsetBits + indexBits);

                const targetSet = state.sets[setIndex];
                if(targetSet) {
                    const wayIndex = targetSet.blocks.findIndex(b => b.valid && b.tag === tag);
                    if (wayIndex !== -1) {
                         blockToHighlight = { setIndex, wayIndex };
                    }
                    // If it was a miss and load, we need info about which way was chosen
                    // This logic needs refinement based on backend providing more context
                }

            } catch (e) {
                console.error("Error calculating highlight target:", e);
            }
        }

        state.sets.forEach((set, setIndex) => {
            const setDiv = document.createElement('div');
            setDiv.className = 'cache-set';
            
            const header = document.createElement('div');
            header.className = 'set-header';
            header.textContent = `Set ${setIndex}`;
            setDiv.appendChild(header);

            const blocksDiv = document.createElement('div');
            blocksDiv.className = 'cache-blocks';

            set.blocks.forEach((block, wayIndex) => {
                const blockDiv = document.createElement('div');
                blockDiv.className = `cache-block ${block.valid ? 'valid' : 'invalid'} ${block.dirty ? 'dirty' : ''}`;
                blockDiv.setAttribute('title', `Way ${wayIndex}`); // Tooltip for way index
                blockDiv.setAttribute('data-set', setIndex); // Add data attributes for targeting
                blockDiv.setAttribute('data-way', wayIndex);

                blockDiv.innerHTML = `
                    <span class="block-way-index">Way ${wayIndex}</span>
                    <span class="block-status">${block.valid ? 'Valid' : 'Invalid'}${block.dirty ? ' Dirty' : ''}</span>
                    <span class="block-tag">Tag: <span>${block.valid ? '0x' + block.tag.toString(16) : '---'}</span></span>
                    <!-- <span class="block-data">Data: ${block.valid && block.data ? block.data : '---'}</span> -->
                `;
                blocksDiv.appendChild(blockDiv);
            });
            setDiv.appendChild(blocksDiv);
            cacheVisDiv.appendChild(setDiv);
        });
    }

    function updateStats(stats) {
        if (!stats) {
            statsDisplayDiv.innerHTML = '<p>Stats unavailable.</p>';
            return;
        }
        statsDisplayDiv.innerHTML = `
            <p>Accesses: <span>${stats.totalAccesses}</span></p>
            <p>Hits: <span>${stats.hits}</span></p>
            <p>Misses: <span>${stats.misses}</span></p>
            <p>Evictions: <span>${stats.evictions}</span></p>
            <p>Hit Rate: <span>${(stats.hitRate * 100).toFixed(1)}%</span></p>
            <p>Miss Rate: <span>${(stats.missRate * 100).toFixed(1)}%</span></p>
        `;
    }
    
    // --- Trace Handling ---
    function resetTraceState() {
        traceAddresses = [];
        traceIndex = 0;
        isTraceRunning = false;
        traceInput.value = ''; // Clear textarea
        stepTraceBtn.disabled = true;
        runTraceBtn.disabled = true;
        console.log('Trace state reset');
    }

    function loadTrace() {
        const traceText = traceInput.value.trim();
        if (!traceText) {
            showError('Trace input is empty.');
            return false;
        }
        traceAddresses = traceText.split(',') .map(addr => addr.trim()).filter(addr => addr !== '');
        traceIndex = 0;
        isTraceRunning = false;
        if (traceAddresses.length === 0) {
             showError('No valid addresses found in trace.');
            return false;
        }
        stepTraceBtn.disabled = false;
        runTraceBtn.disabled = false;
        showStatus(`Trace loaded with ${traceAddresses.length} addresses.`);
        console.log('Trace loaded:', traceAddresses);
        return true;
    }

    async function stepTrace() {
        if (traceIndex >= traceAddresses.length) {
            showStatus('End of trace reached.');
            stepTraceBtn.disabled = true;
            runTraceBtn.disabled = true;
            isTraceRunning = false;
            return;
        }
        if (!currentConfig) { // Check if cache is configured
            showError('Cache not configured.');
            return;
        }

        stepTraceBtn.disabled = true; // Disable while processing
        runTraceBtn.disabled = true;
        const address = traceAddresses[traceIndex];
        showStatus(`Stepping trace: Accessing ${address}...`);
        await accessCache(address); // Wait for access to complete
        traceIndex++;
        
        if (traceIndex < traceAddresses.length) {
             stepTraceBtn.disabled = false; // Re-enable if not at end
             runTraceBtn.disabled = false;
        } else {
             showStatus('End of trace reached.');
        }
    }

    async function runTrace() {
        if (!loadTrace()) return; // Load/reload trace first
        if (!currentConfig) {
            showError('Cache not configured.');
            return;
        }

        isTraceRunning = true;
        stepTraceBtn.disabled = true;
        runTraceBtn.disabled = true;
        showStatus('Running trace...');

        while (isTraceRunning && traceIndex < traceAddresses.length) {
            const address = traceAddresses[traceIndex];
            showStatus(`Running trace: Accessing ${address} (${traceIndex + 1}/${traceAddresses.length})`);
            await accessCache(address); // Wait for access
            traceIndex++;
            await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for visualization
        }
        
        isTraceRunning = false;
        if (traceIndex >= traceAddresses.length) {
            showStatus('Trace completed.');
        } else {
            showStatus('Trace stopped.'); // If stopped manually (not implemented yet)
            stepTraceBtn.disabled = false; // Re-enable step if stopped mid-trace
            runTraceBtn.disabled = false;
        }
    }

    // --- Event Listeners ---
    configForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Configure button clicked');
        configureCache();
    });

    resetBtn.addEventListener('click', () => {
        console.log('Reset button clicked');
        resetCache();
    });

    accessBtn.addEventListener('click', () => {
        const address = addressInput.value;
        console.log('Access button clicked with address:', address);
        if (address) {
            accessCache(address);
        } else {
            showError('Please enter an address.');
        }
    });

    addressInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            accessBtn.click(); // Trigger access on Enter key
        }
        resetVisualizationAndStats();
        resetTraceState(); // Ensure trace controls are disabled initially
        breakdownPanel.style.display = 'none'; // Hide breakdown initially
    });

    stepTraceBtn.addEventListener('click', () => {
        console.log('Step Trace button clicked');
        stepTrace();
    });

    runTraceBtn.addEventListener('click', () => {
        console.log('Run Trace button clicked');
        runTrace();
    });

    resetTraceBtn.addEventListener('click', () => {
        console.log('Reset Trace button clicked');
        resetTraceState();
        showStatus('Trace reset.');
    });

    traceInput.addEventListener('input', () => {
        // Enable Run/Step buttons as soon as there's text
        const hasText = traceInput.value.trim().length > 0;
        runTraceBtn.disabled = !hasText;
        stepTraceBtn.disabled = !hasText;
        if (!hasText) {
            traceAddresses = [];
            traceIndex = 0;
        }
    });

    // --- Address Breakdown Logic ---
    function updateAddressBreakdown(addressStr) {
        if (!currentConfig || !addressStr) {
            breakdownDisplayDiv.innerHTML = '<p>Enter an address and configure the cache.</p>';
            breakdownPanel.style.display = 'none';
            return;
        }

        const addrInt = parseAddressInput(addressStr);
        if (addrInt === null) {
             breakdownDisplayDiv.innerHTML = '<p>Invalid address format.</p>';
             breakdownPanel.style.display = 'block'; // Show panel even with error
             return;
        }

        try {
            const { blockSize, numSets } = currentConfig;
            if (!blockSize || !numSets) {
                 throw new Error('Invalid cache configuration for breakdown.');
            }
            
            // Calculate bits (ensure block size and num sets are powers of 2)
            // Basic log2, requires power-of-2 sizes
            const offsetBits = Math.log2(blockSize);
            const indexBits = numSets > 1 ? Math.log2(numSets) : 0;
            
            if (!Number.isInteger(offsetBits) || !Number.isInteger(indexBits)) {
                 throw new Error('Block size and number of sets must be powers of 2 for accurate bit breakdown.');
            }

            const totalBits = 32; // Assuming 32-bit addresses for visualization
            const tagBits = totalBits - indexBits - offsetBits;

            if (tagBits < 0) {
                throw new Error('Invalid configuration: Too many index/offset bits.');
            }

            // Extract parts
            const offsetMask = (1 << offsetBits) - 1;
            const indexMask = numSets > 1 ? ((1 << indexBits) - 1) << offsetBits : 0;
            const tagMask = (~(indexMask | offsetMask)) >>> 0; // Use unsigned shift for correct mask

            const offset = addrInt & offsetMask;
            const index = numSets > 1 ? (addrInt & indexMask) >> offsetBits : 0;
            const tag = (addrInt & tagMask) >>> (indexBits + offsetBits); // Use unsigned shift

            // Display
            breakdownDisplayDiv.innerHTML = `
                <div class="breakdown-row">
                    <span class="breakdown-label">Address (Hex):</span>
                    <span class="breakdown-value">0x${addrInt.toString(16)}</span>
                </div>
                <div class="breakdown-row">
                    <span class="breakdown-label">Address (Dec):</span>
                    <span class="breakdown-value">${addrInt}</span>
                </div>
                <hr>
                <div class="breakdown-row">
                    <span class="breakdown-label">Tag:</span>
                    <span class="breakdown-value">0x${tag.toString(16)} <span class="breakdown-bits">(${tagBits} bits)</span></span>
                </div>
                <div class="breakdown-row">
                    <span class="breakdown-label">Index:</span>
                    <span class="breakdown-value">${index} <span class="breakdown-bits">(${indexBits} bits)</span></span>
                </div>
                <div class="breakdown-row">
                    <span class="breakdown-label">Offset:</span>
                    <span class="breakdown-value">0x${offset.toString(16)} <span class="breakdown-bits">(${offsetBits} bits)</span></span>
                </div>
            `;
            breakdownPanel.style.display = 'block';

        } catch (error) {
            console.error("Breakdown Error:", error);
            breakdownDisplayDiv.innerHTML = `<p>Error calculating breakdown: ${error.message}</p>`;
            breakdownPanel.style.display = 'block';
        }
    }

    // Function to highlight the specific block accessed
    function highlightBlock(setIndex, wayIndex) {
        // Remove previous highlights
        document.querySelectorAll('.block-highlight').forEach(el => el.classList.remove('block-highlight'));

        // Add highlight to the target block
        const targetBlock = cacheVisDiv.querySelector(`.cache-block[data-set="${setIndex}"][data-way="${wayIndex}"]`);
        if (targetBlock) {
            targetBlock.classList.add('block-highlight');
            // Remove the class after animation duration (optional, CSS handles removal via animation end state)
            // setTimeout(() => {
            //     targetBlock.classList.remove('block-highlight');
            // }, 800); // Match CSS animation duration
        }
    }

    // Initial state
    resetVisualizationAndStats();
    resetTraceState(); // Ensure trace controls are disabled initially
}); 