/**
 * OpenAI Chat Console Route
 * Provides API endpoint for AI chat functionality
 */

const express = require('express');
const router = express.Router();
const https = require('https');

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
 * POST /api/chat
 * Send a message to OpenAI and get a response
 */
router.post('/', async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return res.status(503).json({ 
                error: 'OpenAI API key not configured',
                hint: 'Add OPENAI_API_KEY to your .env file'
            });
        }
        
        // Get or create chat history for this session
        const session = sessionId || 'default';
        if (!chatHistory.has(session)) {
            chatHistory.set(session, [
                {
                    role: 'system',
                    content: 'You are a helpful assistant for the AnomHome Overmind dashboard. You help users with home automation, productivity, and general questions.'
                }
            ]);
        }
        
        const messages = chatHistory.get(session);
        messages.push({ role: 'user', content: message });
        
        // Keep history manageable (last 20 messages + system)
        if (messages.length > 21) {
            messages.splice(1, messages.length - 21);
        }
        
        const response = await makeOpenAIRequest(apiKey, messages);
        const assistantMessage = response.choices[0].message.content;
        
        // Add assistant response to history
        messages.push({ role: 'assistant', content: assistantMessage });
        
        res.json({
            message: assistantMessage,
            sessionId: session,
            usage: response.usage
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
    const apiKey = process.env.OPENAI_API_KEY;
    res.json({
        configured: !!apiKey,
        message: apiKey ? 'OpenAI API is configured' : 'OpenAI API key not set'
    });
});

module.exports = router;
