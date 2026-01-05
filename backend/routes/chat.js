/**
 * AI Chat Console Route
 * Supports local llama-server (CMake-built binary)
 */

const express = require('express');
const router = express.Router();
const http = require('http');

// Chat history storage (in-memory for simplicity)
const chatHistory = new Map();

/**
 * Make HTTP request to local llama-server
 * llama-server is built with CMake and exposes a v1-compatible API
 */
function makeLocalModelRequest(messages, port) {
    return new Promise((resolve, reject) => {
        // Format request for llama-server (built with CMake) - local AI compatible
        const data = JSON.stringify({
            model: 'local-llama', // Local AI standard format
            messages: messages,
            max_tokens: 256, // Standard default for local AI
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
                        // Return the response in OpenAI-compatible format
                        resolve({
                            choices: [{
                                message: {
                                    content: `[Error ${res.statusCode}] ${errorMsg}`
                                }
                            }]
                        });
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
            reject(new Error('Local AI llama-server timeout (30s) - server is running but not responding. Check model loading status or try restarting llama-server.'));
        });

        req.on('error', (err) => {
            console.error('[Chat] llama-server connection error:', err.message);
            // Local AI detailed error reporting
            let errorDetails = err.message;
            if (err.code === 'ECONNREFUSED') {
                errorDetails = `Connection refused - llama-server not running on port ${port}. Start llama-server with: ./llama-server --port ${port}`;
            } else if (err.code === 'ENOTFOUND') {
                errorDetails = `Host not found - check if llama-server is configured correctly`;
            } else if (err.code === 'ETIMEDOUT') {
                errorDetails = `Connection timeout - llama-server is taking too long to respond`;
            }
            reject(new Error(`Local AI llama-server error: ${errorDetails}`));
        });
        
        req.write(data);
        req.end();
    });
}

/**
 * POST /api/chat
 * Send a message to local llama-server and get a response
 */
router.post('/', async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        // Check if llama-server port is configured
        const serverPort = process.env.LOCAL_SERVER_PORT;
        if (!serverPort) {
            return res.status(503).json({ 
                error: 'Local llama-server not configured',
                hint: 'Set LOCAL_SERVER_PORT in your .env file (e.g., LOCAL_SERVER_PORT=8081)'
            });
        }
        
        // Get or create chat history for this session
        const session = sessionId || 'default';
        if (!chatHistory.has(session)) {
            chatHistory.set(session, [{
                role: 'system',
                content: 'You are a helpful assistant for the AnomHome Overmind dashboard running locally. You help users with home automation, productivity, and general questions.'
            }]);
        }
        
        const messages = chatHistory.get(session);
        messages.push({ role: 'user', content: message });
        
        // Keep history manageable (last 20 messages + system)
        if (messages.length > 21) {
            messages.splice(1, messages.length - 21);
        }
        
        // Make request to local llama-server
        const port = parseInt(serverPort) || 8081;
        const response = await makeLocalModelRequest(messages, port);
        
        let assistantMessage;
        
        // Handle different possible response structures from llama-server
        if (response.choices && response.choices.length > 0) {
            const choice = response.choices[0];
            if (choice.message && choice.message.content) {
                // v1-compatible format (standard llama-server response)
                assistantMessage = choice.message.content.trim();
            } else if (choice.text) {
                // Text completion format
                assistantMessage = choice.text.trim();
            } else if (typeof choice === 'string') {
                // Simple string response
                assistantMessage = choice.trim();
            }
        } else if (response.content && typeof response.content === 'string') {
            // Direct content field
            assistantMessage = response.content.trim();
        } else if (response.response && typeof response.response === 'string') {
            // Direct response field
            assistantMessage = response.response.trim();
        } else if (response.message) {
            // Message field (some llama-server variants)
            assistantMessage = typeof response.message === 'string' 
                ? response.message.trim() 
                : (response.message.content || '').trim();
        } else if (typeof response === 'string') {
            // Plain text response
            assistantMessage = response.trim();
        }
        
        // Fallback for empty responses
        if (!assistantMessage) {
            console.warn('[Chat] No content found in llama-server response:', JSON.stringify(response, null, 2));
            assistantMessage = '[no response]';
        }
        
        // Add assistant response to history
        messages.push({ role: 'assistant', content: assistantMessage });
        
        res.json({
            message: assistantMessage,
            sessionId: session,
            usage: response.usage || { provider: 'local' },
            provider: 'local'
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
 * Check if llama-server is configured and reachable
 */
router.get('/status', async (req, res) => {
    const serverPort = process.env.LOCAL_SERVER_PORT || 8081;
    
    let configured = !!serverPort;
    let message = '';
    let details = {};
    
    if (configured) {
        // Test llama-server connection (quick test)
        try {
            const testResult = await testLocalAIQuick('localhost', serverPort);
            if (testResult.success) {
                message = `llama-server active on port ${serverPort} (${testResult.responseTime}ms)`;
                details.responseTime = testResult.responseTime;
                details.serverActive = true;
            } else {
                message = `llama-server configured on port ${serverPort} but not responding: ${testResult.error}`;
                details.serverActive = false;
                details.error = testResult.error;
            }
        } catch (err) {
            message = `llama-server configured on port ${serverPort} (connection not tested)`;
            details.testSkipped = true;
        }
    } else {
        message = 'llama-server not configured - set LOCAL_SERVER_PORT (e.g., 8081) in .env file';
    }
    
    res.json({
        configured,
        message,
        provider: 'local',
        details
    });
});

/**
 * Quick llama-server connection test (non-blocking)
 */
function testLocalAIQuick(host = 'localhost', port = 8081) {
    return new Promise((resolve) => {
        const payload = JSON.stringify({
            model: 'local',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1
        });

        const options = {
            hostname: host,
            port: port,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const startTime = Date.now();
        const req = http.request(options, (res) => {
            const responseTime = Date.now() - startTime;
            resolve({ success: res.statusCode === 200, responseTime });
            req.destroy(); // Close immediately
        });

        req.setTimeout(3000, () => {
            req.destroy();
            resolve({ success: false, error: 'timeout', responseTime: Date.now() - startTime });
        });

        req.on('error', (err) => {
            resolve({ success: false, error: err.code || err.message, responseTime: Date.now() - startTime });
        });

        req.write(payload);
        req.end();
    });
}

module.exports = router;
