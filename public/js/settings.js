/**
 * Settings Management
 * Handles personas, branding, and camera settings
 */

// Settings tab switching
document.addEventListener('DOMContentLoaded', function() {
    // Setup settings tabs
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Update active tab
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding content
            document.querySelectorAll('.settings-tab-content').forEach(content => {
                content.style.display = 'none';
            });
            document.getElementById(tabName + '-tab').style.display = 'block';
        });
    });
    
    // Load settings data when settings panel is shown
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.id === 'panel-settings' && !mutation.target.classList.contains('active')) {
                return;
            }
            if (mutation.target.id === 'panel-settings' && mutation.target.classList.contains('active')) {
                loadPersonas();
                loadBranding();
                loadCameraSettings();
            }
        });
    });
    
    const settingsPanel = document.getElementById('panel-settings');
    if (settingsPanel) {
        observer.observe(settingsPanel, { attributes: true, attributeFilter: ['class'] });
    }
});

// ===== Personas Management =====

let personas = [];

async function loadPersonas() {
    try {
        const response = await fetch('/api/settings/personas', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.error('Failed to load personas');
            return;
        }
        
        const data = await response.json();
        personas = data.personas;
        renderPersonas();
    } catch (err) {
        console.error('Error loading personas:', err);
    }
}

function renderPersonas() {
    const list = document.getElementById('personasList');
    
    if (personas.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: var(--space-2xl); color: var(--color-text-secondary);">No personas yet. Create your first AI persona!</div>';
        return;
    }
    
    list.innerHTML = personas.map(persona => `
        <div class="settings-item" style="display: flex; justify-content: space-between; align-items: start; padding: var(--space-lg); background: var(--color-bg-secondary); border: 1px solid var(--color-border-primary); border-radius: var(--radius-md); margin-bottom: var(--space-md);">
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-sm);">
                    <h4 style="margin: 0;">${escapeHtml(persona.name)}</h4>
                    ${persona.isDefault ? '<span style="background: var(--color-accent-primary); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">DEFAULT</span>' : ''}
                    ${!persona.enabled ? '<span style="background: #6b7280; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">DISABLED</span>' : ''}
                </div>
                <p style="margin: 0 0 var(--space-sm) 0; font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                    ${escapeHtml(persona.systemPrompt.substring(0, 120))}${persona.systemPrompt.length > 120 ? '...' : ''}
                </p>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">
                    Model: ${persona.model} | Temperature: ${persona.temperature}
                </div>
            </div>
            <div style="display: flex; gap: var(--space-sm);">
                <button class="btn btn-secondary" onclick="editPersona('${persona.id}')" style="padding: var(--space-sm) var(--space-md);">Edit</button>
                <button class="btn btn-danger" onclick="deletePersona('${persona.id}')" style="padding: var(--space-sm) var(--space-md);">Delete</button>
            </div>
        </div>
    `).join('');
}

function showCreatePersonaModal() {
    document.getElementById('personaModalTitle').textContent = 'Create AI Persona';
    document.getElementById('personaForm').reset();
    document.getElementById('personaId').value = '';
    document.getElementById('personaEnabled').checked = true;
    document.getElementById('personaDefault').checked = false;
    openModal('personaModal');
}

function editPersona(id) {
    const persona = personas.find(p => p.id === id);
    if (!persona) return;
    
    document.getElementById('personaModalTitle').textContent = 'Edit AI Persona';
    document.getElementById('personaId').value = persona.id;
    document.getElementById('personaName').value = persona.name;
    document.getElementById('personaPrompt').value = persona.systemPrompt;
    document.getElementById('personaTemperature').value = persona.temperature;
    document.getElementById('personaModel').value = persona.model;
    document.getElementById('personaEnabled').checked = persona.enabled;
    document.getElementById('personaDefault').checked = persona.isDefault;
    
    openModal('personaModal');
}

async function savePersona(event) {
    event.preventDefault();
    
    const id = document.getElementById('personaId').value;
    const data = {
        name: document.getElementById('personaName').value,
        systemPrompt: document.getElementById('personaPrompt').value,
        temperature: parseFloat(document.getElementById('personaTemperature').value),
        model: document.getElementById('personaModel').value,
        enabled: document.getElementById('personaEnabled').checked,
        isDefault: document.getElementById('personaDefault').checked
    };
    
    try {
        const url = id ? `/api/settings/personas/${id}` : '/api/settings/personas';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            alert(error.message || 'Failed to save persona');
            return;
        }
        
        closeModal('personaModal');
        loadPersonas();
        showToast('Persona saved successfully', 'success');
    } catch (err) {
        console.error('Error saving persona:', err);
        alert('Network error. Please try again.');
    }
}

async function deletePersona(id) {
    if (!confirm('Are you sure you want to delete this persona?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/settings/personas/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            const error = await response.json();
            alert(error.message || 'Failed to delete persona');
            return;
        }
        
        loadPersonas();
        showToast('Persona deleted', 'success');
    } catch (err) {
        console.error('Error deleting persona:', err);
        alert('Network error. Please try again.');
    }
}

// ===== Branding Management =====

async function loadBranding() {
    try {
        const response = await fetch('/api/settings/config', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.error('Failed to load branding');
            return;
        }
        
        const data = await response.json();
        const config = data.config;
        
        document.getElementById('logoUrl').value = config.logoUrl || '';
        document.getElementById('backgroundUrl').value = config.backgroundUrl || '';
        document.getElementById('appName').value = config.appName || '';
        document.getElementById('primaryColor').value = config.primaryColor || '#4a9eff';
    } catch (err) {
        console.error('Error loading branding:', err);
    }
}

async function saveBranding(event) {
    event.preventDefault();
    
    const data = {
        logoUrl: document.getElementById('logoUrl').value,
        backgroundUrl: document.getElementById('backgroundUrl').value,
        appName: document.getElementById('appName').value,
        primaryColor: document.getElementById('primaryColor').value
    };
    
    try {
        const response = await fetch('/api/settings/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            alert(error.message || 'Failed to save branding');
            return;
        }
        
        showToast('Branding saved successfully', 'success');
    } catch (err) {
        console.error('Error saving branding:', err);
        alert('Network error. Please try again.');
    }
}

// ===== Camera Settings Management =====

let cameraSettings = [];

async function loadCameraSettings() {
    try {
        const response = await fetch('/api/settings/cameras', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.error('Failed to load camera settings');
            return;
        }
        
        const data = await response.json();
        cameraSettings = data.cameras;
        renderCameraSettings();
    } catch (err) {
        console.error('Error loading camera settings:', err);
    }
}

function renderCameraSettings() {
    const list = document.getElementById('cameraSettingsList');
    
    if (cameraSettings.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: var(--space-2xl); color: var(--color-text-secondary);">No cameras configured. Add your first camera source!</div>';
        return;
    }
    
    list.innerHTML = cameraSettings.map(camera => `
        <div class="settings-item" style="display: flex; justify-content: space-between; align-items: start; padding: var(--space-lg); background: var(--color-bg-secondary); border: 1px solid var(--color-border-primary); border-radius: var(--radius-md); margin-bottom: var(--space-md);">
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-sm);">
                    <h4 style="margin: 0;">${escapeHtml(camera.name)}</h4>
                    ${!camera.enabled ? '<span style="background: #6b7280; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">DISABLED</span>' : ''}
                </div>
                <p style="margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); font-family: var(--font-mono);">
                    ${escapeHtml(camera.url)}
                </p>
            </div>
            <div style="display: flex; gap: var(--space-sm);">
                <button class="btn btn-secondary" onclick="editCameraSettings('${camera.id}')" style="padding: var(--space-sm) var(--space-md);">Edit</button>
                <button class="btn btn-danger" onclick="deleteCameraSettings('${camera.id}')" style="padding: var(--space-sm) var(--space-md);">Delete</button>
            </div>
        </div>
    `).join('');
}

function showAddCameraSettingsModal() {
    document.getElementById('cameraSettingsModalTitle').textContent = 'Add Camera Source';
    document.getElementById('cameraSettingsForm').reset();
    document.getElementById('cameraSettingsId').value = '';
    document.getElementById('cameraSettingsEnabled').checked = true;
    openModal('cameraSettingsModal');
}

function editCameraSettings(id) {
    const camera = cameraSettings.find(c => c.id === id);
    if (!camera) return;
    
    document.getElementById('cameraSettingsModalTitle').textContent = 'Edit Camera Source';
    document.getElementById('cameraSettingsId').value = camera.id;
    document.getElementById('cameraSettingsName').value = camera.name;
    document.getElementById('cameraSettingsUrl').value = camera.url;
    document.getElementById('cameraSettingsEnabled').checked = camera.enabled;
    
    openModal('cameraSettingsModal');
}

async function saveCameraSettings(event) {
    event.preventDefault();
    
    const id = document.getElementById('cameraSettingsId').value;
    const data = {
        name: document.getElementById('cameraSettingsName').value,
        url: document.getElementById('cameraSettingsUrl').value,
        enabled: document.getElementById('cameraSettingsEnabled').checked
    };
    
    try {
        const url = id ? `/api/settings/cameras/${id}` : '/api/settings/cameras';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            alert(error.message || 'Failed to save camera');
            return;
        }
        
        closeModal('cameraSettingsModal');
        loadCameraSettings();
        showToast('Camera saved successfully', 'success');
    } catch (err) {
        console.error('Error saving camera:', err);
        alert('Network error. Please try again.');
    }
}

async function deleteCameraSettings(id) {
    if (!confirm('Are you sure you want to delete this camera?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/settings/cameras/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            const error = await response.json();
            alert(error.message || 'Failed to delete camera');
            return;
        }
        
        loadCameraSettings();
        showToast('Camera deleted', 'success');
    } catch (err) {
        console.error('Error deleting camera:', err);
        alert('Network error. Please try again.');
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: var(--space-md) var(--space-lg);
        background: ${type === 'success' ? 'var(--color-success)' : 'var(--color-accent-primary)'};
        color: white;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-xl);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
