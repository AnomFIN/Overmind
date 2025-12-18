/**
 * Settings Routes (Admin Only)
 * Manages personas, app config, and cameras
 */

const express = require('express');
const router = express.Router();

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
