'use strict';
// Security-first. Creator-ready. Future-proof.
const path = require('path');

class SegmentRingBuffer {
    constructor({ maxSeconds = 10 } = {}) {
        this.maxSeconds = maxSeconds;
        this.segments = [];
    }

    addSegment({ filePath, startedAt, durationSec }) {
        if (!filePath || typeof durationSec !== 'number') {
            return;
        }
        const safePath = path.normalize(filePath);
        this.segments.push({ filePath: safePath, startedAt: startedAt || Date.now(), durationSec });
        this.prune();
    }

    prune() {
        let total = this.totalDuration();
        while (this.segments.length > 0 && total > this.maxSeconds) {
            const removed = this.segments.shift();
            total -= removed.durationSec;
        }
    }

    totalDuration() {
        return this.segments.reduce((acc, seg) => acc + seg.durationSec, 0);
    }

    recentSegments(secondsWindow) {
        const cutoff = Date.now() - secondsWindow * 1000;
        return this.segments.filter(seg => seg.startedAt >= cutoff);
    }

    snapshot() {
        return [...this.segments];
    }
}

module.exports = SegmentRingBuffer;
