// Global state object
const state = {
    directoryData: null,
    currentContext: null,
    asciinemaPlayer: null,
    castPaths: null,
    currentPartIndex: 0,
    playbackSpeed: 2,
    loopMode: 'playall', // 'loop' or 'playall'
    timelineUpdateInterval: null,
    isScrubbing: false,
    resizeObserver: null
};

// Load and parse directory.json
async function loadDirectory() {
    try {
        const response = await fetch('directory.json');
        if (!response.ok) {
            throw new Error('Failed to load directory.json');
        }
        state.directoryData = await response.json();
        console.log('Directory loaded:', state.directoryData);
    } catch (error) {
        console.error('Error loading directory.json:', error);
        showError('Failed to load directory.json. Please check that the file exists and is valid JSON.');
    }
}

// Get current context from URL hash
function getContextFromHash() {
    const hash = window.location.hash.substring(1); // Remove the '#'
    return hash || 'home'; // Default to 'home' if no hash
}

// Set URL hash without triggering hashchange
function setHash(contextName) {
    if (window.location.hash.substring(1) !== contextName) {
        window.location.hash = contextName;
    }
}

// Display error message in content area
function showError(message) {
    const contentDiv = document.querySelector('.content');
    if (contentDiv) {
        contentDiv.innerHTML = `<p style="color: red; padding: 1rem;">${message}</p>`;
    }
}

// Load description HTML file
async function loadDescription(path) {
    const descriptionDiv = document.querySelector('.description');
    if (!descriptionDiv) return;

    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${path}`);
        }
        const html = await response.text();
        descriptionDiv.innerHTML = html;
        console.log('Description loaded:', path);
    } catch (error) {
        console.error('Error loading description:', error);
        descriptionDiv.innerHTML = `<p style="color: red; padding: 1rem;">"${path}" doesn't exist</p>`;
    }
}

// Transform context name for display (e.g., "docker-https-nginx" → "docker https nginx")
function transformContextName(name) {
    return name.replace(/-/g, ' ');
}

// Load footer grid navigation
function loadFooterGrid(contextItems) {
    const footerGrid = document.querySelector('.footer-grid');
    if (!footerGrid) return;

    // Clear existing items
    footerGrid.innerHTML = '';

    // Create clickable items for each context
    contextItems.forEach(contextName => {
        const item = document.createElement('div');
        item.className = 'footer-item';
        item.textContent = transformContextName(contextName);
        item.dataset.context = contextName;

        // Add click handler to switch contexts
        item.addEventListener('click', () => {
            loadContext(contextName);
        });

        footerGrid.appendChild(item);
    });

    console.log('Footer grid loaded with items:', contextItems);
}

// Highlight current context in footer
function highlightCurrentContext(contextName) {
    const footerItems = document.querySelectorAll('.footer-item');
    footerItems.forEach(item => {
        if (item.dataset.context === contextName) {
            item.style.border = '2px solid currentColor';
        } else {
            item.style.border = 'none';
        }
    });
}

// Load HTML content file
async function loadHTMLContent(path) {
    const contentDiv = document.querySelector('.content');
    if (!contentDiv) return;

    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${path}`);
        }
        const html = await response.text();
        contentDiv.innerHTML = html;
        console.log('HTML content loaded:', path);
    } catch (error) {
        console.error('Error loading HTML content:', error);
        contentDiv.innerHTML = `<p style="color: red; padding: 1rem;">"${path}" doesn't exist</p>`;
    }
}

// Scale asciinema player to fit within container (like object-fit: contain)
function scalePlayerToFit(playerContainer) {
    // Wait for player to fully render
    requestAnimationFrame(() => {
        setTimeout(() => {
            if (!playerContainer) {
                console.log('scalePlayerToFit: No container');
                return;
            }

            // Try to find the wrapper element - v3 may use different class names
            // Check for first child element (the actual player wrapper created by library)
            const wrapper = playerContainer.firstElementChild;
            if (!wrapper) {
                console.log('scalePlayerToFit: No wrapper element found');
                return;
            }

            console.log('scalePlayerToFit: Found wrapper:', wrapper.className);

            // Get container dimensions (available space)
            const containerWidth = playerContainer.offsetWidth;
            const containerHeight = playerContainer.offsetHeight;

            // Get actual player dimensions using scrollWidth/scrollHeight
            // Measure the wrapper itself since it contains the player
            const playerWidth = wrapper.scrollWidth || wrapper.offsetWidth || 665;
            const playerHeight = wrapper.scrollHeight || wrapper.offsetHeight || 555;

            console.log('scalePlayerToFit:', {
                containerWidth,
                containerHeight,
                playerWidth,
                playerHeight
            });

            // Calculate scale factor to fit within container
            // Use the smaller scale factor to ensure player fits both width AND height
            const scaleX = containerWidth / playerWidth;
            const scaleY = containerHeight / playerHeight;
            const scale = Math.min(scaleX, scaleY); // No multiplier - fit exactly

            console.log('scalePlayerToFit: Calculated scale:', scale);

            // Apply scaling to wrapper
            wrapper.style.transformOrigin = 'top center'; // Scale from top, not center
            wrapper.style.transform = `scale(${scale})`;
            wrapper.style.transformBox = 'fill-box';
            console.log('scalePlayerToFit: Applied scale transform');
        }, 250); // Delay to ensure asciinema library creates wrapper
    });
}

// Load a single .cast file into the player
async function loadCastFile(path, playerElement) {
    try {
        // Check if file exists first
        const response = await fetch(path, { method: 'HEAD' });
        if (!response.ok) {
            throw new Error(`Cast file not found: ${path}`);
        }

        // Create the asciinema player
        const player = AsciinemaPlayer.create(path, playerElement, {
            speed: state.playbackSpeed,
            controls: false, // We'll use custom controls
            autoPlay: true,
        });

        state.asciinemaPlayer = player;

        // Scale player to fit within container after it renders
        scalePlayerToFit(playerElement);

        console.log('Cast file loaded:', path);
        return player;
    } catch (error) {
        console.error('Error loading cast file:', error);
        playerElement.innerHTML = `<p style="color: red; padding: 1rem;">"${path}" doesn't exist</p>`;
        return null;
    }
}

// Toggle play/pause
function togglePlayPause(button) {
    if (!state.asciinemaPlayer) return;

    const icon = button.querySelector('img');
    const isPaused = icon.src.includes('play.svg');

    if (isPaused) {
        state.asciinemaPlayer.play();
        icon.src = 'icons/pause.svg';
    } else {
        state.asciinemaPlayer.pause();
        icon.src = 'icons/play.svg';
    }
}

// Toggle playback speed
async function toggleSpeed(button) {
    if (!state.asciinemaPlayer || !state.castPaths) return;

    const icon = button.querySelector('img');

    // Store current state
    const currentTime = state.asciinemaPlayer.getCurrentTime();
    const currentCastPath = state.castPaths[state.currentPartIndex];
    const playPauseIcon = document.querySelector('.play-pause img');
    const wasPlaying = playPauseIcon && !playPauseIcon.src.includes('play.svg');

    // Toggle between 2x and 4x
    if (state.playbackSpeed === 8) {
        state.playbackSpeed = 2;
        icon.src = 'icons/2x.svg';
    } else {
        state.playbackSpeed = 8;
        icon.src = 'icons/4x.svg';
    }

    console.log('Changing speed to:', state.playbackSpeed);

    // Recreate the player with new speed (asciinema doesn't support dynamic speed changes)
    await loadSingleCast(currentCastPath);

    // Seek to the previous position and resume playback if needed
    setTimeout(() => {
        if (state.asciinemaPlayer) {
            if (currentTime > 0) {
                state.asciinemaPlayer.seek(currentTime);
            }
            if (wasPlaying) {
                state.asciinemaPlayer.play();
            } else {
                state.asciinemaPlayer.pause();
            }
        }
    }, 100);
}

// Toggle loop mode
function toggleLoopMode(button) {
    const icon = button.querySelector('img');

    // Toggle between 'loop' and 'playall'
    if (state.loopMode === 'playall') {
        state.loopMode = 'loop';
        icon.src = 'icons/loop.svg';
    } else {
        state.loopMode = 'playall';
        icon.src = 'icons/playall.svg';
    }

    console.log('Loop mode:', state.loopMode);
}

// Transform part filename to readable name
// "1_docker-compose.cast" → "1. docker compose"
function transformPartName(filename) {
    // Remove path and .cast extension
    const name = filename.split('/').pop().replace('.cast', '');

    // Replace underscore with ". " and hyphens with spaces
    return name.replace(/_/g, '. ').replace(/-/g, ' ');
}

// Highlight current part in legend
function highlightCurrentPart() {
    const partItems = document.querySelectorAll('.part-item');
    partItems.forEach((item, index) => {
        if (index === state.currentPartIndex) {
            item.style.outline = '2px solid currentColor';
        } else {
            item.style.outline = 'none';
        }
    });
}

// Load a specific part by index
async function loadPart(index) {
    if (!state.castPaths || index < 0 || index >= state.castPaths.length) return;

    state.currentPartIndex = index;
    const playerDiv = document.getElementById('asciinema-player');

    if (playerDiv) {
        // Stop timeline updates during reload
        stopTimelineUpdates();

        // Clear and reload player
        playerDiv.innerHTML = '';
        await loadCastFile(state.castPaths[index], playerDiv);
        highlightCurrentPart();

        // Set up auto-advance for new player
        setupAutoAdvance();

        // Restart timeline updates
        startTimelineUpdates();
    }
}

// Set up auto-advance when current part ends
function setupAutoAdvance() {
    if (!state.asciinemaPlayer) return;

    // Listen for player end event
    state.asciinemaPlayer.addEventListener('ended', () => {
        console.log('Part ended, loop mode:', state.loopMode);

        if (state.loopMode === 'loop') {
            // Loop current part
            state.asciinemaPlayer.play();
        } else {
            // Play all - advance to next part
            const nextIndex = state.currentPartIndex + 1;

            if (nextIndex < state.castPaths.length) {
                // Load next part
                loadPart(nextIndex);
            } else {
                // Loop back to first part
                loadPart(0);
            }
        }
    });
}

// Build parts legend for multi-part content
function buildPartsLegend() {
    const partsDiv = document.getElementById('parts-legend');
    if (!partsDiv || !state.castPaths) return;

    // Clear existing parts
    partsDiv.innerHTML = '';

    // Only show legend if there are multiple parts
    if (state.castPaths.length <= 1) return;

    // Create part items
    state.castPaths.forEach((path, index) => {
        const partItem = document.createElement('div');
        partItem.className = 'part-item';
        partItem.textContent = transformPartName(path);
        partItem.dataset.index = index;

        // Add click handler
        partItem.addEventListener('click', () => {
            loadPart(index);
        });

        partsDiv.appendChild(partItem);
    });

    // Highlight current part
    highlightCurrentPart();

    console.log('Parts legend built for', state.castPaths.length, 'parts');
}

// Update timeline progress
function updateTimeline() {
    if (!state.asciinemaPlayer) return;

    const progressBar = document.querySelector('.timeline-progress');
    if (!progressBar) return;

    try {
        const currentTime = state.asciinemaPlayer.getCurrentTime();
        const duration = state.asciinemaPlayer.getDuration();

        if (duration > 0) {
            const progress = (currentTime / duration) * 100;
            progressBar.style.width = `${progress}%`;
        }
    } catch (error) {
        // Player might not have these methods yet
    }
}

// Start timeline updates
function startTimelineUpdates() {
    // Clear any existing interval
    if (state.timelineUpdateInterval) {
        clearInterval(state.timelineUpdateInterval);
    }

    // Update timeline every 100ms
    state.timelineUpdateInterval = setInterval(updateTimeline, 100);
}

// Stop timeline updates
function stopTimelineUpdates() {
    if (state.timelineUpdateInterval) {
        clearInterval(state.timelineUpdateInterval);
        state.timelineUpdateInterval = null;
    }
}

// Seek to position on timeline based on x coordinate
function seekToPosition(timeline, clientX) {
    if (!state.asciinemaPlayer) return;

    const rect = timeline.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));

    try {
        const duration = state.asciinemaPlayer.getDuration();
        const seekTime = duration * percentage;
        state.asciinemaPlayer.seek(seekTime);
    } catch (error) {
        console.error('Error seeking:', error);
    }
}

// Handle timeline mouse down
function handleTimelineMouseDown(event) {
    state.isScrubbing = true;
    const timeline = event.currentTarget;
    seekToPosition(timeline, event.clientX);
}

// Handle timeline mouse move
function handleTimelineMouseMove(event) {
    if (!state.isScrubbing) return;
    const timeline = event.currentTarget;
    seekToPosition(timeline, event.clientX);
}

// Handle timeline mouse up
function handleTimelineMouseUp() {
    state.isScrubbing = false;
}

// Handle timeline touch start
function handleTimelineTouchStart(event) {
    event.preventDefault(); // Prevent scrolling while scrubbing
    state.isScrubbing = true;
    const timeline = event.currentTarget;
    const touch = event.touches[0];
    seekToPosition(timeline, touch.clientX);
}

// Handle timeline touch move
function handleTimelineTouchMove(event) {
    if (!state.isScrubbing) return;
    event.preventDefault(); // Prevent scrolling while scrubbing
    const timeline = event.currentTarget;
    const touch = event.touches[0];
    seekToPosition(timeline, touch.clientX);
}

// Handle timeline touch end
function handleTimelineTouchEnd() {
    state.isScrubbing = false;
}

// Build timeline
function buildTimeline() {
    const timelineContainer = document.getElementById('timeline-container');
    if (!timelineContainer) return;

    // Clear any existing timeline
    timelineContainer.innerHTML = '';

    // Create timeline element
    const timeline = document.createElement('div');
    timeline.className = 'timeline';

    // Create progress bar
    const progress = document.createElement('div');
    progress.className = 'timeline-progress';

    timeline.appendChild(progress);
    timelineContainer.appendChild(timeline);

    // Add mouse event handlers for scrubbing
    timeline.addEventListener('mousedown', handleTimelineMouseDown);
    timeline.addEventListener('mousemove', handleTimelineMouseMove);
    timeline.addEventListener('mouseup', handleTimelineMouseUp);
    timeline.addEventListener('mouseleave', handleTimelineMouseUp); // Stop scrubbing if mouse leaves

    // Add touch event handlers for mobile scrubbing
    timeline.addEventListener('touchstart', handleTimelineTouchStart, { passive: false });
    timeline.addEventListener('touchmove', handleTimelineTouchMove, { passive: false });
    timeline.addEventListener('touchend', handleTimelineTouchEnd);
    timeline.addEventListener('touchcancel', handleTimelineTouchEnd);

    // Add global mouse up handler to stop scrubbing even if mouse released outside timeline
    document.addEventListener('mouseup', handleTimelineMouseUp);

    console.log('Timeline built');
}

// Build custom player controls
function buildPlayerControls() {
    const controlsDiv = document.getElementById('player-controls');
    if (!controlsDiv) return;

    // Clear any existing controls
    controlsDiv.innerHTML = '';

    // Create control buttons
    const controls = [
        { name: 'speed', icon: '2x.svg', handler: toggleSpeed },
        { name: 'play-pause', icon: 'pause.svg', handler: togglePlayPause },
        { name: 'loop-mode', icon: 'playall.svg', handler: toggleLoopMode }
    ];

    controls.forEach(control => {
        const button = document.createElement('button');
        button.className = `control-btn ${control.name}`;

        const icon = document.createElement('img');
        icon.src = `icons/${control.icon}`;
        icon.alt = control.name;

        button.appendChild(icon);
        button.addEventListener('click', () => control.handler(button));

        controlsDiv.appendChild(button);
    });

    console.log('Player controls built');
}

// Reset playback state when switching contexts
function resetPlaybackState() {
    // Stop timeline updates
    stopTimelineUpdates();

    // Stop scrubbing if in progress
    state.isScrubbing = false;

    // Disconnect resize observer
    if (state.resizeObserver) {
        state.resizeObserver.disconnect();
        state.resizeObserver = null;
    }

    // Stop and clear any existing player
    if (state.asciinemaPlayer) {
        // Remove all event listeners by setting to null
        state.asciinemaPlayer = null;
    }

    // Reset state
    state.castPaths = null;
    state.currentPartIndex = 0;
    state.playbackSpeed = 2;
    state.loopMode = 'playall';

    console.log('Playback state reset');
}

// Load asciinema content (single or multi-part)
async function loadAsciinemaContent(paths) {
    const contentDiv = document.querySelector('.content');
    if (!contentDiv) return;

    // Normalize paths to array
    const pathsArray = Array.isArray(paths) ? paths : [paths];

    // Build player container structure
    const container = document.createElement('div');
    container.className = 'asciinema-container';

    // Player div (top)
    const playerDiv = document.createElement('div');
    playerDiv.className = 'asciinema-player';
    playerDiv.id = 'asciinema-player';

    // Timeline div (second row)
    const timelineContainer = document.createElement('div');
    timelineContainer.className = 'timeline-container';
    timelineContainer.id = 'timeline-container';

    // Custom controls div (third row)
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'player-controls';
    controlsDiv.id = 'player-controls';

    // Parts legend div (bottom)
    const partsDiv = document.createElement('div');
    partsDiv.className = 'parts-legend';
    partsDiv.id = 'parts-legend';

    // Assemble container
    container.appendChild(playerDiv);
    container.appendChild(timelineContainer);
    container.appendChild(controlsDiv);
    container.appendChild(partsDiv);

    // Insert container into content
    contentDiv.innerHTML = '';
    contentDiv.appendChild(container);

    // Store paths array in state for later use
    state.castPaths = pathsArray;
    state.currentPartIndex = 0;

    // Load first part
    await loadCastFile(pathsArray[0], playerDiv);

    // Build timeline
    buildTimeline();

    // Build custom player controls
    buildPlayerControls();

    // Build parts legend (only if multiple parts)
    buildPartsLegend();

    // Set up auto-advance
    setupAutoAdvance();

    // Start timeline updates
    startTimelineUpdates();

    // Set up resize observer to re-scale on window resize
    if (state.resizeObserver) {
        state.resizeObserver.disconnect();
    }

    state.resizeObserver = new ResizeObserver(() => {
        const playerContainer = document.querySelector('.asciinema-player');
        if (playerContainer) {
            scalePlayerToFit(playerContainer);
        }
    });

    const observeContainer = document.querySelector('.asciinema-container');
    if (observeContainer) {
        state.resizeObserver.observe(observeContainer);
    }

    console.log('Asciinema container created for', pathsArray.length, 'part(s)');
}

// Load a specific context
async function loadContext(contextName) {
    console.log('Loading context:', contextName);

    // Check if directory is loaded
    if (!state.directoryData) {
        showError('Directory data not loaded yet');
        return;
    }

    // Check if context exists
    const contextData = state.directoryData[contextName];
    if (!contextData) {
        console.warn(`Context "${contextName}" not found, falling back to home`);
        // Fallback to home if context doesn't exist
        if (contextName !== 'home') {
            loadContext('home');
            return;
        }
        // If even home doesn't exist, show error
        showError(`Context "${contextName}" not found in directory.json`);
        return;
    }

    // Handle redirect/alias contexts
    if (contextData.redirect) {
        console.log(`Redirecting from "${contextName}" to "${contextData.redirect}"`);
        loadContext(contextData.redirect);
        return;
    }

    // Update state
    state.currentContext = contextName;

    // Update URL hash
    setHash(contextName);

    // Reset playback state (stops any playing asciinema, clears event listeners)
    resetPlaybackState();

    // Clear previous content
    const contentDiv = document.querySelector('.content');
    const descriptionDiv = document.querySelector('.description');
    if (contentDiv) contentDiv.innerHTML = '';
    if (descriptionDiv) descriptionDiv.innerHTML = '';

    // Load description
    if (contextData.description) {
        await loadDescription(contextData.description);
    }

    // Load footer grid navigation
    if (contextData['footer-grid']) {
        loadFooterGrid(contextData['footer-grid']);
        highlightCurrentContext(contextName);
    }

    // Update menu button based on context
    updateMenuButton(contextName);

    // Determine content type (array of .cast files vs single HTML file)
    const content = contextData.content;
    const isAsciinema = Array.isArray(content) || (typeof content === 'string' && content.endsWith('.cast'));

    console.log('Content type:', isAsciinema ? 'asciinema' : 'HTML');
    console.log('Content:', content);

    // Load content based on type
    if (isAsciinema) {
        // Load asciinema content
        await loadAsciinemaContent(content);
    } else {
        // Load HTML content
        await loadHTMLContent(content);
    }
}

// Handle hash changes (browser back/forward)
function handleHashChange() {
    const contextName = getContextFromHash();
    loadContext(contextName);
}

// Main initialization function
async function init() {
    console.log('Initializing resume website...');

    // Load directory.json
    await loadDirectory();

    // Set up hash change listener for browser back/forward
    window.addEventListener('hashchange', handleHashChange);

    // Load initial context from URL hash or default to 'home'
    const initialContext = getContextFromHash();
    loadContext(initialContext);
}

// Create popup menu
function createPopupMenu() {
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return null;

    // Create menu element
    const menu = document.createElement('div');
    menu.className = 'popup-menu hidden';
    menu.id = 'popup-menu';

    // Define menu items
    const menuItems = [
        //'troubleshooting-labs',
        //'windows-labs',
        //'networking-labs',
        //'linux-labs',
        //'home'
    ];

    // Create menu items
    menuItems.forEach(contextName => {
        const item = document.createElement('div');
        item.className = 'popup-menu-item';
        item.textContent = transformContextName(contextName);
        item.dataset.context = contextName;

        // Add click handler
        item.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event from bubbling
            loadContext(contextName);
            closePopupMenu();
        });

        menu.appendChild(item);
    });

    // Add menu to nav-menu
    navMenu.appendChild(menu);

    return menu;
}

// Toggle popup menu
function togglePopupMenu() {
    const menu = document.getElementById('popup-menu');
    if (!menu) return;

    const isHidden = menu.classList.contains('hidden');

    if (isHidden) {
        menu.classList.remove('hidden');
        // Add click listener to close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
        }, 0);
    } else {
        closePopupMenu();
    }
}

// Close popup menu
function closePopupMenu() {
    const menu = document.getElementById('popup-menu');
    if (!menu) return;

    menu.classList.add('hidden');
    document.removeEventListener('click', handleOutsideClick);
}

// Handle clicks outside the menu
function handleOutsideClick(e) {
    const menu = document.getElementById('popup-menu');
    const menuButton = document.querySelector('.menu-button');

    if (!menu || !menuButton) return;

    // Check if click is outside both menu and button
    if (!menu.contains(e.target) && !menuButton.contains(e.target)) {
        closePopupMenu();
    }
}

// Update menu button based on current context
function updateMenuButton(contextName) {
    const menuButton = document.querySelector('.menu-button');
    const navMenu = document.querySelector('.nav-menu');
    const footer = document.querySelector('footer');
    if (!menuButton) return;

    if (contextName === 'home') {
        // Home context: hide entire nav-menu container and adjust footer grid
        if (navMenu) navMenu.style.display = 'none';
        if (footer) footer.style.gridTemplateColumns = '1fr';
    } else {
        // Other contexts: show nav-menu and home icon, restore footer grid, close any open menu
        if (navMenu) navMenu.style.display = 'flex';
        if (footer) footer.style.gridTemplateColumns = 'auto 1fr';
        menuButton.style.display = 'block';
        menuButton.src = 'icons/home.svg';
        menuButton.alt = 'home-button';
        closePopupMenu(); // Close menu if it's open
    }
}

// Set up menu button click handler
function setupMenuButton() {
    const menuButton = document.querySelector('.menu-button');
    if (!menuButton) return;

    menuButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling

        // Check current context
        if (state.currentContext === 'home') {
            // In home: toggle popup menu
            togglePopupMenu();
        } else {
            // In other contexts: navigate to home
            loadContext('home');
        }
    });
}

// Run init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    init();
    createPopupMenu();
    setupMenuButton();
});
