'use strict';
const assert = require('assert');
const { test } = require('node:test');
const { MotionStateMachine } = require('../services/motionRecorder/stateMachine');

test('MotionStateMachine transitions through motion to idle', () => {
    const sm = new MotionStateMachine({ minMotionSeconds: 1, postSeconds: 1, cooldownSeconds: 1 });
    const start = Date.now();
    sm.markMotion(start);
    let result = sm.tick(start + 1200);
    assert.strictEqual(result.state, 'post');
    result = sm.tick(start + 2500);
    assert.strictEqual(result.state, 'idle');
});
