'use strict';
const assert = require('assert');
const { test } = require('node:test');
const SegmentRingBuffer = require('../services/motionRecorder/ringBuffer');

test('SegmentRingBuffer keeps the last N seconds', () => {
    const buffer = new SegmentRingBuffer({ maxSeconds: 5 });
    buffer.addSegment({ filePath: 'a', durationSec: 2, startedAt: Date.now() - 7000 });
    buffer.addSegment({ filePath: 'b', durationSec: 2, startedAt: Date.now() - 4000 });
    buffer.addSegment({ filePath: 'c', durationSec: 2, startedAt: Date.now() });
    assert(buffer.totalDuration() <= 5);
    assert(buffer.snapshot().find(seg => seg.filePath === 'a') === undefined);
});
