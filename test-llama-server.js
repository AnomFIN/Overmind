#!/usr/bin/env node

/**
 * Test script to verify llama-server connection and response format
 * Usage: node test-llama-server.js [port]
 */

const http = require('http');

const port = process.argv[2] || process.env.LOCAL_SERVER_PORT || 8080;

console.log(`Testing connection to llama-server on localhost:${port}`);

const testMessage = {
    model: 'local',
    messages: [
        {
            role: 'user',
            content: 'Hello! Please respond with a simple greeting.'
        }
    ],
    max_tokens: 100,
    temperature: 0.7,
    stream: false
};

const data = JSON.stringify(testMessage);

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

console.log('Request data:', JSON.stringify(testMessage, null, 2));
console.log('Connecting to llama-server...');

const req = http.request(options, (res) => {
    let body = '';
    
    console.log(`Response status: ${res.statusCode}`);
    console.log('Response headers:', res.headers);
    
    res.on('data', chunk => {
        body += chunk;
        console.log(`Received chunk: ${chunk.length} bytes`);
    });
    
    res.on('end', () => {
        console.log('\n=== FULL RESPONSE ===');
        console.log(body);
        console.log('\n=== PARSED RESPONSE ===');
        
        try {
            const parsed = JSON.parse(body);
            console.log(JSON.stringify(parsed, null, 2));
            
            console.log('\n=== RESPONSE ANALYSIS ===');
            console.log('Keys in response:', Object.keys(parsed));
            
            if (parsed.choices) {
                console.log('Found choices array:', parsed.choices.length, 'items');
                if (parsed.choices[0]) {
                    console.log('First choice keys:', Object.keys(parsed.choices[0]));
                    if (parsed.choices[0].message) {
                        console.log('Message keys:', Object.keys(parsed.choices[0].message));
                        console.log('Message content:', parsed.choices[0].message.content);
                    }
                }
            }
            
            if (parsed.response) {
                console.log('Found direct response field:', parsed.response);
            }
            
            if (parsed.content) {
                console.log('Found content field:', parsed.content);
            }
            
        } catch (e) {
            console.error('JSON parse error:', e.message);
            console.log('Raw response body (first 500 chars):', body.substring(0, 500));
        }
    });
});

req.setTimeout(10000, () => {
    console.error('Request timeout after 10 seconds');
    req.destroy();
    process.exit(1);
});

req.on('error', (err) => {
    console.error('Connection error:', err.message);
    console.error('Make sure llama-server is running on port', port);
    console.error('Example command to start llama-server:');
    console.error(`  ~/llama.cpp/build/llama-server -m /path/to/model.gguf --port ${port} --host localhost`);
    process.exit(1);
});

req.write(data);
req.end();