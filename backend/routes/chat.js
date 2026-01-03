/**
 * AI Chat Console Route
 * Supports both OpenAI API and local GGUF models
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

// Chat history storage (in-memory for simplicity)
const chatHistory = new Map();

/**
 * Make HTTPS request to OpenAI API
 */
function makeOpenAIRequest(apiKey, messages) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7
        });

        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (res.statusCode !== 200) {
                        reject(new Error(response.error?.message || `API error: ${res.statusCode}`));
                    } else {
                        resolve(response);
                    }
                } catch (e) {
                    reject(new Error('Invalid JSON response from OpenAI'));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

/**
 * Make HTTP request to local llama-server
 * llama-server is built with CMake and exposes a v1-compatible API
 */
function makeLocalModelRequest(messages, port) {
    return new Promise((resolve, reject) => {
        // Format request for llama-server (built with CMake)
        const data = JSON.stringify({
            model: 'local', // llama-server ignores this but expects it
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7,
            stream: false
        });

        const options = {
            hostname: 'localhost',
            port: port,
            path: '/v1/chat/completions', // llama-server v1-compatible endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        console.log(`[Chat] Connecting to llama-server at localhost:${port}`);
        
        const req = require('http').request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log(`[Chat] llama-server responded with status: ${res.statusCode}`);
                console.log(`[Chat] Response headers:`, res.headers);
                
                try {
                    if (body.trim() === '') {
                        reject(new Error('Empty response from llama-server'));
                        return;
                    }
                    
                    let response;
                    try {
                        response = JSON.parse(body);
                    } catch (parseError) {
                        console.error('[Chat] llama-server JSON parse error:', parseError.message);
                        console.error('[Chat] Raw response body:', body.substring(0, 500));
                        reject(new Error(`Invalid JSON from llama-server: ${parseError.message}. Response: ${body.substring(0, 200)}`));
                        return;
                    }
                    
                    if (res.statusCode !== 200) {
                        console.error('[Chat] llama-server HTTP error:', res.statusCode, response);
                        const errorMsg = response.error?.message || response.detail || response.message || `HTTP ${res.statusCode}`;
                        reject(new Error(`llama-server error: ${errorMsg}`));
                    } else {
                        console.log('[Chat] llama-server response structure:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                } catch (e) {
                    console.error('[Chat] Unexpected error processing llama-server response:', e.message);
                    reject(new Error(`Failed to process llama-server response: ${e.message}`));
                }
            });
        });
        
        // Add timeout handling (30 seconds for CMake-built llama-server)
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('llama-server request timeout (30s) - check if server is running'));
        });

        req.on('error', (err) => {
            console.error('[Chat] llama-server connection error:', err.message);
            reject(new Error(`llama-server connection failed: ${err.message} - check if server is running on port ${port}`));
        });
        
        req.write(data);
        req.end();
    });
}

/**
 * POST /api/chat
 * Send a message to OpenAI and get a response
 */
router.post('/', async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        const aiProvider = process.env.AI_PROVIDER || 'openai';
        
        // Check configuration based on provider
        if (aiProvider === 'openai') {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                return res.status(503).json({ 
                    error: 'OpenAI API key not configured',
                    hint: 'Add OPENAI_API_KEY to your .env file or configure local model in settings'
                });
            }
        } else if (aiProvider === 'local') {
            const modelPath = process.env.LOCAL_MODEL_PATH;
            const serverPort = process.env.LOCAL_SERVER_PORT;
            
            // Check if we have either a model path or server port configured
            if (!modelPath && !serverPort) {
                return res.status(503).json({ 
                    error: 'Local model not configured',
                    hint: 'Configure either LOCAL_MODEL_PATH or LOCAL_SERVER_PORT in settings, or switch to OpenAI'
                });
            }
        }
        
        // Get or create chat history for this session
        const session = sessionId || 'default';
        if (!chatHistory.has(session)) {
            const systemMessage = aiProvider === 'local' 
                ? 'You are a helpful assistant for the AnomHome Overmind dashboard running locally. You help users with home automation, productivity, and general questions.'
                : 'You are a helpful assistant for the AnomHome Overmind dashboard. You help users with home automation, productivity, and general questions.';
                
            chatHistory.set(session, [{
                role: 'system',
                content: systemMessage
            }]);
        }
        
        const messages = chatHistory.get(session);
        messages.push({ role: 'user', content: message });
        
        // Keep history manageable (last 20 messages + system)
        if (messages.length > 21) {
            messages.splice(1, messages.length - 21);
        }
        
        let response;
        let assistantMessage;
        
        // Make request based on provider
        if (aiProvider === 'openai') {
            const apiKey = process.env.OPENAI_API_KEY;
            response = await makeOpenAIRequest(apiKey, messages);
            assistantMessage = response.choices[0].message.content;
        } else if (aiProvider === 'local') {
            const port = process.env.LOCAL_SERVER_PORT || 8080;
            response = await makeLocalModelRequest(messages, port);
            
            // Handle different possible response structures from local models
            // llama-server can return various formats depending on configuration
            if (response.choices && response.choices.length > 0) {
                const choice = response.choices[0];
                if (choice.message && choice.message.content) {
                    // OpenAI-compatible format
                    assistantMessage = choice.message.content;
                } else if (choice.text) {
                    // Text completion format
                    assistantMessage = choice.text;
                } else if (typeof choice === 'string') {
                    // Simple string response
                    assistantMessage = choice;
                }
            } else if (response.response) {
                // Direct response field
                assistantMessage = response.response;
            } else if (response.content) {
                // Content field
                assistantMessage = response.content;
            } else if (response.message) {
                // Message field (some llama-server variants)
                assistantMessage = typeof response.message === 'string' ? response.message : response.message.content;
            } else if (typeof response === 'string') {
                // Plain text response
                assistantMessage = response;
            } else {
                // Log the full response for debugging
                console.warn('[Chat] Unexpected llama-server response format:', JSON.stringify(response, null, 2));
                throw new Error(`Unexpected response format from llama-server. Response: ${JSON.stringify(response)}`);
            }
        } else {
            throw new Error(`Unsupported AI provider: ${aiProvider}`);
        }
        
        // Add assistant response to history
        messages.push({ role: 'assistant', content: assistantMessage });
        
        res.json({
            message: assistantMessage,
            sessionId: session,
            usage: response.usage || { provider: aiProvider },
            provider: aiProvider
        });
        
    } catch (err) {
        console.error('[Chat] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/chat/:sessionId
 * Clear chat history for a session
 */
router.delete('/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    chatHistory.delete(sessionId);
    res.json({ success: true, message: 'Chat history cleared' });
});

/**
 * GET /api/chat/status
 * Check if AI provider is configured
 */
router.get('/status', (req, res) => {
    const aiProvider = process.env.AI_PROVIDER || 'openai';
    
    let configured = false;
    let message = '';
    
    if (aiProvider === 'openai') {
        const apiKey = process.env.OPENAI_API_KEY;
        configured = !!apiKey;
        message = configured ? 'OpenAI API is configured' : 'OpenAI API key not set';
    } else if (aiProvider === 'local') {
        const modelPath = process.env.LOCAL_MODEL_PATH;
        const serverPort = process.env.LOCAL_SERVER_PORT;
        configured = !!(modelPath || serverPort);
        
        if (configured) {
            if (modelPath && serverPort) {
                message = `JugiAI configured with model: ${modelPath} and port: ${serverPort}`;
            } else if (modelPath) {
                message = `JugiAI configured with model: ${modelPath}`;
            } else {
                message = `JugiAI configured on port: ${serverPort}`;
            }
        } else {
            message = 'JugiAI not configured - set LOCAL_SERVER_PORT (e.g., 8080) in environment or settings';
        }
    } else {
        message = `Unknown AI provider: ${aiProvider}`;
    }
    
    res.json({
        configured,
        message,
        provider: aiProvider
    });
});

module.exports = router;
