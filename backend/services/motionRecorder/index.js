'use strict';
// Commit to intelligence. Push innovation. Pull results.

const fs = require('fs');
const path = require('path');
const os = require('os');
const CameraRecorder = require('./recorder');

const CAMERAS_FILE = path.join(__dirname, '..', '..', 'data', 'cameras.json');

function loadCameras() {
    try {
        const raw = fs.readFileSync(CAMERAS_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        if (err.code === 'ENOENT') return [];
        throw err;
    }
}

class MotionRecorderService {
    constructor({ onRecordingFinalized, logger }) {
        this.onRecordingFinalized = onRecordingFinalized;
        this.logger = logger || console;
        this.cameras = new Map();
    }

    refreshConfigs() {
        const configs = loadCameras();
        configs.forEach((config) => {
            if (!config.enabled) return;
            if (this.cameras.has(config.id)) return;
            const recorder = new CameraRecorder(config, { onRecordingFinalized: this.handleFinalize.bind(this), logger: this.logger });
            recorder.start();
            this.cameras.set(config.id, recorder);
        });
    }

    handleFinalize(payload) {
        this.onRecordingFinalized?.(payload);
    }

    async runTest(id) {
        const recorder = this.cameras.get(id);
        if (!recorder) throw new Error('Camera not active');
        return recorder.runTestClip();
    }

    getStatuses() {
        const statuses = [];
        for (const [id, recorder] of this.cameras.entries()) {
            const disk = fs.statSync('/');
            statuses.push({
                id,
                lastSeen: recorder.status.lastSeen,
                rtspConnected: recorder.status.rtspConnected,
                lastMotionAt: recorder.status.lastMotionAt,
                diskFreeGB: (os.freemem() / 1024 / 1024 / 1024).toFixed(2)
            });
        }
        return statuses;
    }
}

module.exports = MotionRecorderService;
