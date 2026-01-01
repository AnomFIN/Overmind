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
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
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

// ==================== Neon Effects & Tech Animations ====================

function initNeonEffects() {
    // Clean up existing intervals
    if (activeIntervals.glitchEffect) {
        clearInterval(activeIntervals.glitchEffect);
    }
    
    // Add glitch effect to logo
    const logo = document.querySelector('.logo-image');
    if (logo) {
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
        
        // If all notes are currently public, make them all private; otherwise, make them all public
        const publicCount = notes.filter(note => note.isPublic).length;
        const makePublic = publicCount !== notes.length;
        
        const action = makePublic ? 'public' : 'private';
        showNotification(`Making all notes ${action}...`, 'info');
        
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
            showNotification('Failed to save settings: ' + data.error, 'error');
        } else {
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
