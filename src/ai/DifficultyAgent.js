/**
 * DifficultyAgent — Contextual Epsilon-Greedy Bandit for Dynamic Difficulty Adjustment
 *
 * Algorithm: Linear contextual bandit with epsilon-greedy exploration and experience replay.
 * No external dependencies. TensorFlow.js neural net upgrade kicks in automatically after
 * 200+ stored transitions (loaded from CDN only when needed).
 *
 * Flow-state target (Csikszentmihalyi, 1990):
 *   - Interception ratio ≈ 0.72  (miss ~28% — feel pressure without losing)
 *   - Health ratio      ≈ 0.60  (take some damage — feel stakes)
 */

export const DIFFICULTY_PRESETS = [
    { label: 'EASY',   countMult: 0.50, intervalAdd: +10, tgpPassiveBonus: -0.30, speedMult: 0.82 },
    { label: 'MILD',   countMult: 0.72, intervalAdd:  +5, tgpPassiveBonus:  0.00, speedMult: 0.92 },
    { label: 'FLOW',   countMult: 1.00, intervalAdd:   0, tgpPassiveBonus:  0.00, speedMult: 1.00 },
    { label: 'HARD',   countMult: 1.22, intervalAdd:  -5, tgpPassiveBonus: +0.40, speedMult: 1.08 },
    { label: 'BRUTAL', countMult: 1.45, intervalAdd:  -9, tgpPassiveBonus: +0.80, speedMult: 1.18 },
];

const NUM_ACTIONS  = DIFFICULTY_PRESETS.length;   // 5
const STATE_DIM    = 9;
const FLOW_TARGET  = 0.72;
const HEALTH_TGT   = 0.60;
const STORAGE_KEY  = 'qad_dda_agent_v2';

export class DifficultyAgent {
    constructor() {
        // Linear weight vectors: value(s,a) = dot(W[a], s) + bias[a]
        this.W    = Array.from({ length: NUM_ACTIONS }, () => new Float32Array(STATE_DIM).fill(0));
        this.bias = new Float32Array(NUM_ACTIONS).fill(0.05);  // slight optimistic init

        this.alpha        = 0.14;   // learning rate
        this.epsilon      = 0.40;   // initial exploration
        this.epsilonDecay = 0.97;   // applied each wave

        this.memory    = [];        // { state, action, reward }
        this.maxMemory = 80;

        this._lastAction = 2;       // start at FLOW
        this._lastState  = null;
        this._missEMA    = 0;       // smoothed miss rate
        this._streak     = 0;       // consecutive perfect waves

        this.episode     = 0;
        this._model      = null;    // TF.js neural net (optional upgrade)

        this._load();
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Build the 9-element normalised state vector from raw game observables.
     * Call at the END of each wave.
     */
    buildState(obs) {
        const {
            interceptsThisWave = 0, totalThisWave  = 1,
            health = 100,           maxHealth       = 200,
            prevHealth = 100,       apm             = 0,
            waveCount  = 1,         missesThisWave  = 0,
            avgHesitation = 0,      money           = 2000,
        } = obs;

        const interceptionRatio = interceptsThisWave / Math.max(1, totalThisWave);
        const healthNorm        = health / Math.max(1, maxHealth);
        const healthDelta       = Math.max(-1, Math.min(1, (health - prevHealth) / Math.max(1, maxHealth)));
        const apmNorm           = Math.min(1, apm / 60);
        const waveNorm          = Math.min(1, waveCount / 100);

        const missRate   = missesThisWave / Math.max(1, totalThisWave);
        this._missEMA    = 0.3 * missRate + 0.7 * this._missEMA;

        const hesNorm    = Math.min(1, avgHesitation / 5000);
        const moneyPress = Math.max(0, Math.min(1, 1 - money / 3000));

        if (interceptionRatio >= 0.99 && missesThisWave === 0) {
            this._streak++;
        } else {
            this._streak = Math.max(0, this._streak - 1);
        }
        const streakFactor = Math.min(1, this._streak / 5);

        return new Float32Array([
            interceptionRatio, healthNorm, healthDelta,
            apmNorm, waveNorm, this._missEMA,
            hesNorm, moneyPress, streakFactor,
        ]);
    }

    /**
     * Compute the flow-state reward for the wave just completed.
     * Call BEFORE step() — the reward applies to the PREVIOUS action.
     */
    computeReward(obs) {
        const interceptRatio = (obs.interceptsThisWave || 0) / Math.max(1, obs.totalThisWave || 1);
        const healthNorm     = (obs.health || 0) / Math.max(1, obs.maxHealth || 200);
        const apmNorm        = Math.min(1, (obs.apm || 0) / 60);

        const perfErr      = Math.abs(interceptRatio - FLOW_TARGET);
        const healthErr    = Math.abs(healthNorm - HEALTH_TGT);
        const stressPenalty = Math.max(0, 0.20 - healthNorm) * 3.0;  // near-death punishment
        const borePenalty   = Math.max(0, interceptRatio - 0.95) * 2.0; // too-easy punishment

        const r = 1.0
            - 1.8 * perfErr
            - 1.2 * healthErr
            - stressPenalty
            - borePenalty
            + 0.10 * apmNorm;

        return Math.max(-2, Math.min(2, r));
    }

    /**
     * Main update step. Call at the start of each new wave.
     *
     * @param {Float32Array} state  — from buildState()
     * @param {number}       reward — from computeReward(), for the PREVIOUS wave
     * @param {string}       diffState — current heartbeat state (BUILD/PEAK/DRAIN/RECOVER)
     * @returns {number} action index 0–4
     */
    step(state, reward, diffState = 'FLOW') {
        // Learn from previous wave
        if (this._lastState !== null) {
            this._update(this._lastState, this._lastAction, reward);
            this._remember(this._lastState, this._lastAction, reward);
            this._replay(4);
        }

        // Choose action
        let action;
        if (Math.random() < this.epsilon) {
            action = this._biasedRandom(state[4]);        // state[4] = waveNorm
        } else if (this._model) {
            action = this._neuralAction(state);
        } else {
            action = this._bestAction(state);
        }

        // Clamp during lull states — never allow HARD/BRUTAL during ebb
        if (diffState === 'DRAIN' || diffState === 'RECOVER') {
            action = Math.min(action, 1);   // EASY or MILD only
        }

        this.epsilon      = Math.max(0.05, this.epsilon * this.epsilonDecay);
        this._lastAction  = action;
        this._lastState   = state;
        this.episode++;

        if (this.episode % 5 === 0) this._save();

        // Attempt neural net upgrade after enough experience
        if (this.memory.length >= 200 && !this._model) {
            this._tryLoadNeuralNet();
        }

        return action;
    }

    /** Reset all learned state (call on new game). */
    reset() {
        localStorage.removeItem(STORAGE_KEY);
        this.W        = Array.from({ length: NUM_ACTIONS }, () => new Float32Array(STATE_DIM).fill(0));
        this.bias     = new Float32Array(NUM_ACTIONS).fill(0.05);
        this.epsilon  = 0.40;
        this.episode  = 0;
        this._missEMA = 0;
        this._streak  = 0;
        this.memory   = [];
        this._lastState  = null;
        this._lastAction = 2;
    }

    // ─── Linear bandit internals ─────────────────────────────────────────────

    _valueEstimate(state, action) {
        let v = this.bias[action];
        const W = this.W[action];
        for (let i = 0; i < STATE_DIM; i++) v += W[i] * state[i];
        return v;
    }

    _bestAction(state) {
        let best = 0, bestV = -Infinity;
        for (let a = 0; a < NUM_ACTIONS; a++) {
            const v = this._valueEstimate(state, a);
            if (v > bestV) { bestV = v; best = a; }
        }
        return best;
    }

    _update(state, action, reward) {
        const err  = reward - this._valueEstimate(state, action);
        const W    = this.W[action];
        for (let i = 0; i < STATE_DIM; i++) W[i] += this.alpha * err * state[i];
        this.bias[action] += this.alpha * err;
    }

    _remember(state, action, reward) {
        this.memory.push({ state: state.slice(), action, reward });
        if (this.memory.length > this.maxMemory) this.memory.shift();
    }

    _replay(n) {
        if (this.memory.length === 0) return;
        for (let i = 0; i < n; i++) {
            const { state, action, reward } =
                this.memory[Math.floor(Math.random() * this.memory.length)];
            this._update(state, action, reward);
        }
    }

    /** Wave-stage-biased random exploration so early game stays sane. */
    _biasedRandom(waveNorm) {
        const stage = Math.min(3, Math.floor(waveNorm * 4));
        const pools = [
            [0, 1, 1, 2],   // early:  mostly mild
            [1, 2, 2, 3],   // mid:    flow/hard
            [2, 2, 3, 3],   // later:  hard-ish
            [2, 3, 3, 4],   // late:   hard/brutal
        ];
        const pool = pools[stage];
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // ─── TensorFlow.js neural net (optional, activates after 200 samples) ────

    async _tryLoadNeuralNet() {
        if (typeof tf === 'undefined') return;   // TF.js not loaded
        try {
            this._model = tf.sequential({
                layers: [
                    tf.layers.dense({ inputShape: [STATE_DIM], units: 16, activation: 'relu' }),
                    tf.layers.dense({ units: 16, activation: 'relu' }),
                    tf.layers.dense({ units: NUM_ACTIONS, activation: 'linear' }),
                ],
            });
            this._model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });

            try {
                this._model = await tf.loadLayersModel('indexeddb://qad-dda-net-v1');
            } catch (_) { /* no saved net yet — use freshly compiled one */ }

            await this._trainNeuralNet();
        } catch (e) {
            this._model = null;
            console.warn('[DDA] TF.js upgrade failed, staying on linear bandit:', e);
        }
    }

    async _trainNeuralNet() {
        if (!this._model || this.memory.length < 32) return;
        const batch = this.memory.slice(-64);
        const xs = tf.tensor2d(batch.map(t => Array.from(t.state)));
        const ys = tf.tidy(() => {
            const qVals = this._model.predict(xs).arraySync();
            for (let i = 0; i < batch.length; i++) {
                qVals[i][batch[i].action] = batch[i].reward;
            }
            return tf.tensor2d(qVals);
        });
        await this._model.fit(xs, ys, { epochs: 6, verbose: 0 });
        xs.dispose(); ys.dispose();
        try { await this._model.save('indexeddb://qad-dda-net-v1'); } catch (_) {}
    }

    _neuralAction(state) {
        if (!this._model) return this._bestAction(state);
        return tf.tidy(() => {
            const t = tf.tensor2d([Array.from(state)]);
            const q = this._model.predict(t).dataSync();
            return [...q].indexOf(Math.max(...q));
        });
    }

    // ─── Persistence ─────────────────────────────────────────────────────────

    _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                W:       this.W.map(w => Array.from(w)),
                bias:    Array.from(this.bias),
                epsilon: this.epsilon,
                episode: this.episode,
                missEMA: this._missEMA,
                streak:  this._streak,
                memory:  this.memory.map(m => ({ ...m, state: Array.from(m.state) })),
            }));
        } catch (_) { /* localStorage full — ignore */ }
    }

    _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const d = JSON.parse(raw);
            if (d.W)       this.W       = d.W.map(w => new Float32Array(w));
            if (d.bias)    this.bias    = new Float32Array(d.bias);
            if (d.epsilon !== undefined) this.epsilon = d.epsilon;
            if (d.episode !== undefined) this.episode = d.episode;
            if (d.missEMA !== undefined) this._missEMA = d.missEMA;
            if (d.streak  !== undefined) this._streak  = d.streak;
            if (d.memory)  this.memory  = d.memory.map(m => ({
                ...m, state: new Float32Array(m.state)
            }));
        } catch (_) { /* corrupt — start fresh */ }
    }
}
