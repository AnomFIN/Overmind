/**
 * Settings Route
 * System configuration management
 * Settings Routes (Admin Only)
 * Manages personas, app config, and cameras
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const crypto = require('crypto');

const SETTINGS_FILE = path.join(__dirname, '..', '..', '.env');

// Security constants
const MIN_SECRET_LENGTH = 32;
const WEAK_SECRETS = ['your_secret_key_here', 'secret', 'password', '123456'];

/**
 * Generate a cryptographically secure random secret
 */
function generateSecureSecret() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate session secret for security requirements
 * @param {string} secret - The secret to validate
 * @returns {object} - {valid: boolean, error: string}
 */
function validateSessionSecret(secret) {
    if (!secret || typeof secret !== 'string') {
        return { valid: false, error: 'Session secret is required' };
    }

    // Check for weak/common secrets
    const secretLower = secret.toLowerCase();
    if (WEAK_SECRETS.some(weak => secretLower === weak.toLowerCase())) {
        return { valid: false, error: 'Session secret is too weak. Please use a strong, unique secret.' };
    }

    // Check minimum length
    if (secret.length < MIN_SECRET_LENGTH) {
        return { 
            valid: false, 
            error: `Session secret must be at least ${MIN_SECRET_LENGTH} characters long for security.` 
        };
    }

    return { valid: true };
}

/**
 * Authentication middleware for settings routes
 * Checks for a simple admin key in environment or session
 * 
 * SECURITY WARNING: This is a basic implementation.
 * For production use, implement proper authentication with:
 * - User sessions (express-session)
 * - Password hashing (bcrypt)
 * - HTTPS/TLS encryption
 */
function requireAuth(req, res, next) {
    // Check if ADMIN_KEY is configured in environment
    const adminKey = process.env.ADMIN_KEY;
    
    // If no admin key is configured, log a warning and allow access
    // This maintains backward compatibility but warns about the security risk
    if (!adminKey) {
        console.warn('[Settings] WARNING: No ADMIN_KEY configured. Settings endpoint is unprotected!');
        console.warn('[Settings] Set ADMIN_KEY in .env file to secure settings access.');
        return next();
    }
    
    // Check for admin key in request header
    const providedKey = req.headers['x-admin-key'];
    
    if (providedKey !== adminKey) {
        return res.status(401).json({ 
            error: 'Authentication required. Provide X-Admin-Key header with valid admin key.',
            hint: 'Configure ADMIN_KEY in .env file for settings access control.'
        });
    }
    
    next();
}

/**
 * Generate a secure random secret
 */
function generateSecureSecret() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate session secret meets minimum security requirements
 */
function validateSessionSecret(secret) {
    if (!secret || secret === 'your_secret_key_here') {
        return false;
    }
    // Minimum 16 characters for security
    if (secret.length < 16) {
        return false;
    }
    return true;
}

/**
 * Validate file path to prevent directory traversal attacks
 */
function validateFilePath(filePath) {
    if (!filePath) return true; // Empty is allowed
    
    // Resolve to absolute path
    const resolvedPath = path.resolve(filePath);
    
    // Define a safe base directory (e.g., user's home or a specific data directory)
    // For now, we'll ensure the path is an absolute path and doesn't contain null bytes
    if (resolvedPath.includes('\0')) {
        return false;
    }
    
    // Check if path exists and is a directory
    try {
        if (fs.existsSync(resolvedPath)) {
            const stat = fs.statSync(resolvedPath);
            if (!stat.isDirectory()) {
                return false;
            }
        }
    } catch (err) {
        return false;
    }
    
    return true;
}

/**
 * Read current settings from .env file
 */
function readEnvSettings() {
    const settings = {};
    
    if (fs.existsSync(SETTINGS_FILE)) {
        const envContent = fs.readFileSync(SETTINGS_FILE, 'utf8');
        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                const value = valueParts.join('=');
                if (key && value !== undefined) {
                    settings[key.trim()] = value.trim();
                }
            }
        });
    }
    
    return settings;
}

/**
 * Write settings to .env file
 * 
 * SECURITY NOTE: This function writes sensitive data (API keys, session secrets) 
 * to the .env file. The .env file is excluded from version control via .gitignore
 * to prevent accidentally committing credentials. Never commit .env files to git.
 */
function writeEnvSettings(settings) {
    let content = '# AnomHome Overmind Configuration\n';
    content += '# Generated by settings panel\n\n';
    content += '# Server Configuration\n';
    content += `PORT=${process.env.PORT || 3000}\n`;
    content += `HOST=${process.env.HOST || '0.0.0.0'}\n\n`;
    
    content += '# AI Configuration\n';
    if (settings.aiProvider === 'local') {
        content += `AI_PROVIDER=local\n`;
        content += `LOCAL_MODEL_PATH=${settings.localModelPath || ''}\n`;
        content += `MODEL_CONTEXT_SIZE=${settings.modelContextSize || 4096}\n`;
        content += `LOCAL_SERVER_PORT=${settings.localServerPort || 8080}\n`;
    } else {
        content += `AI_PROVIDER=openai\n`;
        content += `OPENAI_API_KEY=${settings.openaiKey || ''}\n`;
    }
    content += '\n';
    
    content += '# File Browser Configuration\n';
    content += `FILE_BROWSER_ROOT=${settings.fileRoot || ''}\n\n`;
    
    content += '# Upload Configuration\n';
    content += `MAX_UPLOAD_SIZE=${settings.maxUploadSize || 100}\n\n`;
    
    content += '# Security\n';
    content += `SECRET_KEY=${settings.sessionSecret || 'your_secret_key_here'}\n`;
    content += `ADMIN_TOKEN=${process.env.ADMIN_TOKEN || ''}\n`;
    // Validate and write session secret - never use weak defaults
    const validation = validateSessionSecret(settings.sessionSecret);
    if (validation.valid) {
        content += `SECRET_KEY=${settings.sessionSecret}\n`;
    } else {
        // If no valid secret provided, generate a secure one
        const secureSecret = generateSecureSecret();
        content += `SECRET_KEY=${secureSecret}\n`;
        console.warn('[Settings] Generated new secure session secret');
    }
    
    fs.writeFileSync(SETTINGS_FILE, content, 'utf8');
}

/**
 * GET /api/settings
 * Get current settings
 * Requires authentication
 */
router.get('/', requireAuth, (req, res) => {
    try {
        const envSettings = readEnvSettings();
        
        const settings = {
            aiProvider: envSettings.AI_PROVIDER || 'openai',
            // Never send the actual API key to the client
            openaiKey: envSettings.OPENAI_API_KEY ? '****' : '',
            localModelPath: envSettings.LOCAL_MODEL_PATH || '',
            modelContextSize: parseInt(envSettings.MODEL_CONTEXT_SIZE) || 4096,
            localServerPort: parseInt(envSettings.LOCAL_SERVER_PORT) || 8080,
            fileRoot: envSettings.FILE_BROWSER_ROOT || '',
            maxUploadSize: parseInt(envSettings.MAX_UPLOAD_SIZE) || 100,
            sessionSecret: envSettings.SECRET_KEY ? '****' : '' // Hide actual secret
        };
        
        res.json(settings);
        
    } catch (err) {
        console.error('[Settings] Get error:', err.message);
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

/**
 * POST /api/settings
 * Update settings
 * Requires authentication
 */
router.post('/', requireAuth, (req, res) => {
    try {
        const {
            aiProvider,
            openaiKey,
            localModelPath,
            modelContextSize,
            localServerPort,
            fileRoot,
            maxUploadSize,
            sessionSecret
        } = req.body;

        // Validate required fields based on AI provider
        if (aiProvider === 'openai' && !openaiKey) {
            return res.status(400).json({ error: 'OpenAI API key is required' });
        }

        if (aiProvider === 'local' && !localModelPath) {
            return res.status(400).json({ error: 'Local model path is required' });
        }
        
        // Validate session secret
        if (sessionSecret && sessionSecret !== '****' && !validateSessionSecret(sessionSecret)) {
            return res.status(400).json({ 
                error: 'Session secret must be at least 16 characters long and cannot be the default value.' 
            });
        }
        
        // Validate file root path for security
        if (fileRoot && !validateFilePath(fileRoot)) {
            return res.status(400).json({ 
                error: 'Invalid file root path. Path must not contain null bytes and must be a valid directory.' 
            });
        }
        
        // Validate numeric configuration values if provided
        let validatedModelContextSize = modelContextSize;
        if (modelContextSize !== undefined && modelContextSize !== null && modelContextSize !== '') {
            const parsedModelContextSize = parseInt(modelContextSize, 10);
            if (!Number.isFinite(parsedModelContextSize) || parsedModelContextSize <= 0 || parsedModelContextSize > 1000000) {
                return res.status(400).json({ 
                    error: 'Model context size must be a positive integer between 1 and 1,000,000.' 
                });
            }
            validatedModelContextSize = parsedModelContextSize;
        }
        
        let validatedLocalServerPort = localServerPort;
        if (localServerPort !== undefined && localServerPort !== null && localServerPort !== '') {
            const parsedLocalServerPort = parseInt(localServerPort, 10);
            // Restrict to non-privileged ports
            if (!Number.isFinite(parsedLocalServerPort) || parsedLocalServerPort < 1024 || parsedLocalServerPort > 65535) {
                return res.status(400).json({ 
                    error: 'Server port must be between 1024 and 65535.' 
                });
            }
            validatedLocalServerPort = parsedLocalServerPort;
        }
        
        let validatedMaxUploadSize = maxUploadSize;
        if (maxUploadSize !== undefined && maxUploadSize !== null && maxUploadSize !== '') {
            const parsedMaxUploadSize = parseInt(maxUploadSize, 10);
            // Limit to reasonable upload sizes (1MB to 1GB)
            if (!Number.isFinite(parsedMaxUploadSize) || parsedMaxUploadSize <= 0 || parsedMaxUploadSize > 1000) {
                return res.status(400).json({ 
                    error: 'Max upload size must be between 1 and 1000 MB.' 
                });
            }
            validatedMaxUploadSize = parsedMaxUploadSize;
        }
        
        // Read current settings to preserve API key if masked
        const currentSettings = readEnvSettings();
        const finalOpenaiKey = (openaiKey && openaiKey !== '****') ? openaiKey : currentSettings.OPENAI_API_KEY;
        const finalSessionSecret = (sessionSecret && sessionSecret !== '****') ? sessionSecret : currentSettings.SECRET_KEY;
        
        // Generate secure secret if none provided or invalid
        let finalSecret = finalSessionSecret;
        if (!finalSecret || !validateSessionSecret(finalSecret)) {
            finalSecret = generateSecureSecret();
            console.log('[Settings] Generated new secure session secret');
        }
        
                return res.status(400).json({ error: 'modelContextSize must be a positive integer between 1 and 1000000.' });
            }
            validatedModelContextSize = parsedModelContextSize;
        }

        let validatedLocalServerPort = localServerPort;
        if (localServerPort !== undefined && localServerPort !== null && localServerPort !== '') {
            const parsedLocalServerPort = parseInt(localServerPort, 10);
            if (!Number.isFinite(parsedLocalServerPort) || parsedLocalServerPort < 1024 || parsedLocalServerPort > 65535) {
                return res.status(400).json({ error: 'localServerPort must be a valid TCP port between 1024 and 65535 (non-privileged ports only).' });
            }
            validatedLocalServerPort = parsedLocalServerPort;
        }

        let validatedMaxUploadSize = maxUploadSize;
        if (maxUploadSize !== undefined && maxUploadSize !== null && maxUploadSize !== '') {
            const parsedMaxUploadSize = parseInt(maxUploadSize, 10);
            if (!Number.isFinite(parsedMaxUploadSize) || parsedMaxUploadSize <= 0 || parsedMaxUploadSize > 1000000000) {
                return res.status(400).json({ error: 'maxUploadSize must be a positive integer between 1 and 1000000000.' });
            }
            validatedMaxUploadSize = parsedMaxUploadSize;
        }

        // Validate or generate session secret
        let validatedSessionSecret = sessionSecret;
        if (sessionSecret && sessionSecret !== '****') {
            // User provided a secret, validate it
            const validation = validateSessionSecret(sessionSecret);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }
        } else {
            // No secret provided or placeholder, read existing or generate new
            const envSettings = readEnvSettings();
            const existingSecret = envSettings.SECRET_KEY;
            
            // Check if existing secret is valid
            if (existingSecret && validateSessionSecret(existingSecret).valid) {
                validatedSessionSecret = existingSecret;
            } else {
                // Generate a new secure secret
                validatedSessionSecret = generateSecureSecret();
                console.warn('[Settings] Generated new secure session secret');
            }
        }

        // Write settings to .env file
        writeEnvSettings({
            aiProvider,
            openaiKey: finalOpenaiKey,
            localModelPath,
            modelContextSize: validatedModelContextSize,
            localServerPort: validatedLocalServerPort,
            fileRoot,
            maxUploadSize: validatedMaxUploadSize,
            sessionSecret: validatedSessionSecret
            sessionSecret: finalSecret
        });

        res.json({
            success: true,
            message: 'Settings saved successfully. Restart the server to apply changes.'
        });
    } catch (err) {
        console.error('[Settings] Update error:', err.message);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

module.exports = router;

/**
 * Create settings router with dependencies
 */
function createSettingsRouter(storage, authMiddleware) {
    
    // Middleware to require admin role
    const requireAdmin = async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Please log in to access this resource'
            });
        }
        
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Admin access required'
            });
        }
        
        next();
    };
    
    // Apply auth middleware to all routes
    router.use(authMiddleware);
    router.use(requireAdmin);
    
    // ===== Persona Routes =====
    
    /**
     * GET /api/settings/personas
     * Get all personas
     */
    router.get('/personas', async (req, res) => {
        try {
            const personas = await storage.getPersonas();
            res.json({
                success: true,
                personas
            });
        } catch (err) {
            console.error('[Settings] Get personas error:', err.message);
            res.status(500).json({
                error: 'Failed to fetch personas',
                message: err.message
            });
        }
    });
    
    /**
     * POST /api/settings/personas
     * Create new persona
     */
    router.post('/personas', async (req, res) => {
        try {
            const { name, systemPrompt, temperature, model, enabled, isDefault } = req.body;
            
            if (!name || !systemPrompt) {
                return res.status(400).json({
                    error: 'Missing required fields',
                    message: 'Name and system prompt are required'
                });
            }
            
            // If setting as default, unset other defaults
            if (isDefault) {
                const personas = await storage.getPersonas();
                for (const persona of personas) {
                    if (persona.isDefault) {
                        await storage.updatePersona(persona.id, { isDefault: false });
                    }
                }
            }
            
            const persona = await storage.createPersona({
                name,
                systemPrompt,
                temperature,
                model,
                enabled,
                isDefault
            });
            
            res.status(201).json({
                success: true,
                message: 'Persona created successfully',
                persona
            });
        } catch (err) {
            console.error('[Settings] Create persona error:', err.message);
            res.status(500).json({
                error: 'Failed to create persona',
                message: err.message
            });
        }
    });
    
    /**
     * PUT /api/settings/personas/:id
     * Update persona
     */
    router.put('/personas/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, systemPrompt, temperature, model, enabled, isDefault } = req.body;
            
            // If setting as default, unset other defaults
            if (isDefault) {
                const personas = await storage.getPersonas();
                for (const persona of personas) {
                    if (persona.isDefault && persona.id !== id) {
                        await storage.updatePersona(persona.id, { isDefault: false });
                    }
                }
            }
            
            const persona = await storage.updatePersona(id, {
                name,
                systemPrompt,
                temperature,
                model,
                enabled,
                isDefault
            });
            
            if (!persona) {
                return res.status(404).json({
                    error: 'Persona not found',
                    message: 'The specified persona does not exist'
                });
            }
            
            res.json({
                success: true,
                message: 'Persona updated successfully',
                persona
            });
        } catch (err) {
            console.error('[Settings] Update persona error:', err.message);
            res.status(500).json({
                error: 'Failed to update persona',
                message: err.message
            });
        }
    });
    
    /**
     * DELETE /api/settings/personas/:id
     * Delete persona
     */
    router.delete('/personas/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            const deleted = await storage.deletePersona(id);
            
            if (!deleted) {
                return res.status(404).json({
                    error: 'Persona not found',
                    message: 'The specified persona does not exist'
                });
            }
            
            res.json({
                success: true,
                message: 'Persona deleted successfully'
            });
        } catch (err) {
            console.error('[Settings] Delete persona error:', err.message);
            res.status(500).json({
                error: 'Failed to delete persona',
                message: err.message
            });
        }
    });
    
    // ===== App Config Routes =====
    
    /**
     * GET /api/settings/config
     * Get app configuration
     */
    router.get('/config', async (req, res) => {
        try {
            const config = await storage.getAppConfig();
            res.json({
                success: true,
                config: config || {
                    logoUrl: 'images/overmind-logo-tp.png',
                    backgroundUrl: 'images/bg.png',
                    appName: 'Overmind',
                    primaryColor: '#4a9eff'
                }
            });
        } catch (err) {
            console.error('[Settings] Get config error:', err.message);
            res.status(500).json({
                error: 'Failed to fetch config',
                message: err.message
            });
        }
    });
    
    /**
     * PUT /api/settings/config
     * Update app configuration
     */
    router.put('/config', async (req, res) => {
        try {
            const { logoUrl, backgroundUrl, appName, primaryColor } = req.body;
            
            const config = await storage.updateAppConfig({
                logoUrl,
                backgroundUrl,
                appName,
                primaryColor
            });
            
            res.json({
                success: true,
                message: 'Configuration updated successfully',
                config
            });
        } catch (err) {
            console.error('[Settings] Update config error:', err.message);
            res.status(500).json({
                error: 'Failed to update config',
                message: err.message
            });
        }
    });
    
    // ===== Camera Routes =====
    
    /**
     * GET /api/settings/cameras
     * Get all camera sources
     */
    router.get('/cameras', async (req, res) => {
        try {
            const cameras = await storage.getCameras();
            res.json({
                success: true,
                cameras
            });
        } catch (err) {
            console.error('[Settings] Get cameras error:', err.message);
            res.status(500).json({
                error: 'Failed to fetch cameras',
                message: err.message
            });
        }
    });
    
    /**
     * POST /api/settings/cameras
     * Add new camera source
     */
    router.post('/cameras', async (req, res) => {
        try {
            const { name, url, enabled } = req.body;
            
            if (!name || !url) {
                return res.status(400).json({
                    error: 'Missing required fields',
                    message: 'Name and URL are required'
                });
            }
            
            // Validate URL - must be http or https
            try {
                const parsedUrl = new URL(url);
                if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                    return res.status(400).json({
                        error: 'Invalid URL',
                        message: 'Only HTTP and HTTPS URLs are allowed'
                    });
                }
            } catch (err) {
                return res.status(400).json({
                    error: 'Invalid URL',
                    message: 'Please provide a valid URL'
                });
            }
            
            const camera = await storage.createCamera({
                name,
                url,
                enabled
            });
            
            res.status(201).json({
                success: true,
                message: 'Camera added successfully',
                camera
            });
        } catch (err) {
            console.error('[Settings] Create camera error:', err.message);
            res.status(500).json({
                error: 'Failed to add camera',
                message: err.message
            });
        }
    });
    
    /**
     * PUT /api/settings/cameras/:id
     * Update camera source
     */
    router.put('/cameras/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, url, enabled } = req.body;
            
            // Validate URL if provided
            if (url) {
                try {
                    const parsedUrl = new URL(url);
                    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                        return res.status(400).json({
                            error: 'Invalid URL',
                            message: 'Only HTTP and HTTPS URLs are allowed'
                        });
                    }
                } catch (err) {
                    return res.status(400).json({
                        error: 'Invalid URL',
                        message: 'Please provide a valid URL'
                    });
                }
            }
            
            const camera = await storage.updateCamera(id, {
                name,
                url,
                enabled
            });
            
            if (!camera) {
                return res.status(404).json({
                    error: 'Camera not found',
                    message: 'The specified camera does not exist'
                });
            }
            
            res.json({
                success: true,
                message: 'Camera updated successfully',
                camera
            });
        } catch (err) {
            console.error('[Settings] Update camera error:', err.message);
            res.status(500).json({
                error: 'Failed to update camera',
                message: err.message
            });
        }
    });
    
    /**
     * DELETE /api/settings/cameras/:id
     * Delete camera source
     */
    router.delete('/cameras/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            const deleted = await storage.deleteCamera(id);
            
            if (!deleted) {
                return res.status(404).json({
                    error: 'Camera not found',
                    message: 'The specified camera does not exist'
                });
            }
            
            res.json({
                success: true,
                message: 'Camera deleted successfully'
            });
        } catch (err) {
            console.error('[Settings] Delete camera error:', err.message);
            res.status(500).json({
                error: 'Failed to delete camera',
                message: err.message
            });
        }
    });
    
    return router;
}

module.exports = createSettingsRouter;
