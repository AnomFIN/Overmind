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
 * Make HTTP request to local GGUF model server
 */
function makeLocalModelRequest(messages, port) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            model: 'local',
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7,
            stream: false
        });

        const options = {
            hostname: 'localhost',
            port: port,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = require('http').request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    if (body.trim() === '') {
                        reject(new Error('Empty response from local model server'));
                        return;
                    }
                    
                    const response = JSON.parse(body);
                    if (res.statusCode !== 200) {
                        const errorMsg = response.error?.message || response.detail || `Server returned ${res.statusCode}: ${body.substring(0, 200)}`;
                        reject(new Error(`Local server error: ${errorMsg}`));
                    } else {
                        resolve(response);
                    }
                } catch (e) {
                    reject(new Error(`Invalid JSON response from local model server: ${e.message}. Response: ${body.substring(0, 200)}`));
                }
            });
        });
        
        // Add timeout handling
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Local model server request timeout (30s)'));
        });

        req.on('error', (err) => {
            reject(new Error(`Local model server connection failed: ${err.message}`));
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
            if (response.choices && response.choices[0]) {
                assistantMessage = response.choices[0].message?.content || response.choices[0].text;
            } else if (response.response) {
                assistantMessage = response.response;
            } else if (response.content) {
                assistantMessage = response.content;
            } else {
                throw new Error('Unexpected response format from local model server');
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
 * Check if OpenAI is configured
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
                message = `Local model configured with path: ${modelPath} and port: ${serverPort}`;
            } else if (modelPath) {
                message = `Local model configured with path: ${modelPath}`;
            } else {
                message = `Local model server configured on port: ${serverPort}`;
            }
        } else {
            message = 'Local model not configured - set LOCAL_MODEL_PATH or LOCAL_SERVER_PORT';
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
