#!/usr/bin/env node

/**
 * Overmind Configuration Validator
 * Checks if the system is properly configured for local AI
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

const aiProvider = process.env.AI_PROVIDER || 'openai';
const localServerPort = process.env.LOCAL_SERVER_PORT;
const openaiKey = process.env.OPENAI_API_KEY;

console.log(`✅ Found .env file`);
console.log(`📡 AI Provider: ${aiProvider}`);

if (aiProvider === 'local') {
    console.log(`🚀 JugiAI Server Port: ${localServerPort || 'not set'}`);
    
    if (!localServerPort) {
        console.log('❌ LOCAL_SERVER_PORT not configured');
        console.log('💡 Add LOCAL_SERVER_PORT=8080 to .env file');
        process.exit(1);
    }
    
    console.log('\n🌐 Testing JugiAI connection...');
    
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
                console.log('✅ JugiAI is responding');
                try {
                    const response = JSON.parse(body);
                    console.log('✅ Valid JSON response received');
                    
                    if (response.choices || response.response || response.content) {
                        console.log('✅ Response format is compatible');
                    } else {
                        console.log('⚠️  Unexpected response format:');
                        console.log(JSON.stringify(response, null, 2));
                    }
                    
                    console.log('\n🎉 JugiAI configuration is working!');
                    console.log('💡 You can now start Overmind with: npm start');
                    
                } catch (e) {
                    console.log('❌ Invalid JSON response from JugiAI');
                    console.log('📄 Raw response:', body.substring(0, 200));
                }
            } else {
                console.log(`❌ JugiAI error: HTTP ${res.statusCode}`);
                console.log('📄 Response:', body.substring(0, 200));
            }
        });
    });
    
    req.setTimeout(5000, () => {
        console.log('❌ Connection timeout');
        console.log('💡 Make sure JugiAI (llama-server) is running:');
        console.log(`    ~/llama.cpp/build/llama-server -m /path/to/model.gguf --port ${localServerPort}`);
        process.exit(1);
    });
    
    req.on('error', (err) => {
        console.log('❌ Connection failed:', err.message);
        console.log('💡 Make sure JugiAI (llama-server) is running:');
        console.log(`    ~/llama.cpp/build/llama-server -m /path/to/model.gguf --port ${localServerPort}`);
        console.log('💡 Check if port is correct and not blocked by firewall');
        process.exit(1);
    });
    
    req.write(testData);
    req.end();
    
} else if (aiProvider === 'openai') {
    console.log(`🔑 OpenAI API Key: ${openaiKey ? 'configured' : 'not set'}`);
    
    if (!openaiKey || openaiKey === 'your_openai_api_key_here') {
        console.log('❌ OpenAI API key not properly configured');
        console.log('💡 Add OPENAI_API_KEY=sk-... to .env file');
        process.exit(1);
    }
    
    console.log('✅ OpenAI configuration looks good');
    console.log('💡 You can now start Overmind with: npm start');
    
} else {
    console.log(`❌ Unknown AI provider: ${aiProvider}`);
    console.log('💡 Set AI_PROVIDER to either "local" or "openai"');
    process.exit(1);
}