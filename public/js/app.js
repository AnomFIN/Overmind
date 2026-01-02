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

// Animation intervals for cleanup
let glitchInterval = null;
let glowPulseInterval = null;
// ==================== Toast Notification System ====================

/**
 * Show a toast notification with cyberpunk styling
 * @param {string} message - The message to display
 * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 4000)
 */
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon based on type
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add to container
    container.appendChild(toast);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300); // Match animation duration
        }, duration);
    }
    
    return toast;
// Animation cleanup trackers
let activeIntervals = {
    glitchEffect: null,
    randomGlowPulses: null,
    typingEffects: []
};

// ==================== Notification System ====================

/**
 * Show a cyberpunk-styled notification
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'notification-content';
    
    const icon = document.createElement('span');
    icon.className = 'notification-icon';
    icon.textContent = getNotificationIcon(type);
    
    const messageSpan = document.createElement('span');
    messageSpan.className = 'notification-message';
    messageSpan.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => notification.remove());
    
    contentDiv.appendChild(icon);
    contentDiv.appendChild(messageSpan);
    notification.appendChild(contentDiv);
    notification.appendChild(closeBtn);
    
    container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'notification-container';
    document.body.appendChild(container);
    return container;
}

function getNotificationIcon(type) {
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    return icons[type] || icons.info;
}

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
    
    // Add neon animations and effects
    initNeonEffects();
    initTechAnimations();
    addParticleBackground();
});

// Cleanup intervals on page unload
window.addEventListener('beforeunload', () => {
    if (glitchInterval) {
        clearInterval(glitchInterval);
        glitchInterval = null;
    }
    if (glowPulseInterval) {
        clearInterval(glowPulseInterval);
        glowPulseInterval = null;
    }
});

// ==================== Neon Effects & Tech Animations ====================

function initNeonEffects() {
    // Clean up existing intervals
    if (activeIntervals.glitchEffect) {
        clearInterval(activeIntervals.glitchEffect);
    }
    
    // Add glitch effect to logo
    const logo = document.querySelector('.logo-image');
    if (logo) {
        // Clear any existing interval
        if (glitchInterval) {
            clearInterval(glitchInterval);
        }
        
        glitchInterval = setInterval(() => {
            // Check if logo still exists in DOM
            if (!document.body.contains(logo)) {
                clearInterval(glitchInterval);
                glitchInterval = null;
                return;
            }
            
        activeIntervals.glitchEffect = setInterval(() => {
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
    // Check if particles already exist
    if (document.querySelector('.particle-background')) {
        return; // Don't create duplicates
    }
    
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
    // Clean up existing typing effect intervals
    activeIntervals.typingEffects.forEach(interval => clearInterval(interval));
    activeIntervals.typingEffects = [];
    
    const statusElements = document.querySelectorAll('.status-value, .system-status span');
    statusElements.forEach(element => {
        // Check if element is still in DOM
        if (!element.isConnected) return;
        
        if (element.textContent && element.textContent.length > 1) {
            const text = element.textContent;
            element.textContent = '';
            
            let i = 0;
            const typeInterval = setInterval(() => {
                // Check if element is still in DOM
                if (!element.isConnected) {
                    clearInterval(typeInterval);
                    return;
                }
                
                element.textContent += text[i];
                i++;
                if (i >= text.length) {
                    clearInterval(typeInterval);
                    // Remove from tracking
                    const index = activeIntervals.typingEffects.indexOf(typeInterval);
                    if (index > -1) {
                        activeIntervals.typingEffects.splice(index, 1);
                    }
                    element.style.borderRight = '2px solid var(--neon-blue)';
                    element.style.animation = 'var(--animation-pulse)';
                }
            }, 100);
            
            activeIntervals.typingEffects.push(typeInterval);
        }
    });
}

function addRandomGlowPulses() {
    // Clean up existing interval
    if (activeIntervals.randomGlowPulses) {
        clearInterval(activeIntervals.randomGlowPulses);
    }
    
    const glowElements = document.querySelectorAll('.nav-item, .btn, .dashboard-card');
    
    // Clear any existing interval
    if (glowPulseInterval) {
        clearInterval(glowPulseInterval);
    }
    
    glowPulseInterval = setInterval(() => {
        const randomElement = glowElements[Math.floor(Math.random() * glowElements.length)];
        if (randomElement && document.body.contains(randomElement) && Math.random() < 0.3) {
    activeIntervals.randomGlowPulses = setInterval(() => {
        const randomElement = glowElements[Math.floor(Math.random() * glowElements.length)];
        if (randomElement && randomElement.isConnected && Math.random() < 0.3) {
            randomElement.style.animation = 'neonPulse 1s ease-in-out';
            setTimeout(() => {
                if (randomElement.isConnected) {
                    randomElement.style.animation = '';
                }
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

// ==================== Toast Notifications ====================

/**
 * Display a toast notification
 * @param {string} message - The notification message
 * @param {string} type - Notification type: 'success', 'error', 'warning', or 'info'
 * @param {number} duration - Auto-dismiss duration in ms (0 for no auto-dismiss)
 * @param {boolean} allowHTML - Allow HTML in message (USE ONLY WITH TRUSTED CONTENT)
 */
function showNotification(message, type = 'info', duration = 5000, allowHTML = false) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Information'
    };
    
    // Create toast structure
    const toastIcon = document.createElement('div');
    toastIcon.className = 'toast-icon';
    toastIcon.textContent = icons[type] || icons.info;
    
    const toastContent = document.createElement('div');
    toastContent.className = 'toast-content';
    
    const toastTitle = document.createElement('div');
    toastTitle.className = 'toast-title';
    toastTitle.textContent = titles[type] || titles.info;
    
    const toastMessage = document.createElement('div');
    toastMessage.className = 'toast-message';
    
    // Set message content based on allowHTML flag
    if (allowHTML) {
        toastMessage.innerHTML = message;
    } else {
        toastMessage.textContent = message;
    }
    
    const closeButton = document.createElement('button');
    closeButton.className = 'toast-close';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => toast.remove());
    
    toastContent.appendChild(toastTitle);
    toastContent.appendChild(toastMessage);
    
    toast.appendChild(toastIcon);
    toast.appendChild(toastContent);
    toast.appendChild(closeButton);
    
    // Add progress bar with dynamic duration
    if (duration > 0) {
        const progressBar = document.createElement('div');
        progressBar.className = 'toast-progress';
        progressBar.style.animationDuration = `${duration}ms`;
        toast.appendChild(progressBar);
    }
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto-dismiss
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    return toast;
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
    
    // Load settings if settings panel is opened
    if (panelName === 'settings') {
        loadSettings();
    }
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
            statusEl.innerHTML = '<span class="text-success">✓ OpenAI API connected</span>';
        } else {
            statusEl.innerHTML = '<span class="text-warning">⚠ OpenAI API not configured - Add OPENAI_API_KEY to .env</span>';
        }
    } catch (err) {
        document.getElementById('chatStatus').innerHTML = 
            '<span class="text-danger">✗ Could not check API status</span>';
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
    
    // Add loading indicator
    const loadingId = 'loading-' + Date.now();
    appendMessage('assistant', '...', loadingId);
    
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
            appendMessage('assistant', `Error: ${data.error}`);
        } else {
            appendMessage('assistant', data.message);
        }
    } catch (err) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        appendMessage('assistant', `Error: ${err.message}`);
    }
}

function appendMessage(role, content, id) {
    const messagesEl = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-message ${role}`;
    if (id) div.id = id;
    div.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
    messagesEl.appendChild(div);
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
            showToast(data.error, 'error');
            showNotification(data.error, 'error');
            toast.error(data.error, 'Link Creation Failed');
        } else {
            document.getElementById('linkUrl').value = '';
            document.getElementById('linkCode').value = '';
            toast.success(`Link created: ${data.shortUrl}`, 'Success');
            loadLinks();
            showToast('Link created successfully!', 'success', 2000);
        }
    } catch (err) {
        showToast('Failed to create link: ' + err.message, 'error');
            showNotification('Link created successfully', 'success');
        }
    } catch (err) {
        showNotification('Failed to create link: ' + err.message, 'error');
        toast.error(err.message, 'Failed to Create Link');
    }
}

async function deleteLink(id) {
    if (!confirm('Delete this link?')) return;
    
    try {
        await fetch(`${API_BASE}/links/${id}`, { method: 'DELETE' });
        toast.success('Link deleted successfully', 'Link Deleted');
        loadLinks();
        showToast('Link deleted successfully', 'success', 2000);
    } catch (err) {
        showToast('Failed to delete link: ' + err.message, 'error');
        showNotification('Link deleted successfully', 'success');
    } catch (err) {
        showNotification('Failed to delete link: ' + err.message, 'error');
        toast.error(err.message, 'Failed to Delete Link');
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
            showToast(data.error, 'error');
            showNotification(data.error, 'error');
            toast.error(data.error, 'Upload Failed');
        } else {
            toast.success(`File uploaded: ${data.file.originalName}`, 'Upload Complete');
            addUploadToList(data.file);
            showToast('File uploaded successfully', 'success', 2000);
        }
    } catch (err) {
        showToast('Upload failed: ' + err.message, 'error');
            showNotification('File uploaded successfully', 'success');
        }
    } catch (err) {
        showNotification('Upload failed: ' + err.message, 'error');
        toast.error(err.message, 'Upload Failed');
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
        showToast('File deleted successfully', 'success', 2000);
    } catch (err) {
        showToast('Failed to delete file: ' + err.message, 'error');
        showNotification('File deleted successfully', 'success');
    } catch (err) {
        showNotification('Failed to delete file: ' + err.message, 'error');
        toast.error(err.message, 'Failed to Delete File');
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
            showToast(data.error, 'error');
            showNotification(data.error, 'error');
            toast.error(data.error, 'Camera Addition Failed');
        } else {
            closeModal('addCameraModal');
            // Reset form
            document.getElementById('cameraName').value = '';
            document.getElementById('cameraUrl').value = '';
            document.getElementById('cameraType').value = 'mjpeg';
            document.getElementById('cameraUser').value = '';
            document.getElementById('cameraPass').value = '';
            toast.success(`Camera added: ${name}`, 'Camera Added');
            loadCameras();
            showToast('Camera added successfully', 'success', 2000);
        }
    } catch (err) {
        showToast('Failed to add camera: ' + err.message, 'error');
            showNotification('Camera added successfully', 'success');
        }
    } catch (err) {
        showNotification('Failed to add camera: ' + err.message, 'error');
        toast.error(err.message, 'Failed to Add Camera');
    }
}

async function deleteCamera(id) {
    if (!confirm('Delete this camera?')) return;
    
    try {
        await fetch(`${API_BASE}/cameras/${id}`, { method: 'DELETE' });
        toast.success('Camera deleted', 'Camera Deleted');
        loadCameras();
        showToast('Camera deleted successfully', 'success', 2000);
    } catch (err) {
        showToast('Failed to delete camera: ' + err.message, 'error');
        showNotification('Camera deleted successfully', 'success');
    } catch (err) {
        showNotification('Failed to delete camera: ' + err.message, 'error');
        toast.error(err.message, 'Failed to Delete Camera');
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
            showToast(data.error, 'error');
            showNotification(data.error, 'error');
            toast.error(data.error, 'Error');
        } else {
            closeModal('createNoteModal');
            document.getElementById('noteTitle').value = '';
            document.getElementById('notePublic').checked = false;
            loadNotes();
            loadNote(data.note.id);
            showNotification('Note created successfully', 'success');
        }
    } catch (err) {
        showToast('Failed to create note: ' + err.message, 'error');
        showNotification('Failed to create note: ' + err.message, 'error');
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
            showToast(data.error, 'error');
            showNotification(data.error, 'error');
        } else {
            loadNotes(); // Refresh the notes grid
            showNotification('Note visibility updated', 'success');
        }
    } catch (err) {
        showToast('Failed to update note visibility: ' + err.message, 'error');
        showNotification('Failed to update note visibility: ' + err.message, 'error');
    }
}

// Toggle all notes public/private
async function toggleAllNotesPublic() {
    try {
        const response = await fetch(`${API_BASE}/notes`);
        const notes = await response.json();
        
        // If all notes are currently public, make them all private; otherwise, make them all public
        const publicCount = notes.filter(note => note.isPublic).length;
        const makePublic = publicCount !== notes.length;
        
        const action = makePublic ? 'public' : 'private';
        showNotification(`Making all notes ${action}...`, 'info');
        // Determine whether to make all notes public or all private:
        // If all are currently public, make them all private; otherwise, make them all public.
        const publicCount = notes.filter(note => note.isPublic).length;
        const makePublic = publicCount !== notes.length;
        
        const promises = notes.map(note => 
            fetch(`${API_BASE}/notes/${note.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublic: makePublic })
            })
        );
        
        await Promise.all(promises);
        showNotification(`All notes are now ${action}`, 'success');
        loadNotes(); // Refresh the notes grid
        
    } catch (err) {
        showToast('Failed to toggle notes visibility: ' + err.message, 'error');
        showNotification('Failed to toggle notes visibility: ' + err.message, 'error');
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
            showToast(note.error, 'error');
            showNotification(note.error, 'error');
            toast.error(note.error, 'Note Error');
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
        showToast('Failed to load note: ' + err.message, 'error');
        showNotification('Failed to load note: ' + err.message, 'error');
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
            showToast(data.error, 'error');
            showNotification(data.error, 'error');
            toast.error(data.error, 'Error');
        } else {
            currentNote.nodes.push(data.node);
            if (data.connection) {
                currentNote.connections.push(data.connection);
            }
            renderMindMap();
            showNotification('Node added successfully', 'success');
        }
    } catch (err) {
        showToast('Failed to add node: ' + err.message, 'error');
        showNotification('Failed to add node: ' + err.message, 'error');
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
        showNotification('Node deleted successfully', 'success');
    } catch (err) {
        showToast('Failed to delete node: ' + err.message, 'error');
        showNotification('Failed to delete node: ' + err.message, 'error');
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
            showToast(data.error, 'error');
            showNotification(data.error, 'error');
            toast.error(data.error, 'Error');
        } else {
            currentNote.isPublic = newPublic;
            currentNote.shareCode = data.note.shareCode;
            updatePublicToggle();
            showNotification('Note updated successfully', 'success');
        }
    } catch (err) {
        showToast('Failed to update note: ' + err.message, 'error');
        showNotification('Failed to update note: ' + err.message, 'error');
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
        showNotification('Note deleted successfully', 'success');
    } catch (err) {
        showToast('Failed to delete note: ' + err.message, 'error');
        showNotification('Failed to delete note: ' + err.message, 'error');
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
            showToast('Shared note not found', 'error');
            showNotification('Shared note not found', 'error');
            toast.error('Shared note not found', 'Not Found');
            return;
        }
        
        currentNote = note;
        showPanel('notes');
        
        document.getElementById('mindmapToolbar').style.display = 'none';
        document.getElementById('mindmapContainer').style.display = 'block';
        document.getElementById('mindmapEmpty').style.display = 'none';
        
        renderMindMap();
        
    } catch (err) {
        showToast('Failed to load shared note', 'error');
        showNotification('Failed to load shared note', 'error');
    }
}

// ==================== Settings ====================

/**
 * Handle authentication errors from settings API
 * @param {Response} response - Fetch API response object
 * @returns {Promise<boolean>} - Returns true if there was an auth error, false otherwise
 */
async function handleSettingsAuthError(response) {
    if (response.status === 401) {
        alert('Admin token is required. Please enter your admin token.');
        return true;
    }
    
    if (response.status === 403) {
        alert('Invalid admin token. Please check your token and try again.');
        return true;
    }
    
    if (response.status === 503) {
        const data = await response.json();
        alert(data.message || 'Authentication not configured on server');
        return true;
    }
    
    return false;
}

// Security note: The admin token is read from the password field for this request only.
// Do NOT store this token in localStorage, sessionStorage, cookies, or any other persistent client-side storage.
async function loadSettings() {
    const adminToken = document.getElementById('adminToken').value;
    
    if (!adminToken) {
        alert('Please enter your admin token to view settings');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        // Handle authentication errors
        if (await handleSettingsAuthError(response)) {
            return;
        }
        
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
        } else {
            alert('Failed to load settings. Please try again.');
        }
    } catch (err) {
        console.error('Failed to load settings:', err);
        showNotification('Failed to load settings: ' + err.message, 'error');
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
    const adminToken = document.getElementById('adminToken').value;
    
    if (!adminToken) {
        alert('Please enter your admin token to save settings');
        return;
    }
    
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
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(settings)
        });
        
        // Handle authentication errors
        if (await handleSettingsAuthError(response)) {
            return;
        }
        
        const data = await response.json();
        
        if (data.error) {
            showToast('Failed to save settings: ' + data.error, 'error');
        } else {
            showToast('Settings saved successfully! Please restart the server to apply changes.', 'success', 6000);
            updateAIStatus();
        }
    } catch (err) {
        showToast('Failed to save settings: ' + err.message, 'error');
            showNotification('Failed to save settings: ' + data.error, 'error');
        } else {
            showNotification(
                'Settings saved successfully!<br><br>' +
                '<strong>To apply changes:</strong><br>' +
                '1. Stop the server (Ctrl+C in terminal)<br>' +
                '2. Run <code>node server.js</code> again<br><br>' +
                'Or use <code>npm restart</code> if configured.',
                'success',
                8000,
                true // Allow HTML for formatted restart instructions
            );
            showNotification('Settings saved successfully! Please restart the server to apply changes.', 'success');
            updateAIStatus();
        }
    } catch (err) {
        showNotification('Failed to save settings: ' + err.message, 'error');
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
(function (originalShowPanel) {
    window.showPanel = function (panelName) {
        // Call original implementation if it exists
        if (typeof originalShowPanel === 'function') {
            originalShowPanel(panelName);
        }

        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.panel === panelName);
        });
        
        // Update panels
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `panel-${panelName}`);
        });
        
        // Note: Settings are no longer auto-loaded. Users must click "Load Settings" 
        // after entering their admin token for security reasons.
    };
})(window.showPanel);
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
        showToast('Copied to clipboard!', 'success', 2000);
        showNotification('Copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copied to clipboard!', 'success', 2000);
        showNotification('Copied to clipboard!', 'success');
    });
}

// MindMap Zoom and Pan functionality
let mindmapZoom = 1;
let mindmapPanX = 0;
let mindmapPanY = 0;
let isPanning = false;
let lastPanX = 0;
let lastPanY = 0;

function applyMindmapTransform() {
    const container = document.getElementById('mindmapNodes');
    if (!container) return;
    
    container.style.transform = `translate(${mindmapPanX}px, ${mindmapPanY}px) scale(${mindmapZoom})`;
    container.style.transformOrigin = '0 0';
}

function zoomInMindmap() {
    mindmapZoom = Math.min(mindmapZoom * 1.2, 3);
    applyMindmapTransform();
}

function zoomOutMindmap() {
    mindmapZoom = Math.max(mindmapZoom / 1.2, 0.3);
    applyMindmapTransform();
}

function resetZoomMindmap() {
    mindmapZoom = 1;
    mindmapPanX = 0;
    mindmapPanY = 0;
    applyMindmapTransform();
}

// Setup mindmap pan and pinch zoom for mobile
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('mindmapContainer');
    if (!container) return;
    
    // Mouse pan
    container.addEventListener('mousedown', function(e) {
        if (e.target === container || e.target.tagName === 'svg' || e.target.id === 'mindmapNodes') {
            isPanning = true;
            lastPanX = e.clientX;
            lastPanY = e.clientY;
            container.style.cursor = 'grabbing';
        }
    });
    
    document.addEventListener('mousemove', function(e) {
        if (isPanning) {
            const dx = e.clientX - lastPanX;
            const dy = e.clientY - lastPanY;
            mindmapPanX += dx;
            mindmapPanY += dy;
            lastPanX = e.clientX;
            lastPanY = e.clientY;
            applyMindmapTransform();
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (isPanning) {
            isPanning = false;
            container.style.cursor = '';
        }
    });
    
    // Touch pan
    let touchStartX = 0;
    let touchStartY = 0;
    let initialPinchDistance = 0;
    let initialZoom = 1;
    
    container.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            // Pinch zoom start
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
            initialZoom = mindmapZoom;
        }
    }, { passive: true });
    
    container.addEventListener('touchmove', function(e) {
        if (e.touches.length === 1) {
            // Pan
            const dx = e.touches[0].clientX - touchStartX;
            const dy = e.touches[0].clientY - touchStartY;
            mindmapPanX += dx;
            mindmapPanY += dy;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            applyMindmapTransform();
        } else if (e.touches.length === 2) {
            // Pinch zoom
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const scale = distance / initialPinchDistance;
            mindmapZoom = Math.max(0.3, Math.min(3, initialZoom * scale));
            applyMindmapTransform();
        }
    }, { passive: true });
    
    // Mouse wheel zoom
    container.addEventListener('wheel', function(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        mindmapZoom = Math.max(0.3, Math.min(3, mindmapZoom * delta));
        applyMindmapTransform();
    });
});
