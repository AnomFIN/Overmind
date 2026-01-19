#!/usr/bin/env node

/**
 * Overmind Configuration Validator
 * Checks if the system is properly configured for local llama-server
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🔍 Overmind Configuration Validator\n');

// Check .env file
console.log('📋 Checking configuration...');
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found');
    console.log('💡 Run: cp .env.example .env');
    process.exit(1);
}

// Load environment variables
require('dotenv').config();

const localServerPort = process.env.LOCAL_SERVER_PORT;

console.log(`✅ Found .env file`);
console.log(`🚀 llama-server Port: ${localServerPort || 'not set'}`);

if (!localServerPort) {
    console.log('❌ LOCAL_SERVER_PORT not configured');
    console.log('💡 Add LOCAL_SERVER_PORT=8081 to .env file');
    process.exit(1);
}

console.log('\n🌐 Testing llama-server connection...');

const testData = JSON.stringify({
    model: 'local',
    messages: [{ role: 'user', content: 'Hello' }],
    max_tokens: 10,
    stream: false
});

const options = {
    hostname: 'localhost',
    port: localServerPort,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testData)
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('✅ llama-server is responding');
            try {
                const response = JSON.parse(body);
                console.log('✅ Valid JSON response received');
                
                if (response.choices || response.response || response.content) {
                    console.log('✅ Response format is compatible');
                } else {
                    console.log('⚠️  Unexpected response format:');
                    console.log(JSON.stringify(response, null, 2));
                }
                
                console.log('\n🎉 llama-server configuration is working!');
                console.log('💡 You can now start Overmind with: npm start');
                
            } catch (e) {
                console.log('❌ Invalid JSON response from llama-server');
                console.log('📄 Raw response:', body.substring(0, 200));
            }
        } else {
            console.log(`❌ llama-server error: HTTP ${res.statusCode}`);
            console.log('📄 Response:', body.substring(0, 200));
        }
    });
});

req.setTimeout(5000, () => {
    console.log('❌ Connection timeout');
    console.log('💡 Make sure llama-server is running:');
    console.log(`    ~/llama.cpp/build/llama-server -m /path/to/model.gguf --port ${localServerPort}`);
    process.exit(1);
});

req.on('error', (err) => {
    console.log('❌ Connection failed:', err.message);
    console.log('💡 Make sure llama-server (CMake-built) is running:');
    console.log(`    ~/llama.cpp/build/llama-server -m /path/to/model.gguf --port ${localServerPort}`);
    console.log('💡 Check if port is correct and not blocked by firewall');
    process.exit(1);
});

req.write(testData);
req.end();