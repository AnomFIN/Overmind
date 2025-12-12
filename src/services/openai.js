/**
 * OpenAI Service for AnomHome Overmind
 * 
 * Handles communication with OpenAI API.
 * API key is never exposed to the client.
 */

import storage from '../storage.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Send a message to OpenAI and get a response
 * @param {string} message - User's message
 * @param {Array} history - Previous conversation history
 * @returns {Promise<Object>} Response with assistant message
 */
export async function chatWithAI(message, history = []) {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
        throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in .env');
    }
    
    // Build messages array with history
    const messages = [
        {
            role: 'system',
            content: 'You are a helpful assistant integrated into the AnomHome Overmind dashboard. Be concise and helpful.'
        }
    ];
    
    // Add history (limit to last 20 messages to avoid token limits)
    const recentHistory = history.slice(-20);
    messages.push(...recentHistory);
    
    // Add current message
    messages.push({ role: 'user', content: message });
    
    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: 2048,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
        }
        
        const data = await response.json();
        const assistantMessage = data.choices[0]?.message?.content || 'No response generated';
        
        // Save to history
        const chatHistory = await storage.read('chat_history');
        
        // Add user message
        chatHistory.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });
        
        // Add assistant response
        chatHistory.push({
            role: 'assistant',
            content: assistantMessage,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 messages
        const trimmedHistory = chatHistory.slice(-100);
        await storage.write('chat_history', trimmedHistory);
        
        return {
            message: assistantMessage,
            model,
            usage: data.usage
        };
    } catch (error) {
        console.error('OpenAI API error:', error);
        throw error;
    }
}
