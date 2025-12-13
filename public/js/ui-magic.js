/**
 * Overmind UI Magic - Interactive Enhancements
 * Ship intelligence, not excuses.
 * 
 * LED inputs, toasts, keypress feedback, and micro-interactions
 */

// ==================== Constants ====================

const KEYPRESS_THROTTLE_MS = 120;

// ==================== LED Input Keypress Feedback ====================

let keypressThrottle = {};

function initLEDInputs() {
    // Find all input-led-wrapper elements
    const ledWrappers = document.querySelectorAll('.input-led-wrapper');
    
    ledWrappers.forEach(wrapper => {
        const input = wrapper.querySelector('input, textarea');
        if (!input) return;
        
        // Keypress micro-shake feedback (throttled)
        input.addEventListener('keydown', (e) => {
            // Skip for navigation keys
            if (['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                return;
            }
            
            const now = Date.now();
            const inputId = input.id || input.name || 'unknown';
            
            // Throttle: only shake once per KEYPRESS_THROTTLE_MS
            if (!keypressThrottle[inputId] || now - keypressThrottle[inputId] > KEYPRESS_THROTTLE_MS) {
                wrapper.classList.add('shake');
                keypressThrottle[inputId] = now;
                
                // Remove shake class after animation
                setTimeout(() => {
                    wrapper.classList.remove('shake');
                }, KEYPRESS_THROTTLE_MS);
            }
        });
        
        // Caps lock warning for password inputs
        if (input.type === 'password') {
            const capsWarning = document.createElement('div');
            capsWarning.className = 'caps-lock-warning';
            capsWarning.innerHTML = '<span>⚠️</span><span>Caps Lock is on</span>';
            wrapper.parentNode.insertBefore(capsWarning, wrapper.nextSibling);
            
            input.addEventListener('keydown', (e) => {
                if (e.getModifierState && e.getModifierState('CapsLock')) {
                    capsWarning.classList.add('active');
                } else {
                    capsWarning.classList.remove('active');
                }
            });
            
            input.addEventListener('blur', () => {
                capsWarning.classList.remove('active');
            });
        }
    });
}

// ==================== Form Validation with LED States ====================

function setInputState(inputOrWrapper, state) {
    let wrapper;
    
    if (inputOrWrapper.classList.contains('input-led-wrapper')) {
        wrapper = inputOrWrapper;
    } else {
        wrapper = inputOrWrapper.closest('.input-led-wrapper');
    }
    
    if (!wrapper) return;
    
    // Remove all state classes
    wrapper.classList.remove('error', 'success', 'warning');
    
    // Add new state
    if (state) {
        wrapper.classList.add(state);
    }
}

function validateInput(input, rules = {}) {
    const value = input.value.trim();
    const wrapper = input.closest('.input-led-wrapper');
    
    if (!wrapper) return true;
    
    // Required check
    if (rules.required && !value) {
        setInputState(wrapper, 'error');
        return false;
    }
    
    // Email validation
    if (rules.email && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            setInputState(wrapper, 'error');
            return false;
        }
    }
    
    // Min length
    if (rules.minLength && value.length < rules.minLength) {
        setInputState(wrapper, 'error');
        return false;
    }
    
    // URL validation
    if (rules.url && value) {
        try {
            new URL(value);
        } catch (error) {
            setInputState(wrapper, 'error');
            return false;
        }
    }
    
    // If all validations pass
    if (value) {
        setInputState(wrapper, 'success');
    } else {
        setInputState(wrapper, null);
    }
    
    return true;
}

// ==================== Toast Notifications ====================

let toastContainer = null;
let toastIdCounter = 0;

function initToasts() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
}

function showToast(options = {}) {
    initToasts();
    
    const {
        title = '',
        message = '',
        type = 'info', // success, error, warning, info
        duration = 4000,
        icon = null
    } = options;
    
    const toastId = `toast-${++toastIdCounter}`;
    
    // Default icons
    const defaultIcons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const toastIcon = icon || defaultIcons[type] || '•';
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = toastId;
    toast.innerHTML = `
        <div class="toast-icon">${toastIcon}</div>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
        <button class="toast-close" onclick="closeToast('${toastId}')">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            closeToast(toastId);
        }, duration);
    }
    
    return toastId;
}

function closeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (!toast) return;
    
    toast.classList.add('toast-exit');
    
    setTimeout(() => {
        toast.remove();
        
        // Clean up container if empty
        if (toastContainer && toastContainer.children.length === 0) {
            toastContainer.remove();
            toastContainer = null;
        }
    }, 200);
}

// Toast helper functions
window.showToast = showToast;
window.closeToast = closeToast;

window.toast = {
    success: (message, title = 'Success') => showToast({ type: 'success', title, message }),
    error: (message, title = 'Error') => showToast({ type: 'error', title, message, duration: 6000 }),
    warning: (message, title = 'Warning') => showToast({ type: 'warning', title, message }),
    info: (message, title = 'Info') => showToast({ type: 'info', title, message })
};

// ==================== Password Strength Meter ====================

function calculatePasswordStrength(password) {
    let strength = 0;
    
    if (!password) return { strength: 0, label: '' };
    
    // Length
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    
    // Character variety
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
    
    // Determine level
    let level, label;
    if (strength <= 2) {
        level = 'weak';
        label = 'Weak';
    } else if (strength <= 4) {
        level = 'medium';
        label = 'Medium';
    } else {
        level = 'strong';
        label = 'Strong';
    }
    
    return { level, label, strength };
}

function initPasswordStrength(passwordInput) {
    const wrapper = passwordInput.closest('.input-led-wrapper') || passwordInput.parentElement;
    
    // Create strength meter if it doesn't exist
    let strengthMeter = wrapper.parentElement.querySelector('.password-strength');
    if (!strengthMeter) {
        strengthMeter = document.createElement('div');
        strengthMeter.className = 'password-strength';
        strengthMeter.innerHTML = `
            <div class="password-strength-bar">
                <div class="password-strength-fill"></div>
            </div>
            <div class="password-strength-text"></div>
        `;
        wrapper.parentElement.insertBefore(strengthMeter, wrapper.nextSibling);
    }
    
    const fill = strengthMeter.querySelector('.password-strength-fill');
    const text = strengthMeter.querySelector('.password-strength-text');
    
    passwordInput.addEventListener('input', () => {
        const { level, label } = calculatePasswordStrength(passwordInput.value);
        
        fill.className = `password-strength-fill ${level}`;
        text.textContent = passwordInput.value ? `Password strength: ${label}` : '';
    });
}

// ==================== Password Toggle ====================

function initPasswordToggle(passwordInput) {
    const wrapper = passwordInput.closest('.password-wrapper') || 
                   passwordInput.closest('.input-led-wrapper') ||
                   passwordInput.parentElement;
    
    // Create toggle button if it doesn't exist
    let toggleBtn = wrapper.querySelector('.password-toggle');
    if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'password-toggle';
        toggleBtn.textContent = 'Show';
        wrapper.style.position = 'relative';
        wrapper.appendChild(toggleBtn);
    }
    
    toggleBtn.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleBtn.textContent = 'Hide';
        } else {
            passwordInput.type = 'password';
            toggleBtn.textContent = 'Show';
        }
    });
}

// ==================== Skeleton Loaders ====================

function showSkeleton(container, type = 'card', count = 1) {
    const skeletons = [];
    
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = `skeleton skeleton-${type}`;
        skeletons.push(skeleton);
        container.appendChild(skeleton);
    }
    
    return skeletons;
}

function hideSkeleton(container) {
    const skeletons = container.querySelectorAll('.skeleton');
    skeletons.forEach(s => s.remove());
}

window.showSkeleton = showSkeleton;
window.hideSkeleton = hideSkeleton;

// ==================== Initialize on DOM Ready ====================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init() {
    initLEDInputs();
    
    // Initialize password features for all password inputs
    document.querySelectorAll('input[type="password"]').forEach(input => {
        // Only init if parent has specific class or data attribute
        if (input.closest('.password-wrapper') || input.dataset.strengthMeter) {
            initPasswordStrength(input);
        }
        if (input.closest('.password-wrapper') || input.dataset.toggleable) {
            initPasswordToggle(input);
        }
    });
}

// Export for use in other scripts
window.OvermindUI = {
    initLEDInputs,
    setInputState,
    validateInput,
    showToast,
    closeToast,
    toast,
    initPasswordStrength,
    initPasswordToggle,
    showSkeleton,
    hideSkeleton
};
