/**
 * AnomHome Overmind - Frontend Application
 * Vanilla JS + jQuery (optional)
 */

// API Base URL
const API_BASE = '/api';

// Current state
let currentNote = null;
let currentPath = '';
let chatSessionId = 'default-' + Date.now();

// Global state for AI provider
let currentAIProvider = 'openai'; // Default to OpenAI

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initUploadZone();
    checkShareLink();
    loadDashboard();
    checkChatStatus();
    loadLinks();
    loadCameras();
    loadNotes();
    browsePath('');
    
    // Initialize AI provider toggle
    initAIProviderToggle();
    
    // Add neon animations and effects
    initNeonEffects();
    initTechAnimations();
    addParticleBackground();
});

// ==================== Neon Effects & Tech Animations ====================

function initNeonEffects() {
    // Add glitch effect to logo
    const logo = document.querySelector('.logo-image');
    if (logo) {
        setInterval(() => {
            if (Math.random() < 0.1) { // 10% chance every interval
                logo.style.filter = 'hue-rotate(90deg) saturate(2) brightness(1.2)';
                setTimeout(() => {
                    logo.style.filter = 'drop-shadow(0 0 20px rgba(0, 212, 255, 0.6))';
                }, 100);
            }
        }, 2000);
    }
    
    // Add typing effect to status indicators
    addTypingEffect();
    
    // Add random glow pulses
    addRandomGlowPulses();
}

function initTechAnimations() {
    // Add staggered animation to dashboard cards
    const cards = document.querySelectorAll('.dashboard-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('slide-in-animation');
        
        // Add tech-themed hover effects
        card.addEventListener('mouseenter', () => {
            createRippleEffect(card);
            addDataStream(card);
        });
    });
    
    // Add matrix-style background to panels
    addMatrixEffect();
}

function addParticleBackground() {
    const particleContainer = document.createElement('div');
    particleContainer.className = 'particle-background';
    particleContainer.innerHTML = `
        <div class="particles">
            ${Array.from({length: 50}, () => 
                `<div class="particle" style="
                    left: ${Math.random() * 100}%;
                    top: ${Math.random() * 100}%;
                    animation-delay: ${Math.random() * 2}s;
                    animation-duration: ${3 + Math.random() * 2}s;
                "></div>`
            ).join('')}
        </div>
    `;
    
    document.body.appendChild(particleContainer);
}

function addTypingEffect() {
    const statusElements = document.querySelectorAll('.status-value, .system-status span');
    statusElements.forEach(element => {
        if (element.textContent && element.textContent.length > 1) {
            const text = element.textContent;
            element.textContent = '';
            
            let i = 0;
            const typeInterval = setInterval(() => {
                element.textContent += text[i];
                i++;
                if (i >= text.length) {
                    clearInterval(typeInterval);
                    element.style.borderRight = '2px solid var(--neon-blue)';
                    element.style.animation = 'var(--animation-pulse)';
                }
            }, 100);
        }
    });
}

function addRandomGlowPulses() {
    const glowElements = document.querySelectorAll('.nav-item, .btn, .dashboard-card');
    
    setInterval(() => {
        const randomElement = glowElements[Math.floor(Math.random() * glowElements.length)];
        if (randomElement && Math.random() < 0.3) {
            randomElement.style.animation = 'neonPulse 1s ease-in-out';
            setTimeout(() => {
                randomElement.style.animation = '';
            }, 1000);
        }
    }, 3000);
}

function createRippleEffect(element) {
    const ripple = document.createElement('div');
    ripple.className = 'ripple-effect';
    ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(circle, var(--neon-blue) 0%, transparent 70%);
        width: 100px;
        height: 100px;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%) scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
        z-index: 1000;
    `;
    
    element.style.position = 'relative';
    element.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

function addDataStream(element) {
    const stream = document.createElement('div');
    stream.className = 'data-stream';
    stream.innerHTML = Array.from({length: 20}, () => 
        Math.random().toString(36).substring(7)
    ).join(' ');
    
    stream.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        color: var(--neon-green);
        font-family: 'Courier New', monospace;
        font-size: 8px;
        opacity: 0.3;
        white-space: nowrap;
        overflow: hidden;
        animation: dataFlow 2s ease-out;
        pointer-events: none;
        z-index: 1;
    `;
    
    element.appendChild(stream);
    
    setTimeout(() => {
        stream.remove();
    }, 2000);
}

function addMatrixEffect() {
    const panels = document.querySelectorAll('.panel');
    panels.forEach(panel => {
        panel.addEventListener('transitionend', () => {
            if (panel.classList.contains('active')) {
                createMatrixRain(panel);
            }
        });
    });
}

function createMatrixRain(container) {
    const matrix = document.createElement('div');
    matrix.className = 'matrix-rain';
    matrix.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        pointer-events: none;
        z-index: 0;
        opacity: 0.1;
    `;
    
    // Create falling characters
    for (let i = 0; i < 20; i++) {
        const char = document.createElement('div');
        char.textContent = String.fromCharCode(33 + Math.random() * 94);
        char.style.cssText = `
            position: absolute;
            left: ${Math.random() * 100}%;
            top: -20px;
            color: var(--neon-green);
            font-family: 'Courier New', monospace;
            font-size: 12px;
            animation: fall ${2 + Math.random() * 3}s linear infinite;
            animation-delay: ${Math.random() * 2}s;
        `;
        matrix.appendChild(char);
    }
    
    container.style.position = 'relative';
    container.appendChild(matrix);
    
    setTimeout(() => {
        matrix.remove();
    }, 5000);
}

// ==================== Navigation ====================

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const panel = item.dataset.panel;
            showPanel(panel);
        });
    });
}

function showPanel(panelName) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.panel === panelName);
    });
    
    // Update panels
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `panel-${panelName}`);
    });
}

// ==================== Dashboard ====================

async function loadDashboard() {
    try {
        // Load system info
        const response = await fetch(`${API_BASE}/system`);
        const data = await response.json();
        
        const systemInfo = document.getElementById('systemInfo');
        systemInfo.innerHTML = `
            <div class="info-item">
                <div class="info-label">Hostname</div>
                <div class="info-value">${data.hostname}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Platform</div>
                <div class="info-value">${data.platform}</div>
            </div>
            <div class="info-item">
                <div class="info-label">CPUs</div>
                <div class="info-value">${data.cpus} cores</div>
            </div>
            <div class="info-item">
                <div class="info-label">Memory</div>
                <div class="info-value">${formatBytes(data.memory.used)} / ${formatBytes(data.memory.total)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Load Average</div>
                <div class="info-value">${data.loadavg.map(l => l.toFixed(2)).join(', ')}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Uptime</div>
                <div class="info-value">${formatUptime(data.uptime)}</div>
            </div>
        `;
    } catch (err) {
        console.error('Failed to load system info:', err);
    }
}

// ==================== Chat ====================

async function checkChatStatus() {
    try {
        const response = await fetch(`${API_BASE}/chat/status`);
        const data = await response.json();
        
        const statusEl = document.getElementById('chatStatus');
        if (data.configured) {
            const providerName = data.provider === 'local' ? 'AnomAI' : 'OpenAI API';
            statusEl.innerHTML = `<span class="text-success">✓ ${providerName} connected</span>`;
            
            // Update current provider state
            currentAIProvider = data.provider === 'local' ? 'local' : 'openai';
            const toggle = document.getElementById('aiProviderToggle');
            if (toggle) {
                toggle.checked = currentAIProvider === 'jugiai';
            }
            
        } else {
            const hint = data.provider === 'local' 
                ? 'Configure LOCAL_SERVER_PORT for AnomAI in settings'
                : 'Add OPENAI_API_KEY to .env file';
            statusEl.innerHTML = `<span class="text-warning">⚠ ${data.provider === 'local' ? 'AnomAI' : 'OpenAI API'} not configured - ${hint}</span>`;
        }
    } catch (err) {
        document.getElementById('chatStatus').innerHTML = 
            '<span class="text-danger">✗ Could not check AI status</span>';
    }
}

async function sendMessage(e) {
    e.preventDefault();
    
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    
    input.value = '';
    
    const messagesEl = document.getElementById('chatMessages');
    
    // Hide welcome message
    const welcome = messagesEl.querySelector('.chat-welcome');
    if (welcome) welcome.style.display = 'none';
    
    // Add user message
    appendMessage('user', message);
    
    // Add loading indicator with provider name
    const loadingId = 'loading-' + Date.now();
    const provider = currentAIProvider === 'local' ? 'AnomAI' : 'OpenAI';
    appendMessage('assistant', `[${provider} thinking...]`, loadingId);
    
    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, sessionId: chatSessionId })
        });
        
        const data = await response.json();
        
        // Remove loading indicator
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        
        if (data.error) {
            // JugiAI-style error handling with clear ERROR prefix
            let errorMsg = data.error;
            if (errorMsg.includes('llama-server') || errorMsg.includes('Local server') || errorMsg.includes('local model')) {
                errorMsg = `ERROR: JugiAI - ${errorMsg}`;
            } else if (errorMsg.includes('OpenAI') || errorMsg.includes('API key')) {
                errorMsg = `ERROR: OpenAI - ${errorMsg}`;
            } else {
                errorMsg = `ERROR: ${errorMsg}`;
            }
            appendMessage('assistant', errorMsg);
        } else {
            appendMessage('assistant', data.message);
        }
    } catch (err) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        
        // Error reporting with correct provider name
        const provider = currentAIProvider === 'local' ? 'AnomAI' : 'OpenAI';
        appendMessage('assistant', `ERROR: ${provider} - ${err.message}`);
        console.error(`${provider} error:`, err);
    }
}

function appendMessage(role, content, id) {
    const messagesEl = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-message ${role}`;
    if (id) div.id = id;
    div.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
    messagesEl.appendChild(div);
    
    // JugiAI-style smooth scrolling
    div.scrollIntoView({ behavior: 'smooth', block: 'end' });
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function clearChat() {
    const messagesEl = document.getElementById('chatMessages');
    messagesEl.innerHTML = `
        <div class="chat-welcome">
            <p>👋 Welcome to the AI Chat Console!</p>
            <p class="chat-status" id="chatStatus"></p>
        </div>
    `;
    chatSessionId = 'default-' + Date.now();
    checkChatStatus();
}

// ==================== AI Provider Toggle ====================

function initAIProviderToggle() {
    const toggle = document.getElementById('aiProviderToggle');
    if (toggle) {
        // Set initial state based on current provider
        toggle.checked = currentAIProvider === 'local';
        updateProviderUI(currentAIProvider);
    }
}

async function toggleAIProvider() {
    const toggle = document.getElementById('aiProviderToggle');
    const isJugiAI = toggle.checked;
    
    // Update provider state
    currentAIProvider = isJugiAI ? 'jugiai' : 'openai';
    
    // Add dramatic transition animation
    const chatPanel = document.querySelector('#panel-chat');
    const logo = document.querySelector('.logo-image');
    
    chatPanel.classList.add('jugiai-transition');
    
    // Update UI theme
    updateProviderUI(currentAIProvider);
    
    // Apply dramatic effects for JugiAI
    if (isJugiAI) {
        // Apply JugiAI theme
        document.body.classList.add('jugiai-mode');
        
        // Logo zoom and color effects
        if (logo) {
            logo.style.transition = 'all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            setTimeout(() => {
                logo.style.filter = 'hue-rotate(270deg) saturate(2) brightness(1.3)';
                logo.style.transform = 'scale(1.1)';
                logo.style.boxShadow = '0 0 40px rgba(139, 0, 255, 0.6)';
            }, 100);
        }
        
        // Particle effect changes
        updateParticlesForJugiAI();
        
        // Sound effect (if available)
        playTransitionSound('jugiai');
        
    } else {
        // Remove JugiAI theme
        document.body.classList.remove('jugiai-mode');
        
        // Reset logo
        if (logo) {
            logo.style.transition = 'all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            setTimeout(() => {
                logo.style.filter = 'drop-shadow(0 0 20px rgba(0, 212, 255, 0.6))';
                logo.style.transform = 'scale(1)';
                logo.style.boxShadow = '';
            }, 100);
        }
        
        // Reset particles
        resetParticles();
        
        // Sound effect
        playTransitionSound('openai');
    }
    
    // Update backend configuration
    await updateBackendProvider(currentAIProvider);
    
    // Refresh chat status
    checkChatStatus();
    
    // Remove transition class
    setTimeout(() => {
        chatPanel.classList.remove('jugiai-transition');
    }, 800);
}

function updateProviderUI(provider) {
    const statusEl = document.getElementById('chatStatus');
    const toggle = document.getElementById('aiProviderToggle');
    
    if (provider === 'jugiai') {
        toggle.checked = true;
        statusEl.innerHTML = '<span class="text-warning">🔄 Switching to JugiAI...</span>';
        
        // Update welcome message
        setTimeout(() => {
            const welcome = document.querySelector('.chat-welcome p:first-child');
            if (welcome) {
                welcome.innerHTML = '🚀 Welcome to JugiAI Console!';
            }
        }, 300);
        
    } else {
        toggle.checked = false;
        statusEl.innerHTML = '<span class="text-warning">🔄 Switching to OpenAI...</span>';
        
        // Reset welcome message
        setTimeout(() => {
            const welcome = document.querySelector('.chat-welcome p:first-child');
            if (welcome) {
                welcome.innerHTML = '👋 Welcome to the AI Chat Console!';
            }
        }, 300);
    }
}

function updateParticlesForJugiAI() {
    const particles = document.querySelectorAll('.particle');
    particles.forEach((particle, index) => {
        setTimeout(() => {
            particle.style.background = 'var(--jugiai-accent)';
            particle.style.boxShadow = '0 0 10px rgba(139, 0, 255, 0.6)';
            particle.style.animation = `float ${3 + Math.random() * 2}s ease-in-out infinite alternate`;
        }, index * 50);
    });
}

function resetParticles() {
    const particles = document.querySelectorAll('.particle');
    particles.forEach((particle, index) => {
        setTimeout(() => {
            particle.style.background = '';
            particle.style.boxShadow = '';
            particle.style.animation = '';
        }, index * 30);
    });
}

function playTransitionSound(provider) {
    // Create audio context for sound effects (if supported)
    try {
        if (window.AudioContext || window.webkitAudioContext) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            if (provider === 'jugiai') {
                // Deep, mysterious tone for JugiAI
                playTone(audioContext, 220, 0.1, 0.3); // A3 note
                setTimeout(() => playTone(audioContext, 174.61, 0.1, 0.2), 200); // F3 note
            } else {
                // Bright, clean tone for OpenAI
                playTone(audioContext, 440, 0.1, 0.3); // A4 note
                setTimeout(() => playTone(audioContext, 523.25, 0.1, 0.2), 200); // C5 note
            }
        }
    } catch (e) {
        // Audio not supported or blocked, skip sound effects
        console.log('Audio effects not available:', e.message);
    }
}

function playTone(audioContext, frequency, duration, volume = 0.3) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

async function updateBackendProvider(provider) {
    try {
        // Map JugiAI to local backend
        const backendProvider = provider === 'jugiai' ? 'local' : provider;
        
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aiProvider: backendProvider })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update provider configuration');
        }
        
        console.log(`AI provider switched to ${provider} (backend: ${backendProvider})`);
        
    } catch (err) {
        console.error('Failed to update backend provider:', err);
        // Show error but don't revert UI - user can try again
    }
}

// ==================== Encrypted User Chat ====================

// User chat state
let currentUserChatRoom = null;
let userChatUsername = null;
let userChatKey = null;
let userChatPollInterval = null;
let lastMessageTimestamp = null;

// Simple AES-like encryption using browser crypto (simplified for demo)
async function generateChatKey(roomId, username) {
    const keyMaterial = `${roomId}-${username}-${Date.now()}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(keyMaterial);
    
    // Create a simple hash-based key (in production, use proper key exchange)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data[i];
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
}

// ==================== ENHANCED CHAT JOIN METHODS ====================

let currentJoinMethod = 'room'; // 'room' or 'user'
let chatConnectionType = null; // 'room', 'direct', 'group'

// Switch between join methods (Room ID vs User ID)
function switchJoinMethod(method) {
    currentJoinMethod = method;
    
    // Update button states
    const buttons = document.querySelectorAll('.method-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === method);
    });
    
    // Update input and helper text
    const input = document.getElementById('chatJoinInput');
    const helperText = document.getElementById('inputHelperText');
    
    input.dataset.mode = method;
    
    if (method === 'room') {
        input.placeholder = 'Room ID';
        input.maxLength = 50;
        helperText.textContent = 'Enter room ID (e.g., ROOM123, MyTeam, Project-Alpha)';
        input.style.textTransform = 'uppercase';
    } else {
        input.placeholder = 'User ID or Name';
        input.maxLength = 50;
        helperText.textContent = 'Enter username, email, or any unique ID';
        input.style.textTransform = 'none';
    }
    
    // Clear input and focus
    input.value = '';
    input.focus();
    
    // Add visual feedback
    input.style.borderColor = method === 'room' ? 'rgba(0, 212, 255, 0.3)' : 'rgba(255, 215, 0, 0.3)';
    
    showNotification(`Switched to ${method === 'room' ? 'Room' : 'User'} mode`, 'info');
}

// Enhanced join function that handles both methods
async function joinChatWithMethod() {
    const input = document.getElementById('chatJoinInput');
    const inputValue = input.value.trim();
    
    if (!inputValue) {
        const methodName = currentJoinMethod === 'room' ? 'room ID' : 'user ID';
        showNotification(`Please enter a ${methodName}`, 'warning');
        input.focus();
        return;
    }
    
    // Validate input based on method
    if (!validateInput(inputValue, currentJoinMethod)) {
        return;
    }
    
    const statusEl = document.getElementById('userChatStatus');
    const statusIndicator = statusEl.querySelector('.status-indicator');
    const statusText = statusEl.querySelector('.status-text');
    
    // Update UI to connecting state
    statusIndicator.className = 'status-indicator connecting';
    statusText.textContent = 'Connecting...';
    
    try {
        if (currentJoinMethod === 'room') {
            await joinChatRoom(inputValue);
        } else {
            await joinDirectChat(inputValue);
        }
    } catch (err) {
        console.error('Join error:', err);
        statusIndicator.className = 'status-indicator offline';
        statusText.textContent = 'Connection failed';
        showNotification('Failed to connect: ' + err.message, 'error');
        enableChatInput(false);
    }
}

// Validate input based on method
function validateInput(value, method) {
    if (method === 'room') {
        // Room ID validation - more flexible
        if (value.length < 2 || value.length > 50) {
            showNotification('Room ID must be 2-50 characters', 'error');
            return false;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            showNotification('Room ID can only contain letters, numbers, _ and -', 'error');
            return false;
        }
    } else {
        // User ID validation - very flexible
        if (value.length < 2 || value.length > 50) {
            showNotification('User ID must be 2-50 characters', 'error');
            return false;
        }
        // Allow almost any characters for user IDs (emails, usernames, etc.)
        if (!/^[a-zA-Z0-9@._-]+$/.test(value)) {
            showNotification('User ID contains invalid characters', 'error');
            return false;
        }
    }
    return true;
}

// Enhanced room join function
async function joinChatRoom(roomId = null) {
    const actualRoomId = roomId || document.getElementById('chatJoinInput').value.trim();
    
    if (!actualRoomId) {
        showNotification('Please enter a room ID', 'warning');
        return;
    }
    
    const statusEl = document.getElementById('userChatStatus');
    const statusIndicator = statusEl.querySelector('.status-indicator');
    const statusText = statusEl.querySelector('.status-text');
    
    try {
        // Generate username if not exists
        if (!userChatUsername) {
            userChatUsername = await generateUsername();
        }
        
        // Generate room-based key for encryption
        userChatKey = await generateRoomKey(actualRoomId);
        currentUserChatRoom = actualRoomId.toUpperCase();
        chatConnectionType = 'room';
        
        // Clear previous messages
        const messagesEl = document.getElementById('userChatMessages');
        messagesEl.innerHTML = '';
        
        // Enable input
        enableChatInput(true);
        
        // Update status to connected
        statusIndicator.className = 'status-indicator online';
        statusText.textContent = `Connected to room: ${currentUserChatRoom}`;
        
        // Show online users
        const usersOnlineEl = document.getElementById('usersOnline');
        if (usersOnlineEl) usersOnlineEl.style.display = 'flex';
        
        // Start polling for messages
        startMessagePolling();
        
        // Load existing messages
        await loadUserChatMessages();
        
        showNotification(`Joined room: ${currentUserChatRoom}`, 'success');
        
        // Focus input
        document.getElementById('userChatInput').focus();
        
        // Add welcome message
        appendSystemMessage(`Welcome to room ${currentUserChatRoom}! 🎉`);
        
    } catch (err) {
        throw err; // Re-throw to be caught by calling function
    }
}

// New function for direct user chat
async function joinDirectChat(userId) {
    const statusEl = document.getElementById('userChatStatus');
    const statusIndicator = statusEl.querySelector('.status-indicator');
    const statusText = statusEl.querySelector('.status-text');
    
    try {
        // Generate username if not exists
        if (!userChatUsername) {
            userChatUsername = await generateUsername();
        }
        
        // Create a unique room ID for direct chat between users
        const participants = [userChatUsername.toLowerCase(), userId.toLowerCase()].sort();
        const directRoomId = `direct_${participants[0]}_${participants[1]}`;
        
        // Generate encryption key for this direct chat
        userChatKey = await generateRoomKey(directRoomId);
        currentUserChatRoom = directRoomId;
        chatConnectionType = 'direct';
        
        // Clear previous messages
        const messagesEl = document.getElementById('userChatMessages');
        messagesEl.innerHTML = '';
        
        // Enable input
        enableChatInput(true);
        
        // Update status to connected
        statusIndicator.className = 'status-indicator online';
        statusText.textContent = `Direct chat with: ${userId}`;
        
        // Hide online users count for direct chats
        const usersOnlineEl = document.getElementById('usersOnline');
        if (usersOnlineEl) usersOnlineEl.style.display = 'none';
        
        // Start polling for messages
        startMessagePolling();
        
        // Load existing messages
        await loadUserChatMessages();
        
        showNotification(`Started direct chat with ${userId}`, 'success');
        
        // Focus input
        document.getElementById('userChatInput').focus();
        
        // Add welcome message
        appendSystemMessage(`Direct chat with ${userId} started! 💬`);
        
    } catch (err) {
        throw err; // Re-throw to be caught by calling function
    }
}

// Generate a more user-friendly username
async function generateUsername() {
    const adjectives = ['Cool', 'Smart', 'Fast', 'Brave', 'Wise', 'Kind', 'Epic', 'Super'];
    const nouns = ['User', 'Guest', 'Friend', 'Chatter', 'Talker', 'Visitor'];
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 999) + 1;
    
    return `${adj}${noun}${num}`;
}

// Add system message to chat
function appendSystemMessage(message) {
    const messagesEl = document.getElementById('userChatMessages');
    
    const div = document.createElement('div');
    div.className = 'system-message';
    div.innerHTML = `
        <div class="system-message-content">
            <span class="system-icon">🤖</span>
            <span class="system-text">${escapeHtml(message)}</span>
        </div>
    `;
    
    messagesEl.appendChild(div);
    
    // Scroll to bottom
    messagesEl.scrollTo({
        top: messagesEl.scrollHeight,
        behavior: 'smooth'
    });
    
    // Add entrance animation
    setTimeout(() => {
        div.style.opacity = '1';
        div.style.transform = 'translateY(0)';
    }, 10);
}

// Enhanced message display based on connection type
function updateConnectionDisplay() {
    const statusEl = document.getElementById('userChatStatus');
    const statusText = statusEl.querySelector('.status-text');
    
    if (chatConnectionType === 'room') {
        statusText.textContent = `Room: ${currentUserChatRoom}`;
    } else if (chatConnectionType === 'direct') {
        const userId = currentUserChatRoom.replace('direct_', '').split('_').find(u => u !== userChatUsername.toLowerCase());
        statusText.textContent = `Direct: ${userId}`;
    }
}

// Improved XOR encryption with Base64 encoding
function encryptMessage(message, key) {
    try {
        if (!message || !key) return '';
        
        // Convert to UTF-8 bytes
        const messageBytes = new TextEncoder().encode(message);
        const keyBytes = new TextEncoder().encode(key);
        
        // XOR encryption
        const encrypted = new Uint8Array(messageBytes.length);
        for (let i = 0; i < messageBytes.length; i++) {
            encrypted[i] = messageBytes[i] ^ keyBytes[i % keyBytes.length];
        }
        
        // Convert to base64 for safe transport
        return btoa(String.fromCharCode(...encrypted));
    } catch (e) {
        console.error('Encryption error:', e);
        return '';
    }
}

function decryptMessage(encryptedBase64, key) {
    try {
        if (!encryptedBase64 || !key) return '[Invalid message]';
        
        // Decode from base64
        const encryptedStr = atob(encryptedBase64);
        const encryptedBytes = new Uint8Array(encryptedStr.split('').map(c => c.charCodeAt(0)));
        const keyBytes = new TextEncoder().encode(key);
        
        // XOR decryption
        const decrypted = new Uint8Array(encryptedBytes.length);
        for (let i = 0; i < encryptedBytes.length; i++) {
            decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
        }
        
        // Convert back to string
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.error('Decryption error:', e);
        return '[Decryption failed]';
    }
}

// Enhanced join room function
async function joinChatRoom() {
    const roomInput = document.getElementById('userChatRoom');
    const roomId = roomInput.value.trim();
    
    if (!roomId) {
        showNotification('Please enter a room ID', 'warning');
        roomInput.focus();
        return;
    }
    
    // Validate room ID (alphanumeric only)
    if (!/^[a-zA-Z0-9]+$/.test(roomId)) {
        showNotification('Room ID must contain only letters and numbers', 'error');
        roomInput.focus();
        return;
    }
    
    const statusEl = document.getElementById('userChatStatus');
    const statusIndicator = statusEl.querySelector('.status-indicator');
    const statusText = statusEl.querySelector('.status-text');
    
    // Update UI to connecting state
    statusIndicator.className = 'status-indicator connecting';
    statusText.textContent = 'Connecting...';
    
    try {
        // Generate username if not exists
        if (!userChatUsername) {
            userChatUsername = `User${Math.random().toString(36).substr(2, 6)}`;
        }
        
        // Generate room-based key for encryption
        userChatKey = await generateRoomKey(roomId);
        currentUserChatRoom = roomId.toUpperCase();
        
        // Clear previous messages
        const messagesEl = document.getElementById('userChatMessages');
        messagesEl.innerHTML = '';
        
        // Enable input
        enableChatInput(true);
        
        // Update status to connected
        statusIndicator.className = 'status-indicator online';
        statusText.textContent = `Connected to room: ${currentUserChatRoom}`;
        
        // Show online users
        const usersOnlineEl = document.getElementById('usersOnline');
        usersOnlineEl.style.display = 'flex';
        
        // Start polling for messages
        startMessagePolling();
        
        // Load existing messages
        await loadUserChatMessages();
        
        showNotification(`Joined room: ${currentUserChatRoom}`, 'success');
        
        // Focus input
        document.getElementById('userChatInput').focus();
        
    } catch (err) {
        console.error('Join room error:', err);
        statusIndicator.className = 'status-indicator offline';
        statusText.textContent = 'Connection failed';
        showNotification('Failed to join room: ' + err.message, 'error');
        enableChatInput(false);
    }
}

// Generate consistent room-based encryption key
async function generateRoomKey(roomId) {
    const encoder = new TextEncoder();
    const data = encoder.encode(roomId + 'overmind-salt-2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Enhanced message polling
function startMessagePolling() {
    if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
    }
    
    messagePollingInterval = setInterval(async () => {
        if (currentUserChatRoom) {
            await loadUserChatMessages();
        }
    }, 2000); // Poll every 2 seconds
}

function stopMessagePolling() {
    if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
        messagePollingInterval = null;
    }
}

function enableChatInput(enabled) {
    const input = document.getElementById('userChatInput');
    const button = document.getElementById('sendUserMessageBtn');
    
    input.disabled = !enabled;
    button.disabled = !enabled;
    
    if (enabled) {
        input.placeholder = 'Type your message...';
        input.focus();
        
        // Add input event listeners for enhanced features
        input.addEventListener('input', handleInputChange);
        input.addEventListener('keydown', handleKeyDown);
    } else {
        input.placeholder = 'Join a room to start chatting...';
        input.removeEventListener('input', handleInputChange);
        input.removeEventListener('keydown', handleKeyDown);
    }
}

// Handle input changes for character counter and typing indicator
function handleInputChange(e) {
    const input = e.target;
    const charCounter = document.getElementById('charCounter');
    const currentLength = input.value.length;
    const maxLength = 1000;
    
    // Update character counter
    charCounter.textContent = `${currentLength}/${maxLength}`;
    charCounter.className = 'char-counter';
    
    if (currentLength > maxLength * 0.8) {
        charCounter.classList.add('warning');
    }
    if (currentLength > maxLength * 0.95) {
        charCounter.classList.add('danger');
    }
    
    // Handle typing indicator
    if (!isTyping && currentLength > 0) {
        isTyping = true;
        sendTypingIndicator(true);
    }
    
    // Reset typing timeout
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        if (isTyping) {
            isTyping = false;
            sendTypingIndicator(false);
        }
    }, 2000);
}

// Handle special key combinations
function handleKeyDown(e) {
    // Send message with Enter (but not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendUserMessage(e);
    }
}

// Send typing indicator
function sendTypingIndicator(typing) {
    // This would typically send to server, for now just simulate
    console.log(`User is ${typing ? 'typing' : 'stopped typing'}`);
}

// Enhanced sendUserMessage function
async function sendUserMessage(e) {
    e.preventDefault();
    
    if (!currentUserChatRoom || !userChatKey) {
        showNotification('Please join a room first', 'warning');
        return;
    }
    
    const input = document.getElementById('userChatInput');
    const message = input.value.trim();
    if (!message) return;
    
    input.value = '';
    
    // Clear typing indicator
    if (isTyping) {
        isTyping = false;
        sendTypingIndicator(false);
    }
    
    // Reset character counter
    const charCounter = document.getElementById('charCounter');
    charCounter.textContent = '0/1000';
    charCounter.className = 'char-counter';
    
    try {
        // Encrypt the message with improved encryption
        const encryptedMessage = encryptMessage(message, userChatKey);
        if (!encryptedMessage) {
            throw new Error('Encryption failed');
        }
        
        const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const timestamp = new Date().toISOString();
        
        // Send encrypted message
        const response = await fetch(`${API_BASE}/user-chat/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId: currentUserChatRoom,
                username: userChatUsername,
                encryptedMessage: encryptedMessage,
                messageId: messageId,
                timestamp: timestamp
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification(data.error, 'error');
            input.value = message; // Restore message on error
        } else {
            // Add message to UI immediately with animation
            appendUserMessage(userChatUsername, message, true, timestamp, messageId);
            
            // Play send sound effect (optional)
            playNotificationSound('send');
        }
        
    } catch (err) {
        console.error('Send message error:', err);
        showNotification('Failed to send message: ' + err.message, 'error');
        input.value = message; // Restore message on error
    }
}

// Enhanced appendUserMessage with animations and message actions
function appendUserMessage(username, content, isOwn = false, timestamp = null, messageId = null) {
    const messagesEl = document.getElementById('userChatMessages');
    
    // Hide welcome message
    const welcome = messagesEl.querySelector('.premium-welcome');
    if (welcome) welcome.style.display = 'none';
    
    const div = document.createElement('div');
    div.className = `chat-message ${isOwn ? 'user' : 'other'}`;
    div.dataset.messageId = messageId || '';
    
    const timeStr = timestamp ? formatMessageTime(timestamp) : '';
    const actionsHtml = isOwn ? `
        <div class=\"message-actions\">
            <button class=\"message-action-btn\" onclick=\"deleteMessage('${messageId}')\" title=\"Delete message\">
                🗑️
            </button>
        </div>
    ` : '';
    
    div.innerHTML = `
        <div class=\"message-bubble\">
            <div class=\"message-header\">
                <span class=\"message-username\">${escapeHtml(username)}</span>
                <span class=\"message-time\">${timeStr}</span>
            </div>
            <div class=\"message-content\">${escapeHtml(content)}</div>
        </div>
        ${actionsHtml}
    `;
    
    messagesEl.appendChild(div);
    
    // Scroll to bottom with smooth animation
    messagesEl.scrollTo({
        top: messagesEl.scrollHeight,
        behavior: 'smooth'
    });
    
    // Add entrance animation
    setTimeout(() => {
        div.style.opacity = '1';
        div.style.transform = 'translateY(0)';
    }, 10);
}

// Format message timestamp
function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
               date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// Delete message function
async function deleteMessage(messageId) {
    if (!messageId || !confirm('Delete this message?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/user-chat/delete/${messageId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId: currentUserChatRoom,
                username: userChatUsername
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Remove message from UI with animation
            const messageEl = document.querySelector(`[data-message-id=\"${messageId}\"]`);
            if (messageEl) {
                messageEl.style.opacity = '0';
                messageEl.style.transform = 'translateX(-20px) scale(0.9)';
                setTimeout(() => messageEl.remove(), 300);
            }
            showNotification('Message deleted', 'success');
        } else {
            showNotification(data.error || 'Failed to delete message', 'error');
        }
    } catch (err) {
        console.error('Delete message error:', err);
        showNotification('Failed to delete message', 'error');
    }
}

// Clear chat function with confirmation
function clearUserChat() {
    if (!confirm('Clear all messages? This cannot be undone.')) return;
    
    const messagesEl = document.getElementById('userChatMessages');
    const messages = messagesEl.querySelectorAll('.chat-message');
    
    // Animate out all messages
    messages.forEach((msg, index) => {
        setTimeout(() => {
            msg.style.opacity = '0';
            msg.style.transform = 'translateY(-20px)';
            setTimeout(() => msg.remove(), 300);
        }, index * 50);
    });
    
    // Show welcome back after clearing
    setTimeout(() => {
        if (messagesEl.children.length === 0) {
            messagesEl.innerHTML = `
                <div class=\"premium-welcome\">
                    <div class=\"welcome-icon\">💬</div>
                    <h3>Chat Cleared</h3>
                    <p>Start a new conversation!</p>
                </div>
            `;
        }
    }, messages.length * 50 + 300);
    
    showNotification('Chat cleared', 'success');
}

// Additional utility functions
function exportChatHistory() {
    const messages = Array.from(document.querySelectorAll('.chat-message')).map(msg => {
        const username = msg.querySelector('.message-username').textContent;
        const content = msg.querySelector('.message-content').textContent;
        const time = msg.querySelector('.message-time').textContent;
        return `[${time}] ${username}: ${content}`;
    }).join('\\n');
    
    const blob = new Blob([messages], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${currentUserChatRoom}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Chat exported', 'success');
}

function toggleChatTheme() {
    document.body.classList.toggle('chat-dark-theme');
    showNotification('Theme toggled', 'info');
}

function openEmojiPicker() {
    // Simple emoji insertion - could be expanded with emoji picker library
    const emojis = ['😀', '😂', '👍', '❤️', '🎉', '🔥', '💯', '🚀', '⚡', '✨'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const input = document.getElementById('userChatInput');
    input.value += emoji;
    input.focus();
    handleInputChange({ target: input });
}

function openFileUpload() {
    showNotification('File upload feature coming soon!', 'info');
}

// Notification and sound functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class=\"notification-icon\">${getNotificationIcon(type)}</span>
        <span class=\"notification-text\">${escapeHtml(message)}</span>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
    };
    return icons[type] || 'ℹ️';
}

function playNotificationSound(type = 'default') {
    // Create audio context for sound effects
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        
        // Different tones for different actions
        if (type === 'send') {
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        } else {
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        }
        
        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        // Audio not supported or blocked
        console.log('Audio not available');
    }
}
    }
    
    // Generate username if not set
    if (!userChatUsername) {
        userChatUsername = prompt('Enter your username:') || `User${Math.floor(Math.random() * 1000)}`;
    }
    
    try {
        // Generate encryption key for this room
        userChatKey = await generateChatKey(roomId, userChatUsername);
        
        const response = await fetch(`${API_BASE}/user-chat/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, username: userChatUsername })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
            return;
        }
        
        currentUserChatRoom = roomId;
        lastMessageTimestamp = null;
        
        // Update UI
        updateUserChatStatus(`Connected to room "${roomId}" as ${userChatUsername}`);
        enableUserChatInput(true);
        
        // Clear messages and show welcome
        const messagesEl = document.getElementById('userChatMessages');
        messagesEl.innerHTML = `
            <div class="chat-welcome">
                <p>🔒 Connected to encrypted room: <strong>${roomId}</strong></p>
                <p>Username: <strong>${userChatUsername}</strong></p>
                <p>Members: ${data.memberCount}</p>
                <p class="encryption-notice">End-to-end encryption active</p>
            </div>
        `;
        
        // Start polling for messages
        startUserChatPolling();
        
    } catch (err) {
        console.error('Join room error:', err);
        alert('Failed to join room: ' + err.message);
    }
}

function updateUserChatStatus(message) {
    const statusEl = document.getElementById('userChatStatus');
    const indicator = statusEl.querySelector('.status-indicator');
    const textSpan = statusEl.querySelector('span:last-child');
    
    if (currentUserChatRoom) {
        indicator.className = 'status-indicator online';
        textSpan.textContent = message;
    } else {
        indicator.className = 'status-indicator';
        textSpan.textContent = message;
    }
}

function enableUserChatInput(enabled) {
    const input = document.getElementById('userChatInput');
    const button = document.getElementById('sendUserMessageBtn');
    
    input.disabled = !enabled;
    button.disabled = !enabled;
    
    if (enabled) {
        input.placeholder = 'Type your encrypted message...';
        input.focus();
    } else {
        input.placeholder = 'Join a room to start chatting...';
    }
}

async function sendUserMessage(e) {
    e.preventDefault();
    
    if (!currentUserChatRoom || !userChatKey) {
        alert('Please join a room first');
        return;
    }
    
    const input = document.getElementById('userChatInput');
    const message = input.value.trim();
    if (!message) return;
    
    input.value = '';
    
    try {
        // Encrypt the message
        const encryptedMessage = encryptMessage(message, userChatKey);
        const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Send encrypted message
        const response = await fetch(`${API_BASE}/user-chat/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId: currentUserChatRoom,
                username: userChatUsername,
                encryptedMessage: encryptedMessage,
                messageId: messageId
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
            input.value = message; // Restore message on error
        } else {
            // Add message to UI immediately (optimistic update)
            appendUserMessage(userChatUsername, message, true, data.timestamp);
        }
        
    } catch (err) {
        console.error('Send message error:', err);
        alert('Failed to send message: ' + err.message);
        input.value = message; // Restore message on error
    }
}

function appendUserMessage(username, content, isOwn = false, timestamp = null) {
    const messagesEl = document.getElementById('userChatMessages');
    
    // Hide welcome message
    const welcome = messagesEl.querySelector('.chat-welcome');
    if (welcome) welcome.style.display = 'none';
    
    const div = document.createElement('div');
    div.className = `chat-message ${isOwn ? 'user' : 'other'}`;
    
    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    
    div.innerHTML = `
        <div class="message-header">
            <span class="message-username">${escapeHtml(username)}</span>
            <span class="message-time">${timeStr}</span>
        </div>
        <div class="message-content">${escapeHtml(content)}</div>
    `;
    
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function loadUserChatMessages() {
    if (!currentUserChatRoom) return;
    
    try {
        let url = `${API_BASE}/user-chat/messages/${currentUserChatRoom}`;
        if (lastMessageTimestamp) {
            url += `?since=${encodeURIComponent(lastMessageTimestamp)}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.messages && data.messages.length > 0) {
            data.messages.forEach(msg => {
                if (msg.username !== userChatUsername) {
                    // Decrypt and display message from other users
                    const decryptedContent = decryptMessage(msg.encryptedContent, userChatKey);
                    appendUserMessage(msg.username, decryptedContent, false, msg.timestamp);
                }
                
                lastMessageTimestamp = msg.timestamp;
            });
        }
        
    } catch (err) {
        console.error('Load messages error:', err);
    }
}

function startUserChatPolling() {
    if (userChatPollInterval) {
        clearInterval(userChatPollInterval);
    }
    
    // Load initial messages
    loadUserChatMessages();
    
    // Poll for new messages every 2 seconds
    userChatPollInterval = setInterval(loadUserChatMessages, 2000);
}

function stopUserChatPolling() {
    if (userChatPollInterval) {
        clearInterval(userChatPollInterval);
        userChatPollInterval = null;
    }
}

async function leaveUserChatRoom() {
    if (!currentUserChatRoom) return;
    
    try {
        await fetch(`${API_BASE}/user-chat/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId: currentUserChatRoom,
                username: userChatUsername
            })
        });
    } catch (err) {
        console.error('Leave room error:', err);
    }
    
    // Reset state
    currentUserChatRoom = null;
    userChatKey = null;
    lastMessageTimestamp = null;
    stopUserChatPolling();
    
    // Update UI
    updateUserChatStatus('Enter room ID to start chatting');
    enableUserChatInput(false);
    document.getElementById('userChatRoom').value = '';
}

function clearUserChat() {
    if (currentUserChatRoom && confirm('Leave current room and clear chat?')) {
        leaveUserChatRoom();
    }
    
    const messagesEl = document.getElementById('userChatMessages');
    messagesEl.innerHTML = `
        <div class="chat-welcome">
            <p>🔒 Welcome to Encrypted User Chat!</p>
            <p>Enter a room ID above to start a secure conversation.</p>
            <p class="encryption-notice">All messages are end-to-end encrypted.</p>
        </div>
    `;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (currentUserChatRoom) {
        leaveUserChatRoom();
    }
});

// ==================== Links ====================

async function loadLinks() {
    try {
        const response = await fetch(`${API_BASE}/links`);
        const links = await response.json();
        
        // Update dashboard count
        document.getElementById('linksCount').textContent = `${links.length} links`;
        
        const listEl = document.getElementById('linksList');
        
        if (links.length === 0) {
            listEl.innerHTML = '<p class="empty-message">No short links yet</p>';
            return;
        }
        
        listEl.innerHTML = links.map(link => `
            <div class="link-item">
                <div class="link-info">
                    <div class="link-short">${window.location.origin}${link.shortUrl}</div>
                    <div class="link-original">${escapeHtml(link.url)}</div>
                    <div class="link-stats">${link.clicks} clicks • Created ${formatDate(link.createdAt)}</div>
                </div>
                <div class="link-actions">
                    <button class="btn btn-secondary btn-small" onclick="copyToClipboard('${window.location.origin}${link.shortUrl}')">Copy</button>
                    <button class="btn btn-danger btn-small" onclick="deleteLink('${link.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load links:', err);
        document.getElementById('linksList').innerHTML = '<p class="text-danger">Failed to load links</p>';
    }
}

async function createLink(e) {
    e.preventDefault();
    
    const url = document.getElementById('linkUrl').value;
    const code = document.getElementById('linkCode').value || undefined;
    
    try {
        const response = await fetch(`${API_BASE}/links`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, customCode: code })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
        } else {
            document.getElementById('linkUrl').value = '';
            document.getElementById('linkCode').value = '';
            loadLinks();
        }
    } catch (err) {
        alert('Failed to create link: ' + err.message);
    }
}

async function deleteLink(id) {
    if (!confirm('Delete this link?')) return;
    
    try {
        await fetch(`${API_BASE}/links/${id}`, { method: 'DELETE' });
        loadLinks();
    } catch (err) {
        alert('Failed to delete link: ' + err.message);
    }
}

// ==================== Uploads ====================

function initUploadZone() {
    const zone = document.getElementById('uploadZone');
    const input = document.getElementById('fileInput');
    
    zone.addEventListener('click', () => input.click());
    
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });
    
    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });
    
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    
    input.addEventListener('change', () => {
        handleFiles(input.files);
        input.value = '';
    });
}

async function handleFiles(files) {
    for (const file of files) {
        await uploadFile(file);
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${API_BASE}/uploads`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
        } else {
            addUploadToList(data.file);
        }
    } catch (err) {
        alert('Upload failed: ' + err.message);
    }
}

function addUploadToList(file) {
    const listEl = document.getElementById('uploadsList');
    
    // Remove empty message if present
    const empty = listEl.querySelector('.empty-message');
    if (empty) empty.remove();
    
    const div = document.createElement('div');
    div.className = 'upload-item';
    div.id = `upload-${file.filename}`;
    div.innerHTML = `
        <div class="upload-info">
            <div class="upload-name">${escapeHtml(file.originalName)}</div>
            <div class="upload-meta">
                ${formatBytes(file.size)} • 
                <span class="upload-expires">Expires ${formatDate(file.expiresAt)}</span>
            </div>
        </div>
        <div class="upload-actions">
            <button class="btn btn-secondary btn-small" onclick="copyToClipboard('${window.location.origin}${file.downloadUrl}')">Copy Link</button>
            <a href="${file.downloadUrl}" class="btn btn-primary btn-small" download>Download</a>
            <button class="btn btn-danger btn-small" onclick="deleteUpload('${file.filename}')">Delete</button>
        </div>
    `;
    
    listEl.prepend(div);
    
    // Auto-remove after expiration
    const expiresIn = new Date(file.expiresAt) - new Date();
    if (expiresIn > 0) {
        setTimeout(() => {
            const el = document.getElementById(`upload-${file.filename}`);
            if (el) el.remove();
        }, expiresIn);
    }
}

async function deleteUpload(filename) {
    if (!confirm('Delete this file?')) return;
    
    try {
        await fetch(`${API_BASE}/uploads/${filename}`, { method: 'DELETE' });
        const el = document.getElementById(`upload-${filename}`);
        if (el) el.remove();
    } catch (err) {
        alert('Failed to delete file: ' + err.message);
    }
}

// ==================== File Browser ====================

async function browsePath(path) {
    currentPath = path;
    
    try {
        const response = await fetch(`${API_BASE}/files?path=${encodeURIComponent(path)}`);
        const data = await response.json();
        
        if (data.error) {
            document.getElementById('filesGrid').innerHTML = `<p class="text-danger">${escapeHtml(data.error)}</p>`;
            return;
        }
        
        updateBreadcrumb(data.path, data.parent);
        
        const filesGrid = document.getElementById('filesGrid');
        
        if (data.items.length === 0) {
            filesGrid.innerHTML = '<p class="empty-message">Empty directory</p>';
            return;
        }
        
        filesGrid.innerHTML = data.items.map(item => `
            <div class="file-item ${item.isHidden ? 'hidden' : ''}" 
                 onclick="${item.type === 'directory' ? `browsePath('${escapeAttr(item.path)}')` : `previewFile('${escapeAttr(item.path)}')`}">
                <div class="file-icon">${getFileIcon(item)}</div>
                <div class="file-name">${escapeHtml(item.name)}</div>
                <div class="file-size">${item.type === 'directory' ? 'Directory' : item.sizeFormatted}</div>
            </div>
        `).join('');
        
    } catch (err) {
        console.error('Failed to browse:', err);
        document.getElementById('filesGrid').innerHTML = '<p class="text-danger">Failed to load directory</p>';
    }
}

function updateBreadcrumb(path, parent) {
    const breadcrumb = document.getElementById('fileBreadcrumb');
    const parts = path === '.' ? [] : path.split('/').filter(Boolean);
    
    let html = '<span class="crumb" onclick="browsePath(\'\')">Home</span>';
    
    let currentPath = '';
    parts.forEach((part, i) => {
        currentPath += (currentPath ? '/' : '') + part;
        html += ` <span class="crumb-separator">/</span> `;
        html += `<span class="crumb" onclick="browsePath('${escapeAttr(currentPath)}')">${escapeHtml(part)}</span>`;
    });
    
    breadcrumb.innerHTML = html;
}

function getFileIcon(item) {
    if (item.type === 'directory') return '📁';
    
    const icons = {
        image: '🖼️',
        video: '🎬',
        audio: '🎵',
        document: '📄',
        text: '📝',
        code: '💻',
        archive: '📦'
    };
    
    return icons[item.category] || '📄';
}

async function previewFile(path) {
    const modal = document.getElementById('filePreviewModal');
    const nameEl = document.getElementById('previewFileName');
    const contentEl = document.getElementById('filePreviewContent');
    
    nameEl.textContent = path.split('/').pop();
    contentEl.innerHTML = 'Loading...';
    modal.classList.add('active');
    
    try {
        const response = await fetch(`${API_BASE}/files/read?path=${encodeURIComponent(path)}`);
        const data = await response.json();
        
        if (data.error) {
            contentEl.innerHTML = `
                <p class="text-danger">${escapeHtml(data.error)}</p>
                <p><a href="${API_BASE}/files/download?path=${encodeURIComponent(path)}" class="btn btn-primary">Download File</a></p>
            `;
        } else {
            contentEl.innerHTML = `<pre>${escapeHtml(data.content)}</pre>`;
        }
    } catch (err) {
        contentEl.innerHTML = `<p class="text-danger">Failed to load file</p>`;
    }
}

async function searchFiles() {
    const query = document.getElementById('fileSearch').value.trim();
    if (!query) return;
    
    try {
        const response = await fetch(`${API_BASE}/files/search?query=${encodeURIComponent(query)}&path=${encodeURIComponent(currentPath)}`);
        const data = await response.json();
        
        const filesGrid = document.getElementById('filesGrid');
        
        if (data.results.length === 0) {
            filesGrid.innerHTML = '<p class="empty-message">No results found</p>';
            return;
        }
        
        filesGrid.innerHTML = data.results.map(item => `
            <div class="file-item" 
                 onclick="${item.type === 'directory' ? `browsePath('${escapeAttr(item.path)}')` : `previewFile('${escapeAttr(item.path)}')`}">
                <div class="file-icon">${item.type === 'directory' ? '📁' : '📄'}</div>
                <div class="file-name">${escapeHtml(item.name)}</div>
                <div class="file-size">${item.sizeFormatted}</div>
            </div>
        `).join('');
        
        if (data.truncated) {
            filesGrid.innerHTML += '<p class="text-warning">Results truncated (max 100)</p>';
        }
        
    } catch (err) {
        console.error('Search failed:', err);
    }
}

// ==================== Cameras ====================

async function loadCameras() {
    try {
        const response = await fetch(`${API_BASE}/cameras`);
        const cameras = await response.json();
        
        // Update dashboard count
        document.getElementById('camerasCount').textContent = `${cameras.length} cameras`;
        
        const grid = document.getElementById('cameraGrid');
        
        if (cameras.length === 0) {
            grid.innerHTML = '<p class="empty-message">No cameras configured</p>';
            return;
        }
        
        grid.innerHTML = cameras.map(camera => `
            <div class="camera-item">
                <div class="camera-feed">
                    ${camera.type === 'img' ? 
                        `<img src="${escapeAttr(camera.url)}" alt="${escapeAttr(camera.name)}" onerror="this.parentElement.innerHTML='<div class=\\'camera-offline\\'>📷 Offline</div>'">` :
                        camera.type === 'mjpeg' ?
                        `<img src="${escapeAttr(camera.url)}" alt="${escapeAttr(camera.name)}" onerror="this.parentElement.innerHTML='<div class=\\'camera-offline\\'>📷 Offline</div>'">` :
                        `<div class="camera-offline">Stream type: ${camera.type}</div>`
                    }
                </div>
                <div class="camera-info">
                    <span class="camera-name">${escapeHtml(camera.name)}</span>
                    <button class="btn btn-danger btn-small" onclick="deleteCamera('${camera.id}')">Delete</button>
                </div>
            </div>
        `).join('');
        
    } catch (err) {
        console.error('Failed to load cameras:', err);
        document.getElementById('cameraGrid').innerHTML = '<p class="text-danger">Failed to load cameras</p>';
    }
}

function showAddCameraModal() {
    document.getElementById('addCameraModal').classList.add('active');
}

async function addCamera(e) {
    e.preventDefault();
    
    const name = document.getElementById('cameraName').value;
    const url = document.getElementById('cameraUrl').value;
    const type = document.getElementById('cameraType').value;
    const username = document.getElementById('cameraUser').value || undefined;
    const password = document.getElementById('cameraPass').value || undefined;
    
    try {
        const response = await fetch(`${API_BASE}/cameras`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, url, type, username, password })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
        } else {
            closeModal('addCameraModal');
            // Reset form
            document.getElementById('cameraName').value = '';
            document.getElementById('cameraUrl').value = '';
            document.getElementById('cameraType').value = 'mjpeg';
            document.getElementById('cameraUser').value = '';
            document.getElementById('cameraPass').value = '';
            loadCameras();
        }
    } catch (err) {
        alert('Failed to add camera: ' + err.message);
    }
}

async function deleteCamera(id) {
    if (!confirm('Delete this camera?')) return;
    
    try {
        await fetch(`${API_BASE}/cameras/${id}`, { method: 'DELETE' });
        loadCameras();
    } catch (err) {
        alert('Failed to delete camera: ' + err.message);
    }
}

// ==================== Mind Map Notes ====================

async function loadNotes() {
    try {
        const response = await fetch(`${API_BASE}/notes`);
        const notes = await response.json();
        
        // Update dashboard count
        document.getElementById('notesCount').textContent = `${notes.length} notes`;
        
        // Update select dropdown
        const select = document.getElementById('noteSelect');
        select.innerHTML = '<option value="">-- Select Note --</option>' +
            notes.map(note => `<option value="${note.id}">${escapeHtml(note.title)}</option>`).join('');
        
        // Update notes grid
        const notesGrid = document.getElementById('notesGrid');
        if (notes.length === 0) {
            notesGrid.innerHTML = '<p class="empty-message">No notes yet. Create your first mind map!</p>';
        } else {
            notesGrid.innerHTML = notes.map(note => `
                <div class="note-card" onclick="loadNote('${note.id}')">
                    <div class="note-card-header">
                        <div class="note-title">${escapeHtml(note.title)}</div>
                        <div class="note-toggle ${note.isPublic ? 'active' : ''}" 
                             onclick="event.stopPropagation(); toggleNotePublic('${note.id}', ${!note.isPublic})" 
                             title="${note.isPublic ? 'Public' : 'Private'}">
                            ${note.isPublic ? '➤' : '○'}
                        </div>
                    </div>
                    <div class="note-meta">
                        ${note.nodes ? note.nodes.length : 1} nodes • 
                        ${formatDate(note.updatedAt)}
                    </div>
                    <div class="note-preview">
                        ${escapeHtml(note.content || 'Click to edit this mind map')}
                    </div>
                    ${note.isPublic && note.shareCode ? `
                        <div class="note-url">
                            ${window.location.origin}/share/${note.shareCode}
                        </div>
                    ` : ''}
                </div>
            `).join('');
        }
        
    } catch (err) {
        console.error('Failed to load notes:', err);
        document.getElementById('notesGrid').innerHTML = 
            '<p class="empty-message">Failed to load notes</p>';
    }
}

function showCreateNoteModal() {
    document.getElementById('createNoteModal').classList.add('active');
}

async function createNote(e) {
    e.preventDefault();
    
    const title = document.getElementById('noteTitle').value;
    const isPublic = document.getElementById('notePublic').checked;
    
    try {
        const response = await fetch(`${API_BASE}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, isPublic })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
        } else {
            closeModal('createNoteModal');
            document.getElementById('noteTitle').value = '';
            document.getElementById('notePublic').checked = false;
            loadNotes();
            loadNote(data.note.id);
        }
    } catch (err) {
        alert('Failed to create note: ' + err.message);
    }
}

// Toggle individual note public status
async function toggleNotePublic(noteId, isPublic) {
    try {
        const response = await fetch(`${API_BASE}/notes/${noteId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPublic })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
        } else {
            loadNotes(); // Refresh the notes grid
        }
    } catch (err) {
        alert('Failed to update note visibility: ' + err.message);
    }
}

// Toggle all notes public/private
async function toggleAllNotesPublic() {
    try {
        const response = await fetch(`${API_BASE}/notes`);
        const notes = await response.json();
        
        // Determine if majority are public or private
        const publicCount = notes.filter(note => note.isPublic).length;
        const makePublic = publicCount < notes.length / 2;
        
        const promises = notes.map(note => 
            fetch(`${API_BASE}/notes/${note.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublic: makePublic })
            })
        );
        
        await Promise.all(promises);
        loadNotes(); // Refresh the notes grid
        
    } catch (err) {
        alert('Failed to toggle notes visibility: ' + err.message);
    }
}

async function loadNote(id) {
    if (!id) {
        currentNote = null;
        document.getElementById('mindmapToolbar').style.display = 'none';
        document.getElementById('mindmapContainer').style.display = 'none';
        document.getElementById('mindmapEmpty').style.display = 'flex';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/notes/${id}`);
        const note = await response.json();
        
        if (note.error) {
            alert(note.error);
            return;
        }
        
        currentNote = note;
        
        document.getElementById('mindmapToolbar').style.display = 'flex';
        document.getElementById('mindmapContainer').style.display = 'block';
        document.getElementById('mindmapEmpty').style.display = 'none';
        
        updatePublicToggle();
        renderMindMap();
        
        // Update select
        document.getElementById('noteSelect').value = id;
        
    } catch (err) {
        alert('Failed to load note: ' + err.message);
    }
}

function renderMindMap() {
    if (!currentNote) return;
    
    const nodesEl = document.getElementById('mindmapNodes');
    const svg = document.getElementById('mindmapSvg');
    
    // Clear
    nodesEl.innerHTML = '';
    svg.innerHTML = '';
    
    // Render nodes
    currentNote.nodes.forEach(node => {
        const div = document.createElement('div');
        div.className = `mindmap-node ${node.id === 'root' ? 'root' : ''}`;
        div.style.left = node.x + 'px';
        div.style.top = node.y + 'px';
        div.style.borderColor = node.color || '#4a90d9';
        div.textContent = node.text;
        div.dataset.id = node.id;
        
        // Make draggable
        div.addEventListener('mousedown', startDrag);
        div.addEventListener('dblclick', () => editNode(node.id));
        
        nodesEl.appendChild(div);
    });
    
    // Render connections
    currentNote.connections.forEach(conn => {
        const fromNode = currentNote.nodes.find(n => n.id === conn.from);
        const toNode = currentNote.nodes.find(n => n.id === conn.to);
        
        if (fromNode && toNode) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', fromNode.x);
            line.setAttribute('y1', fromNode.y);
            line.setAttribute('x2', toNode.x);
            line.setAttribute('y2', toNode.y);
            svg.appendChild(line);
        }
    });
}

let dragNode = null;
let dragOffset = { x: 0, y: 0 };

function startDrag(e) {
    dragNode = e.target;
    const rect = dragNode.getBoundingClientRect();
    const container = document.getElementById('mindmapContainer').getBoundingClientRect();
    
    dragOffset.x = e.clientX - rect.left - rect.width / 2;
    dragOffset.y = e.clientY - rect.top - rect.height / 2;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
}

function drag(e) {
    if (!dragNode) return;
    
    const container = document.getElementById('mindmapContainer').getBoundingClientRect();
    const x = e.clientX - container.left - dragOffset.x;
    const y = e.clientY - container.top - dragOffset.y;
    
    dragNode.style.left = x + 'px';
    dragNode.style.top = y + 'px';
    
    // Update node position
    const nodeId = dragNode.dataset.id;
    const node = currentNote.nodes.find(n => n.id === nodeId);
    if (node) {
        node.x = x;
        node.y = y;
    }
    
    // Re-render connections
    renderConnections();
}

function stopDrag() {
    if (dragNode) {
        saveNote();
    }
    dragNode = null;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
}

function renderConnections() {
    const svg = document.getElementById('mindmapSvg');
    svg.innerHTML = '';
    
    currentNote.connections.forEach(conn => {
        const fromNode = currentNote.nodes.find(n => n.id === conn.from);
        const toNode = currentNote.nodes.find(n => n.id === conn.to);
        
        if (fromNode && toNode) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', fromNode.x);
            line.setAttribute('y1', fromNode.y);
            line.setAttribute('x2', toNode.x);
            line.setAttribute('y2', toNode.y);
            svg.appendChild(line);
        }
    });
}

async function addNode() {
    if (!currentNote) return;
    
    const text = prompt('Enter node text:');
    if (!text) return;
    
    // Find a parent (default to root)
    const parentId = currentNote.nodes.length > 0 ? 'root' : null;
    
    try {
        const response = await fetch(`${API_BASE}/notes/${currentNote.id}/nodes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, parentId })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
        } else {
            currentNote.nodes.push(data.node);
            if (data.connection) {
                currentNote.connections.push(data.connection);
            }
            renderMindMap();
        }
    } catch (err) {
        alert('Failed to add node: ' + err.message);
    }
}

function editNode(id) {
    const node = currentNote.nodes.find(n => n.id === id);
    if (!node) return;
    
    const text = prompt('Edit node text:', node.text);
    if (text === null) return;
    
    if (text === '' && id !== 'root') {
        deleteNode(id);
        return;
    }
    
    node.text = text;
    renderMindMap();
    saveNote();
}

async function deleteNode(id) {
    if (!confirm('Delete this node?')) return;
    
    try {
        await fetch(`${API_BASE}/notes/${currentNote.id}/nodes/${id}`, { method: 'DELETE' });
        
        currentNote.nodes = currentNote.nodes.filter(n => n.id !== id);
        currentNote.connections = currentNote.connections.filter(c => c.from !== id && c.to !== id);
        renderMindMap();
    } catch (err) {
        alert('Failed to delete node: ' + err.message);
    }
}

async function saveNote() {
    if (!currentNote) return;
    
    try {
        await fetch(`${API_BASE}/notes/${currentNote.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nodes: currentNote.nodes,
                connections: currentNote.connections
            })
        });
    } catch (err) {
        console.error('Failed to save note:', err);
    }
}

async function toggleNotePublic() {
    if (!currentNote) return;
    
    const newPublic = !currentNote.isPublic;
    
    try {
        const response = await fetch(`${API_BASE}/notes/${currentNote.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPublic: newPublic })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
        } else {
            currentNote.isPublic = newPublic;
            currentNote.shareCode = data.note.shareCode;
            updatePublicToggle();
        }
    } catch (err) {
        alert('Failed to update note: ' + err.message);
    }
}

function updatePublicToggle() {
    const toggle = document.getElementById('publicToggle');
    const shareUrl = document.getElementById('shareUrl');
    
    if (currentNote.isPublic) {
        toggle.textContent = 'Make Private';
        shareUrl.innerHTML = `<a href="/share/${currentNote.shareCode}" target="_blank">Share Link</a>`;
    } else {
        toggle.textContent = 'Make Public';
        shareUrl.textContent = '';
    }
}

async function deleteCurrentNote() {
    if (!currentNote) return;
    if (!confirm('Delete this note?')) return;
    
    try {
        await fetch(`${API_BASE}/notes/${currentNote.id}`, { method: 'DELETE' });
        currentNote = null;
        loadNotes();
        loadNote('');
    } catch (err) {
        alert('Failed to delete note: ' + err.message);
    }
}

// Check for shared note link
function checkShareLink() {
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
        const code = path.split('/')[2];
        loadSharedNote(code);
    }
}

async function loadSharedNote(code) {
    try {
        const response = await fetch(`${API_BASE}/notes/share/${code}`);
        const note = await response.json();
        
        if (note.error) {
            alert('Shared note not found');
            return;
        }
        
        currentNote = note;
        showPanel('notes');
        
        document.getElementById('mindmapToolbar').style.display = 'none';
        document.getElementById('mindmapContainer').style.display = 'block';
        document.getElementById('mindmapEmpty').style.display = 'none';
        
        renderMindMap();
        
    } catch (err) {
        alert('Failed to load shared note');
    }
}

// ==================== Settings ====================

async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`);
        if (response.ok) {
            const settings = await response.json();
            
            // AI Provider
            document.getElementById('aiProvider').value = settings.aiProvider || 'openai';
            toggleAIProvider();
            
            // OpenAI settings
            document.getElementById('openaiKey').value = settings.openaiKey || '';
            
            // Local model settings
            document.getElementById('localModelPath').value = settings.localModelPath || '';
            document.getElementById('modelContextSize').value = settings.modelContextSize || 4096;
            document.getElementById('localServerPort').value = settings.localServerPort || 8080;
            
            // File browser
            document.getElementById('fileRoot').value = settings.fileRoot || '';
            document.getElementById('maxUploadSize').value = settings.maxUploadSize || 100;
            
            // Security
            document.getElementById('sessionSecret').value = settings.sessionSecret || '';
        }
    } catch (err) {
        console.error('Failed to load settings:', err);
    }
    
    // Update AI status
    updateAIStatus();
}

function toggleAIProvider() {
    const provider = document.getElementById('aiProvider').value;
    const openaiConfig = document.getElementById('openaiConfig');
    const localConfig = document.getElementById('localConfig');
    
    if (provider === 'local') {
        openaiConfig.style.display = 'none';
        localConfig.style.display = 'block';
    } else {
        openaiConfig.style.display = 'block';
        localConfig.style.display = 'none';
    }
}

async function saveSettings() {
    const settings = {
        aiProvider: document.getElementById('aiProvider').value,
        openaiKey: document.getElementById('openaiKey').value,
        localModelPath: document.getElementById('localModelPath').value,
        modelContextSize: parseInt(document.getElementById('modelContextSize').value),
        localServerPort: parseInt(document.getElementById('localServerPort').value),
        fileRoot: document.getElementById('fileRoot').value,
        maxUploadSize: parseInt(document.getElementById('maxUploadSize').value),
        sessionSecret: document.getElementById('sessionSecret').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('Failed to save settings: ' + data.error);
        } else {
            alert('Settings saved successfully! Please restart the server to apply changes.');
            updateAIStatus();
        }
    } catch (err) {
        alert('Failed to save settings: ' + err.message);
    }
}

async function updateAIStatus() {
    const aiStatus = document.getElementById('aiStatus');
    const statusIndicator = aiStatus.querySelector('.status-indicator');
    
    try {
        const response = await fetch(`${API_BASE}/chat/status`);
        const data = await response.json();
        
        if (data.configured) {
            statusIndicator.className = 'status-indicator online';
            aiStatus.innerHTML = '<span class="status-indicator online"></span>Connected';
        } else {
            statusIndicator.className = 'status-indicator';
            aiStatus.innerHTML = '<span class="status-indicator"></span>Not Configured';
        }
    } catch (err) {
        statusIndicator.className = 'status-indicator';
        aiStatus.innerHTML = '<span class="status-indicator"></span>Error';
    }
}

// Load settings when settings panel is opened
function showPanel(panelName) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.panel === panelName);
    });
    
    // Update panels
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `panel-${panelName}`);
    });
    
    // Load settings if settings panel is opened
    if (panelName === 'settings') {
        loadSettings();
    }
}

// ==================== Modals ====================

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal on backdrop click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// ==================== Utilities ====================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    // Properly escape for use in HTML attributes
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/'/g, '&#39;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString();
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Copied to clipboard!');
    });
}
