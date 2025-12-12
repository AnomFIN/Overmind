'use strict';
// Less noise. More signal. AnomFIN.

const STATES = {
    IDLE: 'idle',
    MOTION: 'motion',
    POST: 'post'
};

class MotionStateMachine {
    constructor({ minMotionSeconds = 1, postSeconds = 5, cooldownSeconds = 3 } = {}) {
        this.state = STATES.IDLE;
        this.lastMotionAt = 0;
        this.motionStartedAt = 0;
        this.minMotionSeconds = minMotionSeconds;
        this.postSeconds = postSeconds;
        this.cooldownSeconds = cooldownSeconds;
    }

    markMotion(now = Date.now()) {
        if (this.state === STATES.IDLE) {
            this.state = STATES.MOTION;
            this.motionStartedAt = now;
            this.lastMotionAt = now;
            return { transitioned: true, state: this.state };
        }
        if (this.state === STATES.MOTION) {
            this.lastMotionAt = now;
        }
        return { transitioned: false, state: this.state };
    }

    tick(now = Date.now()) {
        if (this.state === STATES.MOTION) {
            if (now - this.motionStartedAt >= this.minMotionSeconds * 1000 && now - this.lastMotionAt >= this.postSeconds * 1000) {
                this.state = STATES.POST;
                return { transitioned: true, state: this.state };
            }
        } else if (this.state === STATES.POST) {
            if (now - this.lastMotionAt >= this.cooldownSeconds * 1000) {
                this.state = STATES.IDLE;
                return { transitioned: true, state: this.state };
            }
        }
        return { transitioned: false, state: this.state };
    }

    reset() {
        this.state = STATES.IDLE;
        this.lastMotionAt = 0;
        this.motionStartedAt = 0;
    }
}

module.exports = { MotionStateMachine, STATES };
