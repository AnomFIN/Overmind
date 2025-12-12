'use strict';
// Ship intelligence, not excuses.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const SegmentRingBuffer = require('./ringBuffer');
const { MotionStateMachine } = require('./stateMachine');

function safeMkdir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

class CameraRecorder {
    constructor(cameraConfig, { onRecordingFinalized, logger }) {
        this.camera = cameraConfig;
        this.onRecordingFinalized = onRecordingFinalized;
        this.logger = logger || console;
        this.segmentBuffer = new SegmentRingBuffer({ maxSeconds: 12 });
        this.stateMachine = new MotionStateMachine({
            minMotionSeconds: cameraConfig.minMotionSeconds || 2,
            postSeconds: 5,
            cooldownSeconds: cameraConfig.cooldownSeconds || 3
        });
        this.segmentDir = path.join('recordings', '_segments', cameraConfig.id);
        this.activeSegments = [];
        this.status = {
            lastSeen: null,
            rtspConnected: false,
            lastMotionAt: null,
            diskFreeGB: null
        };
        this.segmentProcess = null;
        this.detectProcess = null;
        this.recording = false;
    }

    start() {
        safeMkdir(this.segmentDir);
        this.startSegmenter();
        this.startDetector();
    }

    stop() {
        if (this.segmentProcess) {
            this.segmentProcess.kill('SIGTERM');
        }
        if (this.detectProcess) {
            this.detectProcess.kill('SIGTERM');
        }
    }

    startSegmenter() {
        const args = [
            '-rtsp_transport', 'tcp',
            '-i', this.camera.rtspUrl,
            '-an',
            '-reset_timestamps', '1',
            '-c:v', 'copy',
            '-f', 'segment',
            '-segment_time', '1',
            '-segment_format', 'mp4',
            path.join(this.segmentDir, 'segment-%Y%m%d-%H%M%S.mp4')
        ];
        this.segmentProcess = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
        this.segmentProcess.stderr.on('data', () => {
            this.status.lastSeen = new Date().toISOString();
            this.status.rtspConnected = true;
        });
        this.segmentProcess.on('exit', (code) => {
            this.status.rtspConnected = false;
            this.logger.warn(`[${this.camera.id}] segmenter exited ${code}`);
            setTimeout(() => this.startSegmenter(), 2000);
        });

        fs.watch(this.segmentDir, (event, filename) => {
            if (event === 'rename' && filename.endsWith('.mp4')) {
                const filePath = path.join(this.segmentDir, filename);
                fs.stat(filePath, (err, stats) => {
                    if (err) return;
                    this.segmentBuffer.addSegment({ filePath, startedAt: Date.now(), durationSec: 1 });
                    this.activeSegments.push(filePath);
                });
            }
        });
    }

    startDetector() {
        const args = [
            '-rtsp_transport', 'tcp',
            '-i', this.camera.rtspUrl,
            '-an',
            '-filter:v', "scale=320:-1,select='gt(scene,0.12)',metadata=print",
            '-f', 'null', '-'
        ];
        this.detectProcess = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
        const handleMotion = () => {
            this.stateMachine.markMotion();
            this.status.lastMotionAt = new Date().toISOString();
            if (!this.recording) {
                this.recording = true;
            }
        };
        this.detectProcess.stderr.on('data', (chunk) => {
            const text = chunk.toString();
            if (text.includes('scene_score')) {
                handleMotion();
            }
            this.status.lastSeen = new Date().toISOString();
        });
        this.detectProcess.on('exit', (code) => {
            this.logger.warn(`[${this.camera.id}] detector exited ${code}`);
            setTimeout(() => this.startDetector(), 2000);
        });

        setInterval(() => {
            const { state } = this.stateMachine.tick();
            if (state === 'post' && this.recording) {
                this.finalizeRecording();
                this.recording = false;
            }
        }, 1000);
    }

    async finalizeRecording() {
        const preSegments = this.segmentBuffer.snapshot();
        const now = new Date();
        const baseDir = path.join('recordings', this.camera.id, now.toISOString().slice(0, 10));
        safeMkdir(baseDir);
        const filename = `${now.toISOString().slice(11, 19).replace(/:/g, '')}__motion.mp4`;
        const outputPath = path.join(baseDir, filename);
        const concatListPath = path.join(this.segmentDir, 'concat.txt');
        const segments = [...preSegments];
        fs.writeFileSync(concatListPath, segments.map(s => `file '${s.filePath}'`).join('\n'));
        await new Promise((resolve) => {
            const proc = spawn('ffmpeg', ['-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', '-movflags', '+faststart', outputPath]);
            proc.on('close', resolve);
        });
        this.onRecordingFinalized?.({ cameraId: this.camera.id, filePath: outputPath, startedAt: now });
    }

    async runTestClip(durationSec = 3) {
        const now = new Date();
        const baseDir = path.join('recordings', this.camera.id, now.toISOString().slice(0, 10));
        safeMkdir(baseDir);
        const outputPath = path.join(baseDir, `${now.toISOString().slice(11, 19).replace(/:/g, '')}__test.mp4`);
        return new Promise((resolve, reject) => {
            const args = ['-rtsp_transport', 'tcp', '-i', this.camera.rtspUrl, '-t', `${durationSec}`, '-an', '-c:v', 'copy', '-movflags', '+faststart', outputPath];
            const proc = spawn('ffmpeg', args);
            proc.on('close', (code) => {
                if (code === 0) resolve(outputPath);
                else reject(new Error('ffmpeg failed'));
            });
        });
    }
}

module.exports = CameraRecorder;
