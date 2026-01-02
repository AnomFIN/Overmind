'use strict';
const assert = require('assert');
const { test } = require('node:test');
const { requireAuth } = require('../middleware/auth');

test('requireAuth - missing ADMIN_TOKEN returns 503', () => {
    const originalToken = process.env.ADMIN_TOKEN;
    delete process.env.ADMIN_TOKEN;
    
    const req = { headers: {} };
    const res = {
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.jsonData = data;
            return this;
        }
    };
    const next = () => { throw new Error('next() should not be called'); };
    
    requireAuth(req, res, next);
    
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(res.jsonData.error, 'Authentication not configured');
    
    // Restore original token
    if (originalToken) process.env.ADMIN_TOKEN = originalToken;
});

test('requireAuth - missing Authorization header returns 401', () => {
    const originalToken = process.env.ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = 'test-token';
    
    const req = { headers: {} };
    const res = {
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.jsonData = data;
            return this;
        }
    };
    const next = () => { throw new Error('next() should not be called'); };
    
    requireAuth(req, res, next);
    
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.jsonData.error, 'Authentication required');
    
    // Restore original token
    if (originalToken) {
        process.env.ADMIN_TOKEN = originalToken;
    } else {
        delete process.env.ADMIN_TOKEN;
    }
});

test('requireAuth - invalid token returns 403', () => {
    const originalToken = process.env.ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = 'correct-token';
    
    const req = { 
        headers: { 
            authorization: 'Bearer wrong-token' 
        } 
    };
    const res = {
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.jsonData = data;
            return this;
        }
    };
    const next = () => { throw new Error('next() should not be called'); };
    
    requireAuth(req, res, next);
    
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.jsonData.error, 'Invalid credentials');
    
    // Restore original token
    if (originalToken) {
        process.env.ADMIN_TOKEN = originalToken;
    } else {
        delete process.env.ADMIN_TOKEN;
    }
});

test('requireAuth - valid Bearer token calls next()', () => {
    const originalToken = process.env.ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = 'correct-token';
    
    const req = { 
        headers: { 
            authorization: 'Bearer correct-token' 
        } 
    };
    const res = {
        status: function(code) {
            throw new Error('status() should not be called');
        },
        json: function(data) {
            throw new Error('json() should not be called');
        }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    
    requireAuth(req, res, next);
    
    assert.strictEqual(nextCalled, true);
    
    // Restore original token
    if (originalToken) {
        process.env.ADMIN_TOKEN = originalToken;
    } else {
        delete process.env.ADMIN_TOKEN;
    }
});

test('requireAuth - valid direct token calls next()', () => {
    const originalToken = process.env.ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = 'correct-token';
    
    const req = { 
        headers: { 
            authorization: 'correct-token' 
        } 
    };
    const res = {
        status: function(code) {
            throw new Error('status() should not be called');
        },
        json: function(data) {
            throw new Error('json() should not be called');
        }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    
    requireAuth(req, res, next);
    
    assert.strictEqual(nextCalled, true);
    
    // Restore original token
    if (originalToken) {
        process.env.ADMIN_TOKEN = originalToken;
    } else {
        delete process.env.ADMIN_TOKEN;
    }
});

test('requireAuth - timing attack prevention with different length tokens', () => {
    const originalToken = process.env.ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = 'correct-token-long';
    
    const req = { 
        headers: { 
            authorization: 'short' 
        } 
    };
    const res = {
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.jsonData = data;
            return this;
        }
    };
    const next = () => { throw new Error('next() should not be called'); };
    
    requireAuth(req, res, next);
    
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.jsonData.error, 'Invalid credentials');
    
    // Restore original token
    if (originalToken) {
        process.env.ADMIN_TOKEN = originalToken;
    } else {
        delete process.env.ADMIN_TOKEN;
    }
});
