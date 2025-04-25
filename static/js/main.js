// Global state
let currentMode = 'manual';
let currentSimulation = null;
let currentStep = 0;
let animationSpeed = 1000;
let showAddressBits = true;
let enableAnimations = true;
let currentCacheState = null;
let operationSteps = [];
let isAnimating = false;
let panZoomInstance = null;
let cacheStructure = null;
let blockSize = 60;
let padding = 10;
let isInitialized = false;

// Sample simulations
const sampleSimulations = {
    directMapped: {
        config: {
            size: '16B',
            blockSize: '4B',
            associativity: '1',
            policy: 'LRU'
        },
        steps: [
            {
                type: 'read',
                address: '0x00',
                description: 'First read access - this will be a compulsory miss'
            },
            {
                type: 'read',
                address: '0x04',
                description: 'Reading from the same block - this will be a hit'
            },
            {
                type: 'write',
                address: '0x40',
                description: 'Writing to a different block - this will cause an eviction'
            }
        ]
    },
    fullyAssociative: {
        config: {
            size: '16B',
            blockSize: '4B',
            associativity: 'fully',
            policy: 'LRU'
        },
        steps: [
            {
                type: 'read',
                address: '0x00',
                description: 'First read - compulsory miss'
            },
            {
                type: 'read',
                address: '0x20',
                description: 'Reading a different block - miss but no eviction needed'
            },
            {
                type: 'read',
                address: '0x40',
                description: 'Third read - miss but no eviction needed'
            },
            {
                type: 'read',
                address: '0x60',
                description: 'Fourth read - miss but no eviction needed'
            },
            {
                type: 'read',
                address: '0x80',
                description: 'Fifth read - miss, will cause LRU eviction'
            }
        ]
    },
    setAssociative: {
        config: {
            size: '32B',
            blockSize: '8B',
            associativity: '2',
            policy: 'LRU'
        },
        steps: [
            {
                type: 'read',
                address: '0x00',
                description: 'First read to set 0 - compulsory miss'
            },
            {
                type: 'read',
                address: '0x20',
                description: 'Second read to set 0 - miss but no eviction'
            },
            {
                type: 'write',
                address: '0x40',
                description: 'Write to set 1 - miss'
            },
            {
                type: 'read',
                address: '0x00',
                description: 'Re-read from set 0 - hit'
            },
            {
                type: 'write',
                address: '0x60',
                description: 'Write to set 1 - miss, will cause eviction'
            }
        ]
    }
};

// DOM Elements
const modeButtons = document.querySelectorAll('.mode-btn');
const samplesSection = document.getElementById('samples-section');
const sampleCards = document.querySelectorAll('.sample-card');
const simulationControls = document.getElementById('simulation-controls');
const prevButton = document.getElementById('prev-step');
const nextButton = document.getElementById('next-step');
const resetButton = document.getElementById('reset-simulation');
const stepDescription = document.getElementById('step-description');
const configForm = document.getElementById('config-form');
const manualModeSections = document.getElementById('manual-mode-sections');
const addressInput = document.getElementById('address');
const readButton = document.getElementById('read-btn');
const writeButton = document.getElementById('write-btn');
const traceInput = document.getElementById('trace');
const runTraceButton = document.getElementById('run-trace-btn');
const addressBitsDisplay = document.getElementById('address-bits-display');
const showBitsCheckbox = document.getElementById('show-bits');
const enableAnimationsCheckbox = document.getElementById('enable-animations');
const traceSpeedInput = document.getElementById('trace-speed');
const statsChart = document.getElementById('stats-chart');
const visualizationSection = document.getElementById('visualization-section');
const logSection = document.getElementById('log-section');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeUI();
        setupEventListeners();
        initializeChart();
        isInitialized = true;
    } catch (error) {
        console.error('Error during initialization:', error);
        showError('Failed to initialize application');
    }
});

function initializeUI() {
    // Ensure all required DOM elements exist
    const requiredElements = {
        'samples-section': samplesSection,
        'simulation-controls': simulationControls,
        'visualization-section': visualizationSection,
        'log-section': logSection,
        'manual-mode-sections': manualModeSections,
        'cache-diagram': document.getElementById('cache-diagram'),
        'cache-tooltip': document.getElementById('cache-tooltip')
    };

    for (const [name, element] of Object.entries(requiredElements)) {
        if (!element) {
            throw new Error(`Required element "${name}" not found`);
        }
    }

    // Hide all sections initially
    samplesSection.style.display = 'none';
    simulationControls.style.display = 'none';
    visualizationSection.style.display = 'none';
    logSection.style.display = 'none';
    
    // Show manual mode sections by default
    manualModeSections.style.display = 'block';
    
    // Set initial mode
    updateUIForMode('manual');
    
    // Initialize controls with null checks
    if (showBitsCheckbox) showBitsCheckbox.checked = showAddressBits;
    if (enableAnimationsCheckbox) enableAnimationsCheckbox.checked = enableAnimations;
    if (traceSpeedInput) traceSpeedInput.value = animationSpeed;
}

function setupEventListeners() {
    // Mode selection
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.mode;
            updateUIForMode(mode);
        });
    });

    // Sample simulation cards
    sampleCards.forEach(card => {
        card.addEventListener('click', () => {
            const simulationType = card.dataset.simulation;
            startSimulation(simulationType);
        });
    });

    // Simulation controls
    if (prevButton) prevButton.addEventListener('click', () => stepSimulation(-1));
    if (nextButton) nextButton.addEventListener('click', () => stepSimulation(1));
    if (resetButton) resetButton.addEventListener('click', resetSimulation);

    // Visualization controls
    if (showBitsCheckbox) {
        showBitsCheckbox.addEventListener('change', (e) => {
            showAddressBits = e.target.checked;
            updateAddressBitsDisplay();
        });
    }

    if (enableAnimationsCheckbox) {
        enableAnimationsCheckbox.addEventListener('change', (e) => {
            enableAnimations = e.target.checked;
        });
    }

    if (traceSpeedInput) {
        traceSpeedInput.addEventListener('input', (e) => {
            animationSpeed = parseInt(e.target.value);
        });
    }

    // Manual mode controls
    if (configForm) {
        configForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(configForm);
            
            // Get form values
            const size = formData.get('size');
            const blockSize = formData.get('blockSize');
            const associativity = formData.get('associativity');
            const policy = formData.get('policy');
            
            // Create config object
            const config = {
                size: size,
                blockSize: blockSize,
                associativity: associativity,
                policy: policy
            };
            
            console.log('Sending config:', config);
            
            configureCache(config)
                .then(() => {
                    visualizationSection.style.display = 'block';
                    logSection.style.display = 'block';
                })
                .catch(error => {
                    console.error('Error configuring cache:', error);
                    showError('Failed to configure cache: ' + error.message);
                });
        });
    }

    // Memory access controls
    if (readButton) {
        readButton.addEventListener('click', () => {
            const address = addressInput.value;
            if (address) {
                performRead(address);
            } else {
                showError('Please enter a valid address');
            }
        });
    }

    if (writeButton) {
        writeButton.addEventListener('click', () => {
            const address = addressInput.value;
            if (address) {
                performWrite(address);
            } else {
                showError('Please enter a valid address');
            }
        });
    }

    // Trace controls
    if (runTraceButton) {
        runTraceButton.addEventListener('click', () => {
            const traceText = traceInput.value.trim();
            if (traceText) {
                const addresses = traceText.split(',').map(addr => addr.trim());
                runAddressTrace(addresses);
            } else {
                showError('Please enter a valid address trace');
            }
        });
    }

    // Update visualization control listeners
    document.getElementById('zoom-in')?.addEventListener('click', () => {
        if (panZoomInstance) panZoomInstance.zoomIn();
    });
    
    document.getElementById('zoom-out')?.addEventListener('click', () => {
        if (panZoomInstance) panZoomInstance.zoomOut();
    });
    
    document.getElementById('reset-view')?.addEventListener('click', () => {
        if (panZoomInstance) {
            panZoomInstance.reset();
            panZoomInstance.fit();
            panZoomInstance.center();
        }
    });
}

function updateUIForMode(mode) {
    currentMode = mode;
    
    // Update mode buttons
    modeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Get manual mode sections
    const manualModeSections = document.getElementById('manual-mode-sections');
    
    // Update section visibility
    if (mode === 'manual') {
        samplesSection.style.display = 'none';
        simulationControls.style.display = 'none';
        if (manualModeSections) {
            manualModeSections.style.display = 'block';
        }
    } else {
        samplesSection.style.display = 'block';
        if (manualModeSections) {
            manualModeSections.style.display = 'none';
        }
    }
}

async function startSimulation(simulationType) {
    if (!isInitialized) {
        showError('Application not fully initialized');
        return;
    }

    try {
        currentSimulation = sampleSimulations[simulationType];
        if (!currentSimulation) {
            throw new Error(`Invalid simulation type: ${simulationType}`);
        }

        currentStep = 0;
        
        // Configure cache with simulation settings
        const config = { ...currentSimulation.config };
        
        // Ensure size values have units
        if (!config.size.endsWith('B')) config.size += 'B';
        if (!config.blockSize.endsWith('B')) config.blockSize += 'B';
        
        console.log('Starting simulation with config:', config);
        
        await configureCache(config);
        
        // Update UI elements
        simulationControls.style.display = 'block';
        visualizationSection.style.display = 'block';
        logSection.style.display = 'block';
        
        updateSimulationControls();
        updateStepDescription();
        
    } catch (error) {
        console.error('Error in startSimulation:', error);
        showError('Failed to start simulation: ' + error.message);
    }
}

function stepSimulation(direction) {
    if (!currentSimulation) return;

    currentStep += direction;
    currentStep = Math.max(0, Math.min(currentStep, currentSimulation.steps.length - 1));

    const step = currentSimulation.steps[currentStep];
    if (step.type === 'read') {
        performRead(step.address);
    } else {
        performWrite(step.address);
    }

    updateSimulationControls();
    updateStepDescription();
}

function updateSimulationControls() {
    prevButton.disabled = currentStep === 0;
    nextButton.disabled = currentStep === currentSimulation.steps.length - 1;
}

function updateStepDescription() {
    if (!currentSimulation || currentStep >= currentSimulation.steps.length) {
        stepDescription.textContent = '';
        return;
    }

    const step = currentSimulation.steps[currentStep];
    stepDescription.textContent = `Step ${currentStep + 1}: ${step.description}`;
}

function resetSimulation() {
    if (!currentSimulation) return;
    
    configureCache(currentSimulation.config)
        .then(() => {
            currentStep = 0;
            updateSimulationControls();
            updateStepDescription();
        });
}

// Cache Operations
async function configureCache(config) {
    try {
        console.log('Configuring cache with:', config);
        
        const response = await fetch('/api/configure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        const result = await response.json();
        console.log('Configuration response:', result);
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Configuration failed');
        }
        
        // Get the current cache state
        const stateResponse = await fetch('/api/state');
        const stateResult = await stateResponse.json();
        
        if (!stateResponse.ok || !stateResult.success) {
            throw new Error(stateResult.error || 'Failed to get cache state');
        }
        
        currentCacheState = stateResult.state;
        
        // Show the visualization and log sections
        visualizationSection.style.display = 'block';
        logSection.style.display = 'block';
        
        // Show the access section for manual mode
        const accessSection = document.getElementById('access-section');
        if (accessSection) {
            accessSection.style.display = 'block';
        }
        
        // Initialize visualization
        initializeCacheVisualization(result.config);
        
        // Update cache display with initial state
        updateCacheDisplay(stateResult.state);
        
        // Initialize stats
        await updateStats();
        
        // Reset any existing animations
        clearAnimations();
        
        // Reset the access log
        const accessLog = document.getElementById('access-log');
        if (accessLog) {
            accessLog.innerHTML = '';
        }
        
        // Reset address input
        const addressInput = document.getElementById('address');
        if (addressInput) {
            addressInput.value = '';
        }
        
        // Reset trace input
        const traceInput = document.getElementById('trace');
        if (traceInput) {
            traceInput.value = '';
        }
        
        return result;
    } catch (error) {
        console.error('Error configuring cache:', error);
        showError(error.message || 'Failed to configure cache');
        throw error;
    }
}

async function performRead(address) {
    // Parse address consistently
    const parsedAddress = address.startsWith('0x') ? parseInt(address.slice(2), 16) : parseInt(address);
    if (isNaN(parsedAddress)) {
        showError('Invalid address format');
        return;
    }

    await visualizeOperation(parsedAddress, false);
    try {
        const response = await fetch('/api/access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                address: parsedAddress,
                isWrite: false
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Read operation failed');
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Read operation failed');
        }
        
        const accessResult = {
            operation: 'read',
            address: `0x${parsedAddress.toString(16).toUpperCase().padStart(8, '0')}`,
            hit: result.result.hit,
            evicted: result.result.evicted !== null,
            evictedIndex: 0,
            setIndex: 0
        };
        
        await animateAccess(accessResult);
        updateCacheDisplay(result.result.state);
        
        // Update stats
        await updateStats();
        
        addLogEntry(accessResult);
        return accessResult;
    } catch (error) {
        console.error('Error performing read:', error);
        showError('Failed to perform read operation: ' + error.message);
    }
}

async function performWrite(address) {
    // Parse address consistently
    const parsedAddress = address.startsWith('0x') ? parseInt(address.slice(2), 16) : parseInt(address);
    if (isNaN(parsedAddress)) {
        showError('Invalid address format');
        return;
    }

    await visualizeOperation(parsedAddress, true);
    try {
        const response = await fetch('/api/access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                address: parsedAddress,
                isWrite: true
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Write operation failed');
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Write operation failed');
        }
        
        const accessResult = {
            operation: 'write',
            address: `0x${parsedAddress.toString(16).toUpperCase().padStart(8, '0')}`,
            hit: result.result.hit,
            evicted: result.result.evicted !== null,
            evictedIndex: 0,
            setIndex: 0
        };
        
        await animateAccess(accessResult);
        updateCacheDisplay(result.result.state);
        
        // Update stats
        await updateStats();
        
        addLogEntry(accessResult);
        return accessResult;
    } catch (error) {
        console.error('Error performing write:', error);
        showError('Failed to perform write operation: ' + error.message);
    }
}

// Visualization
function updateCacheDisplay(cacheState) {
    if (!cacheState) {
        console.error('Invalid cache state provided');
        return;
    }

    try {
        currentCacheState = cacheState;
        
        // Update cache visualization if initialized
        if (isInitialized && document.getElementById('cache-diagram')) {
            updateCacheVisualization(cacheState);
        }
        
        // Update statistics display
        updateStats(cacheState.stats);
        
    } catch (error) {
        console.error('Error updating cache display:', error);
        showError('Failed to update cache display');
    }
}

function updateCacheVisualization(cacheState) {
    if (!cacheStructure || !cacheState) {
        console.error('Cache structure or state not initialized');
        return;
    }

    try {
        const { sets } = cacheState;
        
        sets.forEach((set, setIndex) => {
            set.blocks.forEach((block, blockIndex) => {
                const blockElement = document.querySelector(
                    `[data-set-index="${setIndex}"][data-block-index="${blockIndex}"]`
                );
                
                if (blockElement) {
                    // Update block state
                    blockElement.classList.remove('valid', 'invalid', 'dirty');
                    blockElement.classList.add(block.valid ? 'valid' : 'invalid');
                    if (block.dirty) blockElement.classList.add('dirty');
                    
                    // Update block content
                    const content = formatBlockContent(block);
                    blockElement.querySelector('.block-content').textContent = content;
                    
                    // Update tooltip data
                    blockElement.setAttribute('data-tooltip', formatTooltipContent(block));
                }
            });
        });
        
    } catch (error) {
        console.error('Error updating cache visualization:', error);
    }
}

function formatBlockContent(block) {
    if (!block) return 'Empty';
    
    const tag = block.tag ? block.tag.toString(16).padStart(4, '0') : '----';
    const data = block.data ? formatData(block.data) : '--------';
    
    return `${tag}:${data}`;
}

function formatTooltipContent(block) {
    if (!block) return 'Empty block';
    
    return `Tag: 0x${block.tag ? block.tag.toString(16).padStart(4, '0') : '----'}
Data: ${block.data ? formatData(block.data) : '--------'}
Valid: ${block.valid ? 'Yes' : 'No'}
Dirty: ${block.dirty ? 'Yes' : 'No'}`;
}

function formatData(data) {
    if (!data) return '--------';
    
    // Handle both string and numeric data
    const dataStr = typeof data === 'string' ? data : data.toString(16);
    return dataStr.padStart(8, '0');
}

function parseAddress(address) {
    try {
        // Ensure address is a number
        const numAddress = typeof address === 'string' ? parseInt(address, 16) : address;
        
        // Get cache configuration
        const { indexBits, offsetBits } = currentCacheState.config;
        
        // Calculate masks
        const indexMask = (1 << indexBits) - 1;
        const offsetMask = (1 << offsetBits) - 1;
        
        // Extract components
        const blockOffset = numAddress & offsetMask;
        const setIndex = (numAddress >> offsetBits) & indexMask;
        const tag = numAddress >> (indexBits + offsetBits);
        
        return { setIndex, blockIndex: 0, blockOffset, tag };
    } catch (error) {
        console.error('Error parsing address:', error);
        return { setIndex: 0, blockIndex: 0, blockOffset: 0, tag: 0 };
    }
}

function animateAccess(result) {
    if (!enableAnimations || !result) return;
    
    try {
        const { address, hit, evicted, loaded } = result;
        const { setIndex, blockIndex } = parseAddress(address);
        
        // Remove any existing animations
        clearAnimations();
        
        const blockElement = document.querySelector(
            `[data-set-index="${setIndex}"][data-block-index="${blockIndex}"]`
        );
        
        if (!blockElement) {
            console.warn('Block element not found for animation');
            return;
        }
        
        // Determine animation type
        let animationType = hit ? 'hit' : 'miss';
        if (evicted) animationType = 'evict';
        if (loaded) animationType = 'load';
        
        // Apply animation
        blockElement.classList.add(animationType);
        
        // Remove animation after completion
        setTimeout(() => {
            if (blockElement.parentNode) {
                blockElement.classList.remove(animationType);
            }
        }, animationSpeed);
        
    } catch (error) {
        console.error('Error during access animation:', error);
    }
}

function clearAnimations() {
    try {
        const animatedElements = document.querySelectorAll('.hit, .miss, .evict, .load');
        animatedElements.forEach(element => {
            ['hit', 'miss', 'evict', 'load'].forEach(className => {
                element.classList.remove(className);
            });
        });
    } catch (error) {
        console.error('Error clearing animations:', error);
    }
}

function updateAddressBitsDisplay(address, cacheConfig) {
    const container = document.querySelector('.address-bits-display');
    if (!container || !address) return;

    const offsetBits = Math.log2(cacheConfig.blockSize);
    const indexBits = Math.log2(cacheConfig.numSets);
    const tagBits = 32 - offsetBits - indexBits;

    const addressBin = parseInt(address, 16).toString(2).padStart(32, '0');
    const tag = addressBin.slice(0, tagBits);
    const index = addressBin.slice(tagBits, tagBits + indexBits);
    const offset = addressBin.slice(tagBits + indexBits);

    container.innerHTML = `
        <div class="address-bits-title">Address Breakdown</div>
        <div class="address-breakdown">
            <div class="bit-group tag">
                <div class="bit-label">Tag (${tagBits} bits)</div>
                <div class="bit-value">${tag}</div>
            </div>
            <div class="bit-group index">
                <div class="bit-label">Index (${indexBits} bits)</div>
                <div class="bit-value">${index}</div>
            </div>
            <div class="bit-group offset">
                <div class="bit-label">Offset (${offsetBits} bits)</div>
                <div class="bit-value">${offset}</div>
            </div>
        </div>
    `;
}

// Statistics
function initializeChart() {
    const ctx = statsChart.getContext('2d');
    window.cacheChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Hit Rate',
                data: [],
                borderColor: '#4caf50',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1
                }
            }
        }
    });
}

async function updateStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get statistics');
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to get statistics');
        }
        
        const stats = result.stats;
        
        // Calculate rates
        const totalAccesses = stats.totalAccesses || 0;
        const hits = stats.hits || 0;
        const misses = stats.misses || 0;
        const evictions = stats.evictions || 0;
        const hitRate = totalAccesses > 0 ? (hits / totalAccesses * 100).toFixed(2) : '0.00';
        const missRate = totalAccesses > 0 ? (misses / totalAccesses * 100).toFixed(2) : '0.00';

        // Update DOM elements
        const elements = {
            'total-accesses': totalAccesses,
            'hits': hits,
            'misses': misses,
            'evictions': evictions,
            'hit-rate': `${hitRate}%`
        };

        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        }

        // Update stats grid
        const statsContainer = document.querySelector('.stats-container');
        if (statsContainer) {
            // Clear existing stats
            statsContainer.innerHTML = '';

            // Create stats grid
            const statsGrid = document.createElement('div');
            statsGrid.className = 'stats-grid';

            // Create stat cards
            const cards = [
                { label: 'Hit Rate', value: `${hitRate}%` },
                { label: 'Miss Rate', value: `${missRate}%` },
                { label: 'Total Accesses', value: totalAccesses },
                { label: 'Hits', value: hits },
                { label: 'Misses', value: misses },
                { label: 'Evictions', value: evictions }
            ];

            cards.forEach(({ label, value }) => {
                const card = createStatCard(label, value);
                statsGrid.appendChild(card);
            });

            // Add the stats grid to the container
            statsContainer.appendChild(statsGrid);
        }

        // Update chart if it exists
        if (window.cacheChart) {
            window.cacheChart.data.labels.push(totalAccesses);
            window.cacheChart.data.datasets[0].data.push(parseFloat(hitRate));
            window.cacheChart.update();
        }

        return { totalAccesses, hits, misses, evictions, hitRate, missRate };
    } catch (error) {
        console.error('Error updating statistics:', error);
        showError('Failed to update statistics: ' + error.message);
    }
}

function createStatCard(label, value) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    
    const labelElement = document.createElement('div');
    labelElement.className = 'stat-label';
    labelElement.textContent = label;
    
    const valueElement = document.createElement('div');
    valueElement.className = 'stat-value';
    valueElement.textContent = value;
    
    card.appendChild(labelElement);
    card.appendChild(valueElement);
    
    return card;
}

function updateStatsChart(stats) {
    const chartContainer = document.querySelector('.stats-chart');
    if (!chartContainer) return;

    // Clear existing chart
    chartContainer.innerHTML = '';

    // Create canvas for the chart
    const canvas = document.createElement('canvas');
    canvas.id = 'statsChart';
    chartContainer.appendChild(canvas);

    // Calculate rates
    const totalAccesses = stats.totalAccesses || 0;
    const hits = stats.hits || 0;
    const hitRate = totalAccesses > 0 ? (hits / totalAccesses * 100) : 0;
    const missRate = 100 - hitRate;

    // Create the chart using Chart.js
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Hit Rate', 'Miss Rate'],
            datasets: [{
                label: 'Cache Performance',
                data: [hitRate, missRate],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 99, 132, 0.6)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Percentage (%)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Cache Performance Metrics'
                }
            }
        }
    });
}

// Utility Functions
function addLogEntry(result) {
    const log = document.getElementById('access-log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${result.hit ? 'hit' : 'miss'}`;
    
    entry.innerHTML = `
        <span class="log-operation">${result.operation.toUpperCase()}</span>
        <span class="log-address">${result.address}</span>
        <span class="log-result">${result.hit ? 'HIT' : 'MISS'}${result.evicted ? ' (Eviction)' : ''}</span>
    `;
    
    log.insertBefore(entry, log.firstChild);
    if (log.children.length > 100) {
        log.removeChild(log.lastChild);
    }
}

function showError(message) {
    console.error(message);
    
    try {
        const existingError = document.querySelector('.error-message');
        if (existingError && existingError.parentNode) {
            existingError.parentNode.removeChild(existingError);
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        if (document.body) {
            document.body.appendChild(errorDiv);
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 3000);
        }
    } catch (error) {
        console.error('Error showing error message:', error);
    }
}

function getCurrentCacheState() {
    return currentCacheState;
}

// Helper function to parse size strings (e.g., "1KB", "64B")
function parseSize(sizeStr) {
    const value = parseInt(sizeStr);
    if (sizeStr.includes('KB')) {
        return value * 1024;
    } else if (sizeStr.includes('MB')) {
        return value * 1024 * 1024;
    } else if (sizeStr.includes('GB')) {
        return value * 1024 * 1024 * 1024;
    } else {
        return value;
    }
}

// Function to run a sequence of addresses
async function runAddressTrace(addresses) {
    for (const address of addresses) {
        await performRead(address);
        await new Promise(resolve => setTimeout(resolve, animationSpeed));
    }
}

function generateOperationSteps(address, isWrite, cacheConfig) {
    const { blockSize, numSets } = cacheConfig;
    const addressBin = parseInt(address, 16).toString(2).padStart(32, '0');
    const offsetBits = Math.log2(blockSize);
    const indexBits = Math.log2(numSets);
    const tagBits = 32 - offsetBits - indexBits;

    return [
        {
            step: 1,
            description: 'Calculate address components',
            details: {
                tag: addressBin.slice(0, tagBits),
                index: addressBin.slice(tagBits, tagBits + indexBits),
                offset: addressBin.slice(tagBits + indexBits)
            }
        },
        {
            step: 2,
            description: 'Check cache for matching tag',
            details: {
                setIndex: parseInt(addressBin.slice(tagBits, tagBits + indexBits), 2),
                tag: parseInt(addressBin.slice(0, tagBits), 2)
            }
        },
        {
            step: 3,
            description: 'Determine cache hit/miss',
            details: {}  // Will be filled during execution
        },
        {
            step: 4,
            description: isWrite ? 'Write data to cache' : 'Read data from cache',
            details: {}  // Will be filled during execution
        }
    ];
}

async function visualizeOperation(address, isWrite) {
    if (isAnimating) return;
    isAnimating = true;
    
    // Reset current step
    currentStep = 0;
    
    // Update operation details
    document.getElementById('current-operation').textContent = isWrite ? 'WRITE' : 'READ';
    document.getElementById('current-address').textContent = `0x${address.toString(16).toUpperCase()}`;
    
    // Generate steps for this operation
    const cacheConfig = await getCacheConfig();
    operationSteps = generateOperationSteps(address, isWrite, cacheConfig);
    
    // Initialize step list
    const stepList = document.querySelector('.step-list');
    stepList.innerHTML = '';
    operationSteps.forEach(step => {
        const stepItem = document.createElement('div');
        stepItem.className = 'step-item';
        stepItem.innerHTML = `
            <div class="step-number">${step.step}</div>
            <div class="step-description">${step.description}</div>
        `;
        stepList.appendChild(stepItem);
    });
    
    // Execute steps with animation
    for (let i = 0; i < operationSteps.length; i++) {
        await executeStep(i, address, isWrite);
    }
    
    isAnimating = false;
}

async function executeStep(stepIndex, address, isWrite) {
    const step = operationSteps[stepIndex];
    currentStep = stepIndex;
    
    // Update progress bar
    const progress = ((stepIndex + 1) / operationSteps.length) * 100;
    document.querySelector('.progress-bar').style.width = `${progress}%`;
    
    // Highlight current step
    document.querySelectorAll('.step-item').forEach((item, index) => {
        item.classList.toggle('active', index === stepIndex);
    });
    
    // Execute step-specific animations
    switch (step.step) {
        case 1:
            // Highlight address breakdown
            updateAddressBitsDisplay(address, await getCacheConfig());
            await animateHighlight('#address-bits-display');
            break;
            
        case 2:
            // Highlight relevant cache set
            const setIndex = step.details.setIndex;
            await animateHighlight(`.cache-set[data-set-index="${setIndex}"]`);
            break;
            
        case 3:
            // Animate cache check result
            const result = await checkCacheHit(address);
            step.details.hit = result.hit;
            document.getElementById('operation-status').textContent = 
                result.hit ? 'Cache Hit' : 'Cache Miss';
            await animateAccessResult(result);
            break;
            
        case 4:
            // Animate data transfer
            await animateDataTransfer(step.details.hit, isWrite);
            break;
    }
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 1000));
}

async function animateHighlight(selector) {
    const element = document.querySelector(selector);
    if (!element) return;
    
    element.classList.add('highlight-block');
    await new Promise(resolve => setTimeout(resolve, 500));
    element.classList.remove('highlight-block');
}

async function animateDataTransfer(isHit, isWrite) {
    const dataPath = document.querySelector('.data-path');
    if (!dataPath) return;
    
    const transfer = document.createElement('div');
    transfer.className = 'data-transfer';
    dataPath.appendChild(transfer);
    
    await new Promise(resolve => {
        transfer.addEventListener('animationend', () => {
            transfer.remove();
            resolve();
        });
    });
}

async function animateAccessResult(result) {
    const animation = document.createElement('div');
    animation.className = `access-result ${result.hit ? 'hit' : 'miss'}`;
    animation.textContent = result.hit ? 'HIT' : 'MISS';
    document.body.appendChild(animation);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    animation.remove();
}

// Helper function to get cache configuration
async function getCacheConfig() {
    const response = await fetch('/api/state');
    const data = await response.json();
    return {
        blockSize: data.state.blockSize,
        numSets: data.state.sets.length,
        waysPerSet: data.state.sets[0].blocks.length
    };
}

// Helper function to check if address results in cache hit
async function checkCacheHit(address) {
    const response = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, isWrite: false })
    });
    const data = await response.json();
    return {
        hit: data.result.hit,
        evicted: data.result.evicted !== null
    };
}

// Cache Visualization
function initializeCacheVisualization(config) {
    const svg = document.getElementById('cache-diagram');
    if (!svg) {
        console.error('Cache diagram SVG element not found');
        return;
    }

    try {
        // Clear existing content
        svg.innerHTML = '';
        
        // Calculate dimensions
        const numSets = config.numSets;
        const waysPerSet = config.waysPerSet;
        const svgWidth = (waysPerSet * (blockSize + padding)) + (padding * 2);
        const svgHeight = (numSets * (blockSize + padding)) + (padding * 2);
        
        // Set SVG attributes
        svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        
        // Create cache structure
        cacheStructure = createCacheStructure(svg, numSets, waysPerSet);
        
        // Clean up existing pan-zoom instance
        if (panZoomInstance) {
            try {
                panZoomInstance.destroy();
            } catch (error) {
                console.error('Error destroying previous pan-zoom instance:', error);
            }
        }
        
        // Initialize SVG Pan Zoom
        if (window.svgPanZoom) {
            panZoomInstance = window.svgPanZoom(svg, {
                zoomEnabled: true,
                controlIconsEnabled: true,
                fit: true,
                center: true,
                minZoom: 0.5,
                maxZoom: 2,
                zoomScaleSensitivity: 0.1
            });
            
            // Add resize handler
            const resizeHandler = () => {
                if (panZoomInstance) {
                    panZoomInstance.resize();
                    panZoomInstance.fit();
                    panZoomInstance.center();
                }
            };
            
            window.removeEventListener('resize', resizeHandler);
            window.addEventListener('resize', resizeHandler);
        } else {
            console.warn('SVG Pan Zoom library not loaded');
        }
    } catch (error) {
        console.error('Error initializing cache visualization:', error);
        showError('Failed to initialize visualization');
    }
}

function createCacheStructure(svg, numSets, waysPerSet) {
    const structure = [];
    
    for (let setIndex = 0; setIndex < numSets; setIndex++) {
        const setGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        setGroup.classList.add('cache-set-group');
        setGroup.setAttribute('transform', `translate(${padding}, ${setIndex * (blockSize + padding) + padding})`);
        
        const blocks = [];
        for (let wayIndex = 0; wayIndex < waysPerSet; wayIndex++) {
            const block = createCacheBlock(wayIndex * (blockSize + padding), 0, setIndex, wayIndex);
            blocks.push(block);
            setGroup.appendChild(block.group);
        }
        
        svg.appendChild(setGroup);
        structure.push({ setGroup, blocks });
    }
    
    return structure;
}

function createCacheBlock(x, y, setIndex, wayIndex) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('cache-block-group');
    group.setAttribute('transform', `translate(${x}, ${y})`);
    
    // Create block rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.classList.add('cache-block-rect');
    rect.setAttribute('width', blockSize);
    rect.setAttribute('height', blockSize);
    rect.setAttribute('rx', '4');
    
    // Create text elements
    const texts = {
        tag: createText('', 10, 20),
        valid: createText('', 10, 35),
        data: createText('', 10, 50)
    };
    
    // Add hover effects
    group.addEventListener('mouseenter', () => showBlockTooltip(setIndex, wayIndex));
    group.addEventListener('mouseleave', hideBlockTooltip);
    
    // Append elements
    group.appendChild(rect);
    Object.values(texts).forEach(text => group.appendChild(text));
    
    return { group, rect, texts };
}

function createText(content, x, y) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.classList.add('cache-block-text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.textContent = content;
    return text;
}

function showBlockTooltip(setIndex, wayIndex) {
    const tooltip = document.getElementById('cache-tooltip');
    if (!tooltip || !cacheStructure) return;
    
    const block = cacheStructure[setIndex]?.blocks[wayIndex];
    if (!block) return;
    
    const rect = block.rect.getBoundingClientRect();
    const container = document.querySelector('.visualization-container');
    const containerRect = container.getBoundingClientRect();
    
    tooltip.style.display = 'block';
    tooltip.style.left = `${rect.left - containerRect.left + rect.width}px`;
    tooltip.style.top = `${rect.top - containerRect.top}px`;
    
    // Update tooltip content
    tooltip.querySelector('.tooltip-header').textContent = `Set ${setIndex}, Way ${wayIndex}`;
    tooltip.querySelector('.tooltip-content').innerHTML = `
        <div>Tag: ${block.texts.tag.textContent}</div>
        <div>Status: ${block.texts.valid.textContent}</div>
        <div>Data: ${block.texts.data.textContent}</div>
    `;
}

function hideBlockTooltip() {
    const tooltip = document.getElementById('cache-tooltip');
    if (tooltip) tooltip.style.display = 'none';
} 