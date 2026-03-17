import { Radar } from './Radar.js';
import { EntityManager } from './EntityManager.js';
import { GameState } from './GameState.js';
import { Missile, MISSILE_TYPES } from '../entities/Missile.js';
import { Explosion } from '../entities/Explosion.js';
import { FighterJet } from '../entities/FighterJet.js';
import { HornetDrone } from '../entities/HornetDrone.js';
import { Bomber } from '../entities/Bomber.js';
import { EnemyFighter } from '../entities/EnemyFighter.js';
import { CivilianAircraft } from '../entities/CivilianAircraft.js';
import { RadarGhost } from '../entities/RadarGhost.js';
import { Powerup, POWERUP_TYPES } from '../entities/Powerup.js';
import { Frigate } from '../entities/Frigate.js';
import { Interceptor } from '../entities/Interceptor.js';
import { DifficultyAgent, DIFFICULTY_PRESETS } from '../ai/DifficultyAgent.js';

const KILL_TYPE_NAMES = {
    'ballistic':     'Ballistic missile',
    'cruise':        'Cruise missile',
    'drone':         'Drone',
    'hypersonic':    'Hypersonic',
    'maneuver':      'Maneuvering warhead',
    'loiter':        'Loitering munition',
    'antiship':      'Anti-ship missile',
    'mirv':          'MIRV warhead',
    'enemy_fighter': 'Bogey',
    'bomber':        'Bomber',
};

const THREAT_ORIGINS = [
    { angle: -Math.PI / 2,       label: 'N',  weight: 3 },
    { angle: -Math.PI / 2 + 0.4, label: 'NE', weight: 2 },
    { angle: -Math.PI / 2 - 0.4, label: 'NW', weight: 2 },
    { angle: Math.PI / 4,         label: 'SE', weight: 1 },
    { angle: Math.PI,              label: 'W',  weight: 1 },
];

const QATAR_TARGETS = [
    { x:  0.111, y:  0.011, name: 'Doha',              weight: 5 },
    { x:  0.037, y:  0.074, name: 'Al Udeid',          weight: 3 },
    { x: -0.138, y: -0.041, name: 'Dukhan',            weight: 2 },
    { x:  0.117, y: -0.311, name: 'Ras Laffan',        weight: 3 },
    { x:  0.131, y:  0.055, name: 'Al Wakrah',         weight: 2 },
    { x:  0.110, y: -0.289, name: 'North Base',        weight: 2 },
    { x:  0.137, y:  0.022, name: 'Hamad Intl',        weight: 2 },
    { x:  0.175, y: -0.133, name: 'Al Khor Naval Base', weight: 2 },
];

// Type unlock table — types available from a given wave onward
const TYPE_UNLOCKS = [
    { fromWave:  1, types: ['ballistic', 'cruise'],                                                                        baseCount: [2, 3],  interval: 30 },
    { fromWave:  5, types: ['ballistic', 'cruise', 'drone'],                                                               baseCount: [3, 5],  interval: 27 },
    { fromWave: 10, types: ['ballistic', 'cruise', 'drone', 'antiship'],                                                   baseCount: [3, 5],  interval: 24 },
    { fromWave: 15, types: ['ballistic', 'cruise', 'drone', 'antiship', 'hypersonic'],                                     baseCount: [4, 6],  interval: 22 },
    { fromWave: 22, types: ['ballistic', 'cruise', 'drone', 'antiship', 'hypersonic', 'maneuver'],                         baseCount: [4, 6],  interval: 20 },
    { fromWave: 32, types: ['ballistic', 'cruise', 'drone', 'antiship', 'hypersonic', 'maneuver', 'loiter'],               baseCount: [4, 7],  interval: 18 },
    { fromWave: 55, types: ['ballistic', 'cruise', 'drone', 'antiship', 'hypersonic', 'maneuver', 'loiter', 'mirv'],       baseCount: [5, 8],  interval: 16 },
    { fromWave: 100,types: ['ballistic', 'cruise', 'drone', 'antiship', 'hypersonic', 'maneuver', 'loiter', 'mirv'],       baseCount: [6, 10], interval: 14 },
];

// Heartbeat difficulty state machine
// BUILD → PEAK → DRAIN → RECOVER → BUILD …
const DIFF_CYCLE = ['BUILD', 'PEAK', 'DRAIN', 'RECOVER'];

const DIFF_STATE_PARAMS = {
    //              minDur maxDur countMult  intervalAdd (positive = longer gap = easier)
    BUILD:   { minDur: 55,  maxDur: 90,  countMult: 0.85, intervalAdd:  2 },
    PEAK:    { minDur: 28,  maxDur: 50,  countMult: 1.35, intervalAdd: -6 },
    DRAIN:   { minDur: 22,  maxDur: 38,  countMult: 0.22, intervalAdd: 12 },
    RECOVER: { minDur: 20,  maxDur: 35,  countMult: 0.55, intervalAdd:  6 },
};

// Peak profiles — rotate through these during PEAK state
const PEAK_PROFILES = [
    { id: 'SWARM',      label: 'DRONE SWARM',       biasTypes: ['drone','loiter'],               countBonus: 16, bomberRaid: false },
    { id: 'HEAVY',      label: 'HEAVY ASSAULT',      biasTypes: ['ballistic','mirv','antiship'], countBonus:  0, bomberRaid: true  },
    { id: 'SNIPE',      label: 'PRECISION STRIKE',   biasTypes: ['hypersonic','maneuver'],       countBonus: -2, bomberRaid: false },
    { id: 'SATURATION', label: 'SATURATION ATTACK',  biasTypes: null,                            countBonus:  8, bomberRaid: true  },
];


export class Game {
    constructor(canvas, soundManager) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
        this.sound  = soundManager;

        this.radar         = new Radar(canvas);
        this.entityManager = new EntityManager();
        this.entityManager.radar = this.radar;
        this.gameState     = new GameState();

        this.running = false;
        this.paused  = false;
        this.lastTime = null;

        this.waveTimer  = 0;
        this.nextWaveIn = 5;
        // Wave-clear tracking (replaces currentWaveMissiles)
        this.waveTotal   = 0;  // missiles planned for this wave
        this.waveSpawned = 0;  // missiles actually spawned
        this.waveCleared = true;

        this.onMissileSpawned  = null;
        this.onInterception    = null;
        this.onImpact          = null;
        this.onWave            = null;
        this.onGameOver        = null;
        this.onBorderCross     = null;
        this.onLog             = null;
        this.onHornetUnlocked  = null;
        this.onCutscene        = null;   // (waveNum, doneCb) — called before every 5th wave

        this._waitingForCutscene = false;

        this.laserCooldownMax = 8;
        this.laserCooldown    = 0;

        this.shakeAmount   = 0;
        this.shakeDuration = 0;

        this._jetIdCounter          = 0;
        this._bomberIdCounter       = 0;
        this._enemyFighterIdCounter = 0;
        this.jetDispatchCooldown    = 0;
        this.jetRechargeCooldownMax = 30; // seconds recharge after jets land
        this.jetDisabledWaves       = 0;  // waves Al Udeid is out of action
        this._squadronActive        = false; // true while jets are in the air
        this._pendingJetLaunches    = 0;     // jets still queued to launch

        this._hornetIdCounter       = 0;
        this.hornetCooldown         = 0;
        this.hornetRechargeCooldownMax = 90; // long cooldown — hornets are expendable, not returnable
        this._hornetActive          = false; // true while any hornets are still alive
        this._pendingHornetLaunches = 0;
        this._hornetUnlocked        = false;

        // Naval frigates
        this._frigateIdCounter      = 0;
        this.frigateCooldown        = 0;
        this.frigateRechargeCooldownMax = 60;  // 1 min recharge after RTB
        this._frigateActive         = false;
        this._pendingFrigateLaunches = 0;
        this._frigateUnlocked       = false;
        this._frigateDisabledWaves  = 0; // Al Khor Naval Base disabled counter
        // Al Khor Naval Base spawn point (just off east coast)
        this._alKhorBaseX = 0.175;
        this._alKhorBaseY = -0.133;

        // Battery disabled tracking { batteryId: wavesRemaining }
        this._batteryDisabledWaves = {};

        // Preload Qatar flag image for canvas rendering
        this._flagImg = new Image();
        this._flagImg.src = 'assets/images/Flag_of_Qatar_(3-2).svg.png';

        // EW Jammer
        this._ewActive   = false;
        this._ewTimer    = 0;
        this._ewDuration = 180;  // 3 minutes of jamming
        this._ewCooldown = 0;
        this.ewCooldownMax = 300; // 5 min recharge

        // Kill earnings tracking (for exchange ratio)
        this._killEarnings = 0;

        // Kill streak + floating text
        this._killStreak    = 0;
        this._lastKillTime  = -10;
        this._gameTime      = 0;
        this._floatTexts    = [];

        // Adrenaline mode (active when health ≤ 30%)
        this._adrenMode    = false;

        // Overclock powerup (2× interceptor speed)
        this._overclockActive = false;
        this._overclockTimer  = 0;

        // Achievement system
        this._achievementsEarned  = new Set();
        this._achieveToasts       = [];   // { title, sub, age, maxAge }
        this._consecutivePerfect  = 0;

        // Shield (powerup)
        this._shieldActive   = false;
        this._shieldTimer    = 0;
        this._shieldDuration = 8;

        // ── Heartbeat difficulty state machine ──────────────────────────────
        this._diffState         = 'BUILD';
        this._diffStateTimer    = 0;
        this._diffStateDuration = this._rollStateDuration('BUILD');
        this._peakProfile       = null;
        this._lastPeakProfile   = null;
        // Parabolic envelope — each successive peak is higher than the last
        this._peakCount         = 0;   // total peaks completed so far
        this._lastPeakIntensity = 1.0; // used to scale post-peak lull depth

        // Player telemetry — feeds peak-profile selection bias
        this._telemetry = {
            apmClicks:       0,      // raw click count for current APM window
            apmWindow:       0,      // seconds elapsed in APM window
            apm:             0,      // smoothed actions-per-minute
            interceptsThis:  0,      // interceptions in current state window
            missesThis:      0,      // missiles that hit Qatar in current state window
            avgHesitation:   0,      // avg ms between threat spawn and first click
            lastSpawnTime:   0,
        };

        // Threat Generation Points — AI "war economy"
        // TGP drips in over time; mistakes donate extra TGP to the AI
        this._tgp           = 0;
        this._tgpPassive    = 1.0;  // TGP/sec baseline (grows with wave number)
        this._tgpPeakBudget = 0;   // TGP saved up for this peak

        // Allied support — ADIZ auto-intercept
        this._alliedSupportActive   = false;
        this._alliedSupportTimer    = 0;
        this._alliedSupportDuration = 240;  // 4 minutes active
        this._alliedSupportCooldown = 0;
        this._alliedSupportCooldownMax = 300; // 5 minutes recharge


        // Powerup drop timer
        this._powerupTimer    = 0;
        this._powerupInterval = 45; // seconds between drops

        // ── DDA: contextual bandit agent ─────────────────────────────────────
        this._ddaAgent       = new DifficultyAgent();
        this._ddaAction      = 2;   // start at FLOW preset
        this._ddaPrevHealth  = 200; // filled from gameState on first wave
        this._ddaWaveIntercepts = 0;
        this._ddaWaveTotal      = 0;
        this._ddaWaveMisses     = 0;
    }

    start() {
        if (this.running) return; // guard: never reset mid-game
        this.running = true;
        this.gameState.start();
        this.sound?.resume();
        requestAnimationFrame(ts => this.gameLoop(ts));
    }

    gameLoop = (timestamp) => {
        if (this.lastTime === null) this.lastTime = timestamp;
        const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;
        try {
            this.update(deltaTime);
        } catch (err) {
            console.error('[Game.update] Error — loop continuing:', err);
        }
        try {
            this.render();
        } catch (err) {
            console.error('[Game.render] Error — loop continuing:', err);
        }
        if (this.running) requestAnimationFrame(ts => this.gameLoop(ts));
    };

    update(deltaTime) {
        if (this.paused || this.gameState.isGameOver()) return;

        this._gameTime += deltaTime;
        // Age / prune floating kill texts
        for (const ft of this._floatTexts) ft.age += deltaTime;
        this._floatTexts = this._floatTexts.filter(ft => ft.age < ft.maxAge);

        // Adrenaline mode — triggers when health ≤ 30%
        const _hpPct = this.gameState.getHealth() / this.gameState.getMaxHealth();
        const _wasAdren = this._adrenMode;
        this._adrenMode = _hpPct <= 0.30 && _hpPct > 0;
        if (this._adrenMode && !_wasAdren) {
            this.onLog?.('🔥 ADRENALINE MODE — +50% kill rewards while critical!', 'error');
            this.sound?.speak('Critical damage. Emergency combat protocols active.');
        }

        // Overclock timer
        if (this._overclockActive) {
            this._overclockTimer -= deltaTime;
            if (this._overclockTimer <= 0) {
                this._overclockActive = false;
                this.onLog?.('⚡ OVERCLOCK expired — normal intercept speed restored', 'info');
            }
        }

        // Age / prune achievement toasts
        for (const t of this._achieveToasts) t.age += deltaTime;
        this._achieveToasts = this._achieveToasts.filter(t => t.age < t.maxAge);

        // ── Heartbeat state machine ──────────────────────────────────────────
        this._diffStateTimer += deltaTime;
        if (this._diffStateTimer >= this._diffStateDuration) {
            this._diffStateTimer = 0;
            const idx       = DIFF_CYCLE.indexOf(this._diffState);
            const nextState = DIFF_CYCLE[(idx + 1) % DIFF_CYCLE.length];

            if (nextState === 'PEAK') {
                this._peakCount++;
                // Parabolic envelope: each peak is 18% more intense than the last, capped at ×3.0
                this._lastPeakIntensity = Math.min(1.0 + (this._peakCount - 1) * 0.18, 3.0);
                this._peakProfile    = this._nextPeakProfile();
                this._tgpPeakBudget  = this._tgp;
                this._tgp            = 0;
                const peakLabel = this._peakCount > 1
                    ? `⚠ PEAK #${this._peakCount} — ${this._peakProfile.label} (×${this._lastPeakIntensity.toFixed(1)})`
                    : `⚠ ${this._peakProfile.label} — PEAK ASSAULT INCOMING!`;
                this.onLog?.(peakLabel, 'error');
                if (this._peakProfile.id === 'SWARM') {
                    this.sound?.speak('Warning. Drone swarm inbound. Massive drone threat detected. All units engage.', true);
                } else {
                    this.sound?.speak(`Warning. ${this._peakProfile.label.toLowerCase()} imminent.`, true);
                }
            } else if (nextState === 'DRAIN') {
                this._peakProfile = null;
                // Deeper lull after more intense peaks
                const lullDepth = Math.min(this._lastPeakIntensity * 1.2, 2.5);
                this.onLog?.(`◈ Enemy activity subsiding — lull depth ×${lullDepth.toFixed(1)}. Resupply now.`, 'success');
                this.sound?.speak('Lull in enemy activity. Resupply now.');
            }

            this._diffState         = nextState;
            this._diffStateDuration = this._rollStateDuration(nextState);

            // Reset per-state telemetry counters
            this._telemetry.interceptsThis = 0;
            this._telemetry.missesThis     = 0;
        }

        // TGP passive income — grows slowly with wave number
        this._tgpPassive = 1.0 + this.gameState.getWaveCount() * 0.04;
        this._tgp        = Math.min(this._tgp + this._tgpPassive * deltaTime, 500);

        // APM telemetry window — reset every 60s
        this._telemetry.apmWindow += deltaTime;
        if (this._telemetry.apmWindow >= 60) {
            this._telemetry.apm = Math.round(this._telemetry.apmClicks /
                (this._telemetry.apmWindow / 60));
            this._telemetry.apmClicks  = 0;
            this._telemetry.apmWindow  = 0;
        }

        // Wave spawning
        this.waveTimer += deltaTime;
        if (this.waveTimer >= this.nextWaveIn && !this._waitingForCutscene) {
            const _nextWaveNum = this.gameState.getWaveCount() + 1;
            if (_nextWaveNum % 5 === 0 && this.onCutscene) {
                this._waitingForCutscene = true;
                this.waveTimer = this.nextWaveIn; // freeze timer
                this.pause();
                this.sound?.pauseMusic();
                this.onCutscene(_nextWaveNum, () => {
                    this._waitingForCutscene = false;
                    this.waveTimer = 0;
                    this.resume();
                    this.sound?.resumeMusic();
                    this.spawnWave();
                });
            } else {
                this.waveTimer = 0;
                this.spawnWave();
            }
        }

        // Laser recharge
        if (this.laserCooldown > 0) {
            this.laserCooldown -= deltaTime;
            if (this.laserCooldown <= 0) {
                this.laserCooldown = 0;
                this.onLog?.('Iron Beam recharged \u2014 ready to fire.', 'success');
            }
        }

        // Jet dispatch cooldown
        if (this.jetDispatchCooldown > 0) this.jetDispatchCooldown -= deltaTime;

        // Hornet recharge cooldown
        if (this.hornetCooldown > 0) this.hornetCooldown -= deltaTime;

        // EW jammer active timer
        if (this._ewActive) {
            this._ewTimer -= deltaTime;
            if (this._ewTimer <= 0) {
                this._ewActive = false;
                this._ewCooldown = this.ewCooldownMax;
                // Remove jam from all missiles
                for (const m of this.entityManager.getMissiles()) m._jamMult = 1.0;
                this.onLog?.('⚡ EW jamming ended — missile speeds restored', 'info');
            } else {
                // Continuously apply jam — redirect each unjammed missile past Qatar
                for (const m of this.entityManager.getMissiles()) {
                    if (!m._jammed) {
                        m._jammed  = true;
                        m._jamMult = 0.60; // modest slowdown
                        // Extend trajectory 2.2× past the original target → flies off-screen
                        const dx = m.origTargetX - m.startX;
                        const dy = m.origTargetY - m.startY;
                        m.targetX = m.startX + dx * 2.2;
                        m.targetY = m.startY + dy * 2.2;
                    }
                }
            }
        }
        if (this._ewCooldown > 0) this._ewCooldown -= deltaTime;

        // Shield countdown
        if (this._shieldActive) {
            this._shieldTimer -= deltaTime;
            if (this._shieldTimer <= 0) {
                this._shieldActive = false;
                this.onLog?.('◈ Shield expired.', 'info');
            }
        }

        // Allied support countdown
        if (this._alliedSupportActive) {
            this._alliedSupportTimer -= deltaTime;
            if (this._alliedSupportTimer <= 0) {
                this._alliedSupportActive   = false;
                this._alliedSupportCooldown = this._alliedSupportCooldownMax;
                this.onLog?.('◈ Allied air support coverage expired. Recharging (5 min).', 'warning');
                this.sound?.speak('Allied support window closed.');
            }
        }
        if (this._alliedSupportCooldown > 0) this._alliedSupportCooldown -= deltaTime;

        // Powerup drop timer (from wave 2 onward)
        if (this.gameState.getWaveCount() >= 2) {
            this._powerupTimer += deltaTime;
            if (this._powerupTimer >= this._powerupInterval) {
                this._powerupTimer = 0;
                this._spawnPowerup();
            }
        }

        // Screen shake decay
        if (this.shakeDuration > 0) {
            this.shakeDuration -= deltaTime;
            this.shakeAmount = Math.max(0, this.shakeDuration) * 8;
        } else {
            this.shakeAmount = 0;
        }

        // MIRV split: when a MIRV reaches 60% progress, spawn 2 sub-ballistics
        for (const m of this.entityManager.getMissiles()) {
            if (m.type === 'mirv' && m.progress >= 0.60 && !m.hasSplit) {
                m.hasSplit = true;
                for (let s = 0; s < 2; s++) {
                    const sub = new Missile(
                        m.x, m.y,
                        m.targetX + (Math.random() - 0.5) * 0.14,
                        m.targetY + (Math.random() - 0.5) * 0.14,
                        'ballistic', m.targetName
                    );
                    sub.arcHeight = 0.06;
                    sub.speed *= 1.2;
                    this.entityManager.addMissile(sub);
                }
                this.onLog?.('⚠ MIRV separated — 2 sub-warheads released!', 'error');
                this.sound?.speak('MIRV warhead separation!', true);
            }
        }

        // Detect when dispatched squadron has fully returned
        if (this._squadronActive && this._pendingJetLaunches <= 0
                && this.entityManager.countFighterJets() === 0) {
            this._squadronActive = false;
            this.jetDispatchCooldown = this.jetRechargeCooldownMax;
            this.onLog?.('\u2708 Squadron RTB — Al Udeid recharging (30s)', 'success');
            this.sound?.speak('Squadron returned to base.');
        }

        // Detect when all hornets have been expended (kamikaze — no RTB)
        if (this._hornetActive && this._pendingHornetLaunches <= 0
                && this.entityManager.countHornetDrones() === 0) {
            this._hornetActive = false;
            this.hornetCooldown = this.hornetRechargeCooldownMax;
            this.onLog?.('◈ Hornet UAVs expended — recharging (90s)', 'success');
        }

        // Detect when frigate squadron has returned to Al Khor
        if (this._frigateActive && this._pendingFrigateLaunches <= 0
                && this.entityManager.countFrigates() === 0) {
            this._frigateActive = false;
            this.frigateCooldown = this.frigateRechargeCooldownMax;
            this.onLog?.('⚓ Frigate squadron returned to Al Khor — recharging (2.5 min)', 'success');
            this.sound?.speak('Naval squadron returned to Al Khor base.');
        }
        if (this.frigateCooldown > 0) this.frigateCooldown -= deltaTime;

        const killEvents   = [];
        const impactEvents = [];
        this.entityManager.update(deltaTime, killEvents, impactEvents);

        killEvents.forEach(ev => {
            this.gameState.addMoney(ev.reward);
            this.gameState.addInterception();
            this._killEarnings += ev.reward;

            // Distance-based score: farther intercept = higher score (1x near center → 5x at edge)
            const distFromCenter = (ev.x !== undefined && ev.y !== undefined)
                ? Math.sqrt(ev.x * ev.x + ev.y * ev.y) : 0;
            this.gameState.addScore(Math.round(ev.reward * (1 + distFromCenter * 4)));

            this._telemetry.interceptsThis++;
            this._ddaWaveIntercepts++;
            this.onInterception?.(ev.reward, ev.missileType);
            // Sound order: interception explosion FIRST, then cycling kill callout
            this.sound?.playInterceptionExplosion();
            this.sound?.playKillSfx();

            // ── Kill streak ────────────────────────────────────────────────
            if (this._gameTime - this._lastKillTime < 2.8) {
                this._killStreak++;
            } else {
                this._killStreak = 1;
            }
            this._lastKillTime = this._gameTime;

            let streakBonus = 0;
            if (this._killStreak >= 8) {
                streakBonus = ev.reward;
                if (this._killStreak % 4 === 0) {
                    this.onLog?.(`🔥 ${this._killStreak}-KILL STREAK! +$${streakBonus} BONUS`, 'success');
                    this.sound?.speak('Exceptional interception rate. Keep it up.');
                }
            } else if (this._killStreak === 5) {
                streakBonus = Math.round(ev.reward * 0.75);
                this.onLog?.(`⚡ 5-KILL COMBO! +$${streakBonus} BONUS`, 'success');
            } else if (this._killStreak === 3) {
                streakBonus = Math.round(ev.reward * 0.5);
                this.onLog?.(`⚡ 3-KILL COMBO! +$${streakBonus} BONUS`, 'success');
            }
            if (streakBonus > 0) {
                this.gameState.addMoney(streakBonus);
                this.gameState.addScore(streakBonus * 2);
            }

            // ── Critical intercept (8% chance — 3× reward bonus) ──────────
            const isCritical = Math.random() < 0.08;
            if (isCritical) {
                const critBonus = ev.reward * 2; // total = 3× (1× already given)
                this.gameState.addMoney(critBonus);
                this.gameState.addScore(critBonus);
            }

            // ── Adrenaline mode bonus (health ≤ 30%: +50% per kill) ───────
            if (this._adrenMode) {
                const adrenBonus = Math.round(ev.reward * 0.5);
                this.gameState.addMoney(adrenBonus);
                this.gameState.addScore(adrenBonus);
            }

            // ── Achievement checks ─────────────────────────────────────────
            if (this.gameState.getInterceptionsCount() === 1) this._unlock('first_blood');
            if (this._killStreak === 5)  this._unlock('sharpshooter');
            if (this._killStreak === 10) this._unlock('iron_dome');
            if (this.gameState.getMoneySpent() >= 10000) this._unlock('big_spender');

            // ── Combo jackpot — spawn a powerup at streak milestones ───────
            if ((this._killStreak === 5 || this._killStreak === 10) && ev.x !== undefined) {
                this._spawnPowerupAt(ev.x, ev.y);
            }

            // ── Floating kill text ─────────────────────────────────────────
            if (ev.x !== undefined && ev.y !== undefined) {
                const totalReward = ev.reward + streakBonus + (isCritical ? ev.reward * 2 : 0)
                    + (this._adrenMode ? Math.round(ev.reward * 0.5) : 0);
                let dispText = `+$${totalReward}`;
                if (isCritical)              dispText = `⚡ CRITICAL! +$${totalReward}`;
                else if (this._adrenMode)    dispText = `🔥 +$${totalReward}`;
                else if (streakBonus > 0)    dispText = `+$${totalReward} ×${this._killStreak}`;
                const col = isCritical ? '#ffffff'
                    : this._adrenMode ? '#ff6666'
                    : this._killStreak >= 8 ? '#ff4444'
                    : this._killStreak >= 5 ? '#ffaa00'
                    : this._killStreak >= 3 ? '#ffdd00'
                    : '#44ff88';
                this._floatTexts.push({
                    text: dispText,
                    wx: ev.x + (Math.random() - 0.5) * 0.03,
                    wy: ev.y,
                    age: 0, maxAge: isCritical ? 2.4 : 1.8,
                    color: col,
                    size: isCritical ? 16 : Math.min(9 + this._killStreak * 0.5, 15),
                });
            }

            // Debris fallout: intercepts inside Qatar territory cause falling debris
            const debrisTypes = ['ballistic', 'mirv', 'hypersonic', 'maneuver'];
            if (ev.x !== undefined && debrisTypes.includes(ev.missileType) && this.radar.isInsideQatarStrict(ev.x, ev.y)) {
                const dohaX = 0.111, dohaY = 0.011;
                const dist = Math.sqrt((ev.x - dohaX)**2 + (ev.y - dohaY)**2);
                const debrisDmg = Math.max(1, Math.round(7 * (1 - dist / 0.40)));
                if (Math.random() < 0.6) {
                    this.gameState.damaged(debrisDmg);
                    this.onLog?.(`⚠ Debris from intercept over Qatar! -${debrisDmg} HP`, 'warning');
                    this.entityManager.addExplosion(new Explosion(ev.x, ev.y, 'impact', '#ffaa44'));
                }
            }
        });

        impactEvents.forEach(ev => {
            if (this._shieldActive) {
                // Shield blocks all damage — show intercept flash at impact site
                this.onLog?.('◈ SHIELD BLOCKED incoming strike!', 'success');
                this.entityManager.addExplosion(new Explosion(ev.x ?? 0, ev.y ?? 0, 'intercept', '#38bdf8'));
                return;
            }
            this._telemetry.missesThis++;
            this._ddaWaveMisses++;
            // Missed impact donates TGP bonus to the AI
            this._tgp = Math.min(this._tgp + 12, 500);
            this.gameState.damaged(ev.damage);
            this.triggerShake(0.4);
            this.onImpact?.(ev.damage, ev.missileType, ev.targetName);
            this.sound?.playEnemyExplosion();
            this.sound?.speak('Warning \u2014 missile impact. Damage sustained.', true);
            // Al Udeid hit → disable fighter jets for 10 waves
            if (ev.targetName && ev.targetName.includes('Udeid') && this.jetDisabledWaves <= 0) {
                this.jetDisabledWaves = 10;
                this.onLog?.('\u2708 Al Udeid struck! Fighter jets disabled for 10 waves.', 'error');
                this.sound?.speak('Al Udeid base hit. Air operations suspended.', true);
            }
            // Al Khor Naval Base hit → disable frigates for 8 waves
            if (ev.targetName && ev.targetName.includes('Khor') && this._frigateDisabledWaves <= 0) {
                this._frigateDisabledWaves = 8;
                this._frigateActive = false;
                this.onLog?.('⚓ Al Khor Naval Base struck! Frigate squadron disabled for 8 waves.', 'error');
                this.sound?.speak('Al Khor base hit. Naval operations suspended.', true);
            }
            // Check if impact hit a defense battery
            if (ev.x !== undefined && ev.y !== undefined) {
                const batteries = this.radar.getBatteries();
                for (const b of batteries) {
                    const dx = ev.x - b.x, dy = ev.y - b.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 0.09 && (this._batteryDisabledWaves[b.id] || 0) <= 0) {
                        this._batteryDisabledWaves[b.id] = 5;
                        this.onLog?.(`⚠ Battery ${b.name} HIT! ${b.type.toUpperCase()} unavailable for 5 waves!`, 'error');
                        this._updateRadarBatteries();
                        this.sound?.speak(`${b.type} battery offline.`, true);
                        break;
                    }
                }
            }
        });

        // Wave-clear bonus: fires once when every spawned missile in this wave is gone
        if (this.waveSpawned > 0 && this.waveSpawned >= this.waveTotal
                && !this.waveCleared && this.entityManager.countMissiles() === 0) {
            const lvl = this.gameState.getLevel();
            const baseBonus = 150 + lvl * 30;
            // Perfect-wave bonus: extra 50% if no hits taken this wave
            const perfectWave = this._ddaWaveMisses === 0;
            const bonus = perfectWave ? Math.round(baseBonus * 1.5) : baseBonus;
            this.gameState.addMoney(bonus);
            this.gameState.addScore(bonus);
            const label = perfectWave ? `◈ PERFECT DEFENSE! +$${bonus}` : `Wave cleared! +$${bonus}`;
            this.onLog?.(label, 'success');
            if (perfectWave) {
                this._consecutivePerfect++;
                this.sound?.speak('Perfect defense. No targets penetrated our airspace.');
                this._unlock('perfect_guard');
                if (this._consecutivePerfect >= 3) this._unlock('untouchable');
            } else {
                this._consecutivePerfect = 0;
            }
            this.sound?.playSuccess();
            this.waveCleared = true;
        }

        const missiles = [
            ...this.entityManager.getMissiles(),
            ...this.entityManager.getBombers(),
            ...this.entityManager.getEnemyFighters(),
        ];

        // ADIZ blink: continuous while any enemy is inside the zone
        this.radar.borderSirenActive = missiles.some(
            e => (e.active !== false) && this.radar.isInsideQatar(e.x, e.y)
        );

        this.radar.checkBorderCrossings(missiles, (missile, type) => {
            this.onBorderCross?.(missile, type);
            if (type === 'ENTRY') {
                // Air raid siren — only plays if not already sounding
                this.sound?.playAirRaidSiren();
                const _alertName = missile.config?.name || (missile.type === 'enemy_fighter' ? 'Enemy Fighter' : missile.type?.replace(/_/g, ' ') || 'threat');
                this.sound?.speak(`Border alert — ${_alertName} approaching Qatar airspace.`, true);

                // Allied support / Shield: auto-destroy ADIZ crossers
                if ((this._alliedSupportActive || this._shieldActive) && missile.active) {
                    missile.active = false;
                    const isShield = !this._alliedSupportActive && this._shieldActive;
                    const col = isShield ? '#38bdf8' : '#00aaff';
                    this.gameState.addInterception();
                    const d = Math.sqrt(missile.x * missile.x + missile.y * missile.y);
                    this.gameState.addScore(Math.round((missile.reward || 0) * (1 + d * 4)));
                    this.onInterception?.(0, missile.type);
                    this.entityManager.addExplosion(new Explosion(missile.x, missile.y, 'intercept', col));
                    this.sound?.playInterceptionExplosion();
                    this.sound?.playKillSfx();
                    const tag = isShield ? '◈ SHIELD' : '◈ ALLIED';
                    this.onLog?.(`${tag} INTERCEPT — ${missile.type} neutralized at ADIZ`, 'success');
                }
            }
        });

        // Allied support + Shield: per-frame sweep — destroy all active enemies inside ADIZ
        const _autoIntercept = this._alliedSupportActive || this._shieldActive;
        if (_autoIntercept) {
            const _aic = this._shieldActive && !this._alliedSupportActive ? '#38bdf8' : '#00aaff';
            const _tag = this._shieldActive && !this._alliedSupportActive ? '◈ SHIELD' : '◈ ALLIED';
            this.entityManager.getMissiles().forEach(missile => {
                if (!missile.active) return;
                if (!this.radar.isInsideQatar(missile.x, missile.y)) return;
                missile.active = false;
                this.gameState.addInterception();
                const d = Math.sqrt(missile.x * missile.x + missile.y * missile.y);
                this.gameState.addScore(Math.round((missile.reward || 0) * (1 + d * 4)));
                this.onInterception?.(0, missile.type);
                this.entityManager.addExplosion(new Explosion(missile.x, missile.y, 'intercept', _aic));
                this.sound?.playInterceptionExplosion();
                this.sound?.playKillSfx();
                this.onLog?.(`${_tag} INTERCEPT — ${missile.type} neutralized at ADIZ`, 'success');
            });
            this.entityManager.getBombers().forEach(bomber => {
                if (!bomber.active) return;
                if (!this.radar.isInsideQatar(bomber.x, bomber.y)) return;
                bomber.damage(9999);
                this.onLog?.(`${_tag} INTERCEPT — Bomber neutralized at ADIZ`, 'success');
            });
            this.entityManager.getEnemyFighters().forEach(fighter => {
                if (!fighter.active) return;
                if (!this.radar.isInsideQatar(fighter.x, fighter.y)) return;
                fighter.active = false;
                this.entityManager.addExplosion(new Explosion(fighter.x, fighter.y, 'intercept', _aic));
                this.onLog?.(`${_tag} INTERCEPT — Bogey neutralized at ADIZ`, 'success');
            });
        }

        // Auto-cut air raid siren when no threats remain on screen
        if (this.sound?.isSirenPlaying()) {
            const noThreats = this.entityManager.countMissiles() === 0
                && this.entityManager.countBombers() === 0
                && this.entityManager.countEnemyFighters() === 0;
            if (noThreats) this.sound.stopAirRaidSiren();
        }

        this.radar.update(deltaTime);
        this.gameState.update(deltaTime);

        const prevAngle = this.radar.scanAngle - this.radar.scanSpeed * deltaTime;
        if (prevAngle < -Math.PI / 2 && this.radar.scanAngle >= -Math.PI / 2) {
            this.sound?.playRadarPing();
        }

        if (this.gameState.isGameOver()) {
            this.running = false;
            this.sound?.stopAirRaidSiren();
            this.sound?.playGameOver();
            this.sound?.speak('Defense system failure. Qatar has fallen.', true);
            this.onGameOver?.(this.gameState);
        }
    }

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;

        let sx = 0, sy = 0;
        if (this.shakeAmount > 0) {
            sx = (Math.random() - 0.5) * this.shakeAmount;
            sy = (Math.random() - 0.5) * this.shakeAmount;
        }

        ctx.save();
        ctx.translate(sx, sy);

        ctx.fillStyle = '#050810';
        ctx.fillRect(-10, -10, W + 20, H + 20);

        this.radar.draw(ctx);
        this.entityManager.draw(ctx, this.radar);

        // Qatar flag — drawn below top HUD bar using PNG image
        const flagW = 108, flagH = 54;
        const flagX = W - flagW - 240;
        const flagY = 70;
        if (this._flagImg.complete && this._flagImg.naturalWidth > 0) {
            ctx.drawImage(this._flagImg, flagX, flagY, flagW, flagH);
            ctx.fillStyle = 'rgba(0,200,0,0.7)';
            ctx.font = '8px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('STATE OF QATAR', flagX + 4, flagY + flagH + 11);
        }

        this.drawHealthBar(ctx, W, H);

        // Shield active visual — pulsing blue ring around radar
        if (this._shieldActive) {
            const pulse = 0.35 + 0.25 * Math.sin(this.radar.time * 7);
            ctx.save();
            ctx.strokeStyle = `rgba(56,189,248,${pulse.toFixed(2)})`;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(this.radar.centerX, this.radar.centerY, this.radar.maxRadius - 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(56,189,248,0.80)';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`◈ SHIELD ACTIVE  ${Math.ceil(this._shieldTimer)}s`, W / 2, 106);
            ctx.restore();
        }

        // Allied support active indicator
        if (this._alliedSupportActive) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,180,255,0.88)';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`⚡ ALLIED COVER ACTIVE  ${Math.ceil(this._alliedSupportTimer)}s`, W / 2, 138);
            ctx.restore();
        }

        // EW jammer active visual — expanding rings from radar center
        if (this._ewActive) {
            const progress = 1 - this._ewTimer / this._ewDuration;
            ctx.save();
            for (let i = 0; i < 3; i++) {
                const r = ((progress + i * 0.33) % 1.0) * this.radar.maxRadius * 1.1;
                const alpha = (1 - r / (this.radar.maxRadius * 1.1)) * 0.55;
                ctx.strokeStyle = `rgba(0,200,255,${alpha.toFixed(2)})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.radar.centerX, this.radar.centerY, r, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(0,200,255,0.85)';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`⚡ EW JAMMING ACTIVE  ${Math.ceil(this._ewTimer)}s`, W / 2, 90);
            ctx.restore();
        }

        // Lull indicator — only shown during ebb/recover windows
        if (this._diffState === 'DRAIN' || this._diffState === 'RECOVER') {
            const waveLeft = Math.ceil(this.nextWaveIn - this.waveTimer);
            ctx.save();
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(100,255,180,0.85)';
            ctx.fillText(`◈ RESUPPLY WINDOW — next wave in ${waveLeft}s`, W / 2, 122);
            ctx.restore();
        }
        // Peak alert — flashing label only, no wave countdown
        if (this._diffState === 'PEAK' && this._peakProfile) {
            const alpha = 0.55 + 0.45 * Math.sin(this.radar.time * 5);
            ctx.save();
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(255,60,60,${alpha.toFixed(2)})`;
            ctx.fillText(`⚠ ${this._peakProfile.label}`, W / 2, 122);
            ctx.restore();
        }

        if (this.laserCooldown > 0) this.drawLaserCooldown(ctx, W, H);
        if (this.jetDispatchCooldown > 0 || this.jetDisabledWaves > 0) this.drawJetStatus(ctx, W, H);

        // Active jets indicator
        const jets = this.entityManager.countFighterJets();
        if (jets > 0) {
            ctx.fillStyle = '#ffdd44';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`\u2708 ${jets} JET(S) ACTIVE`, 10, H - 62);
        }

        // ── Floating kill text ─────────────────────────────────────────────
        for (const ft of this._floatTexts) {
            const sp = this.radar.worldToScreen(ft.wx, ft.wy - ft.age * 0.10);
            const alpha = Math.max(0, 1 - ft.age / ft.maxAge);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.shadowColor = ft.color;
            ctx.shadowBlur  = 8;
            ctx.fillStyle   = ft.color;
            ctx.font        = `bold ${Math.round(ft.size)}px monospace`;
            ctx.textAlign   = 'center';
            ctx.fillText(ft.text, sp.x, sp.y);
            ctx.restore();
        }

        // ── Kill streak badge (top-center when streak ≥ 3) ────────────────
        if (this._killStreak >= 3 && this._gameTime - this._lastKillTime < 4.0) {
            const age = this._gameTime - this._lastKillTime;
            const a   = age < 2.8 ? 1.0 : Math.max(0, 1 - (age - 2.8) / 1.2);
            ctx.save();
            ctx.globalAlpha = a;
            const col = this._killStreak >= 8 ? '#ff4444'
                : this._killStreak >= 5 ? '#ffaa00' : '#ffdd00';
            ctx.font      = `bold 13px monospace`;
            ctx.textAlign = 'center';
            ctx.fillStyle = col;
            ctx.shadowColor = col; ctx.shadowBlur = 12;
            ctx.fillText(`🔥 ×${this._killStreak} STREAK`, W / 2, 160);
            ctx.restore();
        }

        // ── Adrenaline mode — pulsing red border ───────────────────────────
        if (this._adrenMode) {
            const pulse = 0.25 + 0.25 * Math.sin(this._gameTime * 9);
            ctx.save();
            ctx.strokeStyle = `rgba(239,68,68,${pulse.toFixed(2)})`;
            ctx.lineWidth   = 14;
            ctx.strokeRect(0, 0, W, H);
            ctx.fillStyle   = 'rgba(239,68,68,0.85)';
            ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 16;
            ctx.font        = 'bold 11px monospace';
            ctx.textAlign   = 'center';
            ctx.fillText('🔥 ADRENALINE MODE — +50% KILL REWARDS', W / 2, 175);
            ctx.restore();
        }

        // ── Overclock indicator ────────────────────────────────────────────
        if (this._overclockActive) {
            ctx.save();
            ctx.fillStyle   = 'rgba(0,255,200,0.90)';
            ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 12;
            ctx.font        = 'bold 10px monospace';
            ctx.textAlign   = 'center';
            ctx.fillText(`⚡ OVERCLOCK ACTIVE ${Math.ceil(this._overclockTimer)}s — 2× INTERCEPT SPEED`, W / 2, 191);
            ctx.restore();
        }

        // ── Achievement toasts (slide in from right) ───────────────────────
        for (let i = 0; i < this._achieveToasts.length; i++) {
            const t = this._achieveToasts[i];
            const slideIn = Math.min(1, t.age / 0.35);
            const fade    = t.age > 4.5 ? Math.max(0, 1 - (t.age - 4.5) / 1.0) : 1.0;
            const alpha   = slideIn * fade;
            const bw = 200, bh = 54, br = 6;
            const bx = W - 16 - bw + (1 - slideIn) * (bw + 20);
            const by = H - 170 - i * 64;
            ctx.save();
            ctx.globalAlpha = alpha;
            // Background card
            ctx.fillStyle   = 'rgba(8,12,28,0.93)';
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth   = 1.5;
            ctx.beginPath();
            ctx.moveTo(bx + br, by); ctx.lineTo(bx + bw - br, by);
            ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + br);
            ctx.lineTo(bx + bw, by + bh - br);
            ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh);
            ctx.lineTo(bx + br, by + bh);
            ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br);
            ctx.lineTo(bx, by + br);
            ctx.quadraticCurveTo(bx, by, bx + br, by);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            // Gold accent bar at top
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(bx + br, by, bw - br * 2, 3);
            // Title
            ctx.fillStyle   = '#fcd34d';
            ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 8;
            ctx.font        = 'bold 9px monospace';
            ctx.textAlign   = 'left';
            ctx.fillText(t.title, bx + 10, by + 18);
            // Sub
            ctx.fillStyle  = '#94a3b8'; ctx.shadowBlur = 0;
            ctx.font       = '7px monospace';
            ctx.fillText(t.sub, bx + 10, by + 31);
            // Badge
            ctx.fillStyle  = '#f59e0b';
            ctx.font       = 'bold 6px monospace';
            ctx.textAlign  = 'right';
            ctx.fillText('ACHIEVEMENT', bx + bw - 8, by + 44);
            ctx.restore();
        }

        ctx.restore();
    }

    drawHealthBar(ctx, W, H) {
        const hp    = Math.max(0, this.gameState.getHealth());
        const maxHp = this.gameState.getMaxHealth();
        const barW = 200, barH = 10;
        const bx = W / 2 - barW / 2, by = H - 52;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);

        const ratio = hp / maxHp;
        const col = ratio > 0.5 ? '#00cc44' : ratio > 0.25 ? '#ffcc00' : '#ff3300';
        ctx.fillStyle = col;
        ctx.fillRect(bx, by, barW * ratio, barH);

        ctx.strokeStyle = 'rgba(0,200,0,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, barW, barH);

    }

    drawLaserCooldown(ctx, W, H) {
        const ratio = this.laserCooldown / this.laserCooldownMax;
        const barW = 80, bx = W / 2 + 120, by = H - 52;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx, by, barW, 10);
        ctx.fillStyle = '#ff4488';
        ctx.fillRect(bx, by, barW * ratio, 10);
        ctx.strokeStyle = '#ff448888';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, barW, 10);
        ctx.fillStyle = '#ff4488';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`LASER ${Math.ceil(this.laserCooldown)}s`, bx + barW / 2, by - 3);
    }

    drawJetStatus(ctx, W, H) {
        const bx = W / 2 - 230, by = H - 52;
        if (this.jetDisabledWaves > 0) {
            ctx.fillStyle = '#ff4444';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`\u2708 AL UDEID OFFLINE (${this.jetDisabledWaves} waves)`, bx + 50, by - 3);
            ctx.fillStyle = 'rgba(255,68,68,0.3)';
            ctx.fillRect(bx, by, 100, 10);
        } else {
            const ratio = this.jetDispatchCooldown / this.jetRechargeCooldownMax;
            const barW = 80;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(bx, by, barW, 10);
            ctx.fillStyle = '#ffdd44';
            ctx.fillRect(bx, by, barW * ratio, 10);
            ctx.strokeStyle = '#ffdd4488';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, barW, 10);
            ctx.fillStyle = '#ffdd44';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`JET ${Math.ceil(this.jetDispatchCooldown)}s`, bx + barW / 2, by - 3);
        }
    }

    spawnWave() {
        this._inLull = false; // clear lull state when a new wave begins
        const waveNum = this.gameState.getWaveCount() + 1;
        this.gameState.addWave();

        // Decrement Al Udeid disable counter
        if (this.jetDisabledWaves > 0) {
            this.jetDisabledWaves--;
            if (this.jetDisabledWaves === 0) {
                this.onLog?.('\u2708 Al Udeid operational — fighter jets restored!', 'success');
                this.sound?.speak('Al Udeid base restored. Jets available.');
            }
        }

        // Decrement battery disabled counters
        for (const id of Object.keys(this._batteryDisabledWaves)) {
            if (this._batteryDisabledWaves[id] > 0) {
                this._batteryDisabledWaves[id]--;
                if (this._batteryDisabledWaves[id] === 0) {
                    const b = this.radar.getBatteries().find(bat => bat.id === id);
                    if (b) {
                        this.onLog?.(`◈ Battery ${b.name} repaired — ${b.type.toUpperCase()} restored!`, 'success');
                        this._updateRadarBatteries();
                    }
                }
            }
        }

        // Wave survival achievements
        if (waveNum === 10) this._unlock('veteran');
        if (waveNum === 20) this._unlock('elite');
        if (waveNum === 5)  this._unlock('survivor');

        // Hornet unlock at wave 8
        if (waveNum === 8) {
            this._hornetUnlocked = true;
            this.onLog?.('◈ HORNET KAMIKAZE SWARM UNLOCKED — [8] Launch 10 UAVs ($600). Cruise/drone/loiter hunters. No RTB.', 'success');
            this.sound?.speak('Hornet kamikaze drone system online.');
            this.onHornetUnlocked?.();
        }

        // Frigate squadron unlock at wave 11
        if (waveNum === 11) {
            this._frigateUnlocked = true;
            this.onLog?.('⚓ NAVAL FRIGATES UNLOCKED — [7] Deploy 7 frigates ($1200). Cruise & anti-ship kills. Patrol Persian Gulf + northern tip. RTB to Al Khor.', 'success');
            this.sound?.speak('Qatar naval frigate squadron now available. Deploying from Al Khor.');
            this.onFrigateUnlocked?.();
        }

        // Decrement Al Khor Naval Base disable counter
        if (this._frigateDisabledWaves > 0) {
            this._frigateDisabledWaves--;
            if (this._frigateDisabledWaves === 0) {
                this.onLog?.('⚓ Al Khor Naval Base repaired — frigate squadron restored!', 'success');
                this.sound?.speak('Al Khor Naval Base operational.');
            }
        }

        // ── DDA: run bandit agent to pick difficulty preset ────────────────
        if (waveNum > 1) {
            const obs = {
                interceptsThisWave: this._ddaWaveIntercepts,
                totalThisWave:      this._ddaWaveTotal || 1,
                health:             this.gameState.health,
                maxHealth:          this.gameState.maxHealth,
                prevHealth:         this._ddaPrevHealth,
                apm:                this._telemetry.apm,
                waveCount:          waveNum,
                missesThisWave:     this._ddaWaveMisses,
                avgHesitation:      this._telemetry.avgHesitation || 0,
                money:              this.gameState.getMoney(),
            };
            try {
                const reward = this._ddaAgent.computeReward(obs);
                const state  = this._ddaAgent.buildState(obs);
                const action = this._ddaAgent.step(state, reward, this._diffState);
                if (action >= 0 && action < DIFFICULTY_PRESETS.length) {
                    this._ddaAction = action;
                    this.onLog?.(`[AI] ${DIFFICULTY_PRESETS[action].label}  (R=${reward.toFixed(2)})`, 'info');
                }
            } catch (ddaErr) {
                console.warn('[DDA] step error — using last action:', ddaErr);
            }
        }
        // Reset per-wave DDA counters
        this._ddaWaveIntercepts = 0;
        this._ddaWaveMisses     = 0;
        this._ddaPrevHealth     = this.gameState.health;

        // Pick type config by wave (unlock table — later rows have more threat types)
        const cfg = [...TYPE_UNLOCKS].reverse().find(c => waveNum >= c.fromWave) || TYPE_UNLOCKS[0];

        // ── Count calculation ──────────────────────────────────────────────
        // Baseline grows ~0.8% per wave (very slow); hard-capped at 40
        const baselineGrowth = 1.0 + Math.min(waveNum * 0.008, 0.9);
        const stateParams    = DIFF_STATE_PARAMS[this._diffState];
        // Safe fallback to FLOW preset if ddaAction is somehow out of range
        const ddaPreset      = DIFFICULTY_PRESETS[this._ddaAction] ?? DIFFICULTY_PRESETS[2];

        // peakBonus scales 0→full over first 20 waves so early peaks feel mild
        const wavePeakScale  = Math.min(waveNum / 20, 1.0);
        const peakBonus      = this._diffState === 'PEAK' && this._peakProfile?.countBonus
            ? Math.round(this._peakProfile.countBonus * wavePeakScale) : 0;
        // TGP intensity: bonus missiles only kick in meaningfully after wave 10
        const tgpBonus = (this._diffState === 'PEAK' && waveNum >= 10)
            ? Math.floor(Math.min(this._tgpPeakBudget, 200) / 22) : 0;

        // Parabolic envelope:
        // - PEAK: grows every cycle (×1.0, ×1.18, ×1.36 …)
        // - DRAIN / RECOVER: always reset to wave-1 baseline — fixed valley regardless of peak height
        const isPeak = this._diffState === 'PEAK';
        const isLull = this._diffState === 'DRAIN' || this._diffState === 'RECOVER';

        let blendedMult;
        if (isLull) {
            // Hard-reset to wave-1 feel: ignore stateParams and DDA, use fixed low multiplier
            blendedMult = 0.28;
        } else if (isPeak) {
            blendedMult = stateParams.countMult * ddaPreset.countMult * this._lastPeakIntensity;
        } else {
            // BUILD — normal ramp-up toward the coming peak
            blendedMult = stateParams.countMult * ddaPreset.countMult;
        }

        const [cmin, cmax] = cfg.baseCount;
        const rawCount = cmin + Math.floor(Math.random() * Math.max(1, cmax - cmin + 1));
        const count    = Math.min(
            Math.round(rawCount * baselineGrowth * blendedMult) + peakBonus + tgpBonus,
            40
        );
        this._ddaWaveTotal = count;

        // ── Interval calculation ───────────────────────────────────────────
        // Base interval shrinks very slowly (capped at 10s minimum)
        const baseInterval = Math.max(10, cfg.interval - Math.min(waveNum * 0.05, 6));
        // DDA interval weight scales 0→1 over first 12 waves so early waves aren't stretched
        const ddaIScale    = Math.min(waveNum / 12, 1.0);
        const blendedIAdd  = stateParams.intervalAdd + ddaPreset.intervalAdd * ddaIScale;
        // Lull intervals scale with how intense the last peak was — deeper lulls after harder peaks
        const lullIntervalBonus = isLull
            ? Math.round((this._lastPeakIntensity - 1.0) * 8)  // up to +8s extra gap at max intensity
            : 0;
        // Hard cap: 28s max (lulls can push slightly higher than normal), 6s min
        this.nextWaveIn    = Math.min(28, Math.max(6, baseInterval + blendedIAdd + lullIntervalBonus));

        // Apply TGP passive bonus from DDA preset
        this._tgpPassive = Math.max(0.5, this._tgpPassive + ddaPreset.tgpPassiveBonus);

        // In DRAIN / RECOVER, show lull indicator (reuse _inLull logic)
        this._inLull = (this._diffState === 'DRAIN' || this._diffState === 'RECOVER');

        this.waveTotal   = count;
        this.waveSpawned = 0;
        this.waveCleared = false;

        const isLullWave = this._inLull;
        const waveBonus  = 50 + waveNum * 8 + (isLullWave ? 400 : 0);
        this.gameState.addMoney(waveBonus);

        // Divert all active civilian aircraft when threats are incoming
        this.entityManager.getCivilians().forEach(c => c.divert?.());

        // Spawn civilian traffic (from wave 2 onward)
        // 35% chance transit, 25% chance inbound landing flight
        if (waveNum >= 2) {
            if (Math.random() < 0.35) {
                setTimeout(() => {
                    if (!this.gameState.isGameOver()) {
                        this.entityManager.addCivilian(new CivilianAircraft(false)); // transit
                    }
                }, 3000 + Math.random() * 6000);
            }
            if (Math.random() < 0.25) {
                setTimeout(() => {
                    if (!this.gameState.isGameOver()) {
                        this.entityManager.addCivilian(new CivilianAircraft(true)); // landing
                    }
                }, 5000 + Math.random() * 8000);
            }
        }

        // Spawn EW ghost blips (from wave 5 onward)
        if (waveNum >= 5 && Math.random() < 0.45) {
            const numGhosts = 1 + (Math.random() < 0.3 ? 1 : 0);
            for (let g = 0; g < numGhosts; g++) {
                setTimeout(() => {
                    if (!this.gameState.isGameOver()) {
                        this.entityManager.addGhost(new RadarGhost());
                    }
                }, 2000 + g * 2500 + Math.random() * 3000);
            }
        }

        // ── Weighted type pool ─────────────────────────────────────────────
        // Hypersonic: rare early (5% at wave 15) → max 25% at wave 100, even rarer outside SNIPE
        // MIRV: rare until wave 55, max 20% at wave 100
        const typePool = cfg.types.map(t => {
            let w = 10; // default equal weight
            if (t === 'hypersonic') {
                const base = Math.min(0.25, 0.05 + Math.max(0, waveNum - 15) / 340);
                const peakMult = (this._diffState === 'PEAK' && this._peakProfile?.id === 'SNIPE') ? 2.2 : 1;
                w = Math.max(0.1, base * 10 * peakMult);
            } else if (t === 'mirv') {
                const base = Math.min(0.20, Math.max(0, waveNum - 55) / 225);
                w = Math.max(0.1, base * 10);
            } else if (this._diffState === 'PEAK' && this._peakProfile?.biasTypes) {
                // Bias toward this peak's preferred types (4× weight); suppress others
                w = this._peakProfile.biasTypes.includes(t) ? 40 : 3;
            }
            return { type: t, w };
        });
        const totalPoolW = typePool.reduce((s, t) => s + t.w, 0);
        const pickType = () => {
            let r = Math.random() * totalPoolW;
            for (const t of typePool) { r -= t.w; if (r <= 0) return t.type; }
            return typePool[typePool.length - 1].type;
        };

        const waveTypes = [];
        for (let i = 0; i < count; i++) {
            const type = pickType();
            waveTypes.push(type);
            setTimeout(() => this.spawnMissile(type), i * 1400 + Math.random() * 400);
        }

        this.onWave?.(waveNum, count, waveTypes);
        this.onLog?.(`Wave ${waveNum} — ${count} threats inbound  +$${waveBonus}`, 'wave');
        this.sound?.playNewWave();
        this.sound?.playWaveStartSfx();

        // Announce lull during ebb/recover windows
        if (isLullWave) {
            const lullSecs = Math.round(this.nextWaveIn);
            this.onLog?.(`◈ RESUPPLY WINDOW — ${lullSecs}s before next wave`, 'success');
            this.sound?.speak('Lull in enemy activity. Resupply now.');
        }

        // Bomber raid: during HEAVY or SATURATION peak (from wave 5), or every 8th wave
        const peakBomber = this._diffState === 'PEAK' && this._peakProfile?.bomberRaid && waveNum >= 5;
        if (peakBomber || (waveNum >= 5 && waveNum % 8 === 0)) {
            setTimeout(() => this.spawnBomber(), 8000);
            this.onLog?.('⊛ BOMBER RAID INBOUND in 8s — INTERCEPT!', 'error');
        }

        // Enemy fighter escorts every 3rd wave starting at wave 3
        if (waveNum >= 3 && waveNum % 3 === 0) {
            const numFighters = 1 + Math.floor(waveNum / 10);
            for (let f = 0; f < Math.min(numFighters, 3); f++) {
                setTimeout(() => this.spawnEnemyFighter(), 3000 + f * 2000);
            }
            this.onLog?.('⚠ ENEMY FIGHTER ESCORT DETECTED!', 'error');
        }

        if (waveTypes.includes('mirv'))       this.sound?.speak('MIRV warhead detected.', true);
        else if (waveTypes.includes('hypersonic')) this.sound?.speak('Hypersonic threat detected.', true);
        else if (waveTypes.includes('maneuver'))   this.sound?.speak('Maneuvering warhead inbound.', true);
        else if (waveTypes.includes('loiter'))     this.sound?.speak('Loitering munitions detected.', true);
        else if (waveTypes.includes('ballistic'))  this.sound?.speak('Ballistic missile inbound.', true);
        else if (waveTypes.includes('drone'))      this.sound?.speak('Drone swarm inbound.', true);
    }

    spawnMissile(type) {
        if (this.gameState.isGameOver()) return;

        // Anti-ship missiles only exist when frigates are at sea — skip otherwise
        if (type === 'antiship') {
            const activeFrigates = this.entityManager.getFrigates().filter(f => f.isActive() && f.state !== 'returning');
            if (activeFrigates.length === 0) return; // no ships to target — silently skip
        }

        const totalWeight = THREAT_ORIGINS.reduce((s, o) => s + o.weight, 0);
        let rnd = Math.random() * totalWeight;
        let origin = THREAT_ORIGINS[0];
        for (const o of THREAT_ORIGINS) { rnd -= o.weight; if (rnd <= 0) { origin = o; break; } }

        const spread = 0.35;
        const spawnAngle = origin.angle + (Math.random() - 0.5) * spread;
        const spawnDist  = 1.05 + Math.random() * 0.1;
        const startX = Math.cos(spawnAngle) * spawnDist;
        const startY = Math.sin(spawnAngle) * spawnDist;

        let targetX, targetY, targetName;

        if (type === 'antiship') {
            // Target a random active frigate
            const activeFrigates = this.entityManager.getFrigates().filter(f => f.isActive() && f.state !== 'returning');
            const tgtShip = activeFrigates[Math.floor(Math.random() * activeFrigates.length)];
            targetX    = tgtShip.x + (Math.random() - 0.5) * 0.04;
            targetY    = tgtShip.y + (Math.random() - 0.5) * 0.04;
            targetName = tgtShip.callsign;
        } else {
            const totalTW = QATAR_TARGETS.reduce((s, t) => s + t.weight, 0);
            let rndT = Math.random() * totalTW;
            let target = QATAR_TARGETS[0];
            for (const t of QATAR_TARGETS) { rndT -= t.weight; if (rndT <= 0) { target = t; break; } }
            targetX    = target.x + (Math.random() - 0.5) * 0.06;
            targetY    = target.y + (Math.random() - 0.5) * 0.06;
            targetName = target.name;
        }

        // Scale missile speed/damage slightly with wave number for infinite difficulty
        // DDA speedMult stacks on top (EASY slows them, BRUTAL speeds them up)
        const waveScaling = (1.0 + Math.min((this.gameState.getWaveCount() - 1) * 0.04, 1.5))
                          * (DIFFICULTY_PRESETS[this._ddaAction]?.speedMult ?? 1.0);
        const missile = new Missile(startX, startY, targetX, targetY, type, targetName, waveScaling);
        this.entityManager.addMissile(missile);
        this.waveSpawned++;

        this.onMissileSpawned?.(type, MISSILE_TYPES[type]?.threatLevel || 'HIGH', targetName);
        this.sound?.playMissileAlert();
        if (type === 'hypersonic') this.sound?.playHypersonicAlert();
    }

    spawnMissileFrom(fromX, fromY, type) {
        if (this.gameState.isGameOver()) return;
        const totalTW = QATAR_TARGETS.reduce((s, t) => s + t.weight, 0);
        let rndT = Math.random() * totalTW;
        let target = QATAR_TARGETS[0];
        for (const t of QATAR_TARGETS) { rndT -= t.weight; if (rndT <= 0) { target = t; break; } }
        const targetX = target.x + (Math.random() - 0.5) * 0.06;
        const targetY = target.y + (Math.random() - 0.5) * 0.06;
        const waveScaling = 1.0 + Math.min((this.gameState.getWaveCount() - 1) * 0.04, 1.5);
        const missile = new Missile(fromX, fromY, targetX, targetY, type, target.name, waveScaling);
        this.entityManager.addMissile(missile);
        this.waveTotal++;
        this.waveSpawned++;
        this.onMissileSpawned?.(type, MISSILE_TYPES[type]?.threatLevel || 'HIGH', target.name);
    }

    spawnEnemyFighter() {
        if (this.gameState.isGameOver()) return;
        const waveScaling = 1.0 + Math.min((this.gameState.getWaveCount() - 1) * 0.04, 1.5);
        const fighter = new EnemyFighter(++this._enemyFighterIdCounter, waveScaling);
        fighter.onFire((fx, fy, tx, ty) => {
            // Fighter fires a cruise or ballistic missile at target
            if (this.gameState.isGameOver()) return;
            const waveS = 1.0 + Math.min((this.gameState.getWaveCount() - 1) * 0.04, 1.5);
            const fireType = Math.random() < 0.5 ? 'cruise' : 'ballistic';
            const missile = new Missile(fx, fy, tx, ty, fireType, 'Qatar', waveS);
            this.entityManager.addMissile(missile);
            this.waveTotal++;
            this.waveSpawned++;
            this.onMissileSpawned?.(fireType, 'HIGH', 'Qatar');
            this.sound?.playMissileAlert();
            this.onLog?.(`⚠ Enemy fighter fired ${fireType} missile!`, 'error');
        });
        this.entityManager.addEnemyFighter(fighter);
        this.onLog?.('⚠ BOGEY INBOUND — enemy fighter approaching!', 'error');
        this.sound?.speak('Enemy fighter detected.');
    }

    spawnBomber() {
        if (this.gameState.isGameOver()) return;
        const waveScaling = 1.0 + Math.min((this.gameState.getWaveCount() - 1) * 0.04, 1.5);
        const bomber = new Bomber(++this._bomberIdCounter, waveScaling);
        bomber.onDrop((x, y) => {
            const dropTypes = ['ballistic', 'cruise', 'drone'];
            const n = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < n; i++) {
                this.spawnMissileFrom(x, y, dropTypes[Math.floor(Math.random() * dropTypes.length)]);
            }
            this.sound?.playMissileAlert();
            this.onLog?.('⊛ Bomber releasing payload!', 'error');
        });
        bomber.onDestroy(() => {
            this.gameState.addMoney(bomber.reward);
            this.gameState.addInterception();
            const bd = Math.sqrt(bomber.x * bomber.x + bomber.y * bomber.y);
            this.gameState.addScore(Math.round(bomber.reward * (1 + bd * 4)));
            this.onInterception?.(bomber.reward, 'bomber');
            this.entityManager.addExplosion(new Explosion(bomber.x, bomber.y, 'intercept', '#ffcc44'));
            this.sound?.playInterceptionExplosion();
            this.sound?.playKillSfx();
            this.onLog?.(`⊛ Bomber destroyed! +$${bomber.reward}`, 'success');
            this.sound?.speak('Enemy bomber neutralized.');
        });
        this.entityManager.addBomber(bomber);
        this.onLog?.('⊛ STRATEGIC BOMBER DETECTED — ENGAGE!', 'error');
        this.sound?.speak('Enemy strategic bomber inbound. Intercept immediately.', true);
    }

    // ── Heartbeat helpers ──────────────────────────────────────────────────
    _rollStateDuration(state) {
        const p = DIFF_STATE_PARAMS[state];
        return p.minDur + Math.random() * (p.maxDur - p.minDur);
    }

    _nextPeakProfile() {
        const wave = this.gameState.getWaveCount();
        const available = PEAK_PROFILES.filter(p => {
            if (p.id === 'SNIPE'      && wave < 15) return false;
            if (p.id === 'SATURATION' && wave < 25) return false;
            if (p.id === 'HEAVY'      && wave <  5) return false;
            if (p.id === 'SWARM'      && wave <  5) return false; // drone type unlocks at wave 5
            return true;
        });
        // Telemetry bias: if player is under-performing (missesThis > interceptsThis), ease up
        const struggling = this._telemetry.missesThis > this._telemetry.interceptsThis;
        // High APM player → swarm is more interesting pressure; low APM → precision strike
        const hiAPM = this._telemetry.apm > 12;

        // Weight by telemetry
        const weighted = available.map(p => {
            let w = 1;
            if (struggling) {
                // Pull back SATURATION/SNIPE, boost SWARM (easier to manage)
                if (p.id === 'SATURATION') w = 0.3;
                if (p.id === 'SNIPE')      w = 0.5;
                if (p.id === 'SWARM')      w = 1.8;
            } else if (hiAPM) {
                if (p.id === 'SNIPE') w = 1.6; // challenge a fast player with precision threats
            }
            // Don't repeat the same profile twice
            if (p === this._lastPeakProfile) w *= 0.15;
            return { p, w };
        });

        const totalW = weighted.reduce((s, x) => s + x.w, 0);
        let r = Math.random() * totalW;
        for (const x of weighted) { r -= x.w; if (r <= 0) { this._lastPeakProfile = x.p; return x.p; } }
        const chosen = weighted[weighted.length - 1].p;
        this._lastPeakProfile = chosen;
        return chosen;
    }

    // Call this from InputHandler whenever player fires an interceptor
    recordClick() {
        this._telemetry.apmClicks++;
    }

    dispatchFighterJet() {
        // Safety: reset stuck state if no jets remain and no launches queued
        if (this._squadronActive && this._pendingJetLaunches <= 0 && this.entityManager.countFighterJets() === 0) {
            this._squadronActive = false;
            if (this.jetDispatchCooldown <= 0) this.jetDispatchCooldown = this.jetRechargeCooldownMax;
        }
        if (this.jetDisabledWaves > 0) return { ok: false, reason: `udeid:${this.jetDisabledWaves}` };
        if (this._squadronActive)      return { ok: false, reason: 'inflight' };
        if (this.jetDispatchCooldown > 0) return { ok: false, reason: `cooldown:${Math.ceil(this.jetDispatchCooldown)}` };
        const cost = 1500;
        if (!this.gameState.spendMoney(cost)) return { ok: false, reason: 'funds' };

        const SQUADRON_SIZE = 20;
        const baseX = 0.037, baseY = 0.074; // Al Udeid
        this._squadronActive     = true;
        this._pendingJetLaunches = SQUADRON_SIZE;

        // 4 wings of 5 — each wing gets its own patrol sector so jets spread across the radar
        const WINGS = [
            { patrol: [-0.28, -0.28] }, // NW
            { patrol: [ 0.28, -0.28] }, // NE
            { patrol: [ 0.28,  0.20] }, // SE
            { patrol: [-0.28,  0.20] }, // SW
        ];

        for (let i = 0; i < SQUADRON_SIZE; i++) {
            const wing = WINGS[Math.floor(i / 5)];       // 5 jets per wing
            const slot = i % 5;
            const offX = (slot - 2) * 0.035 + (Math.random() - 0.5) * 0.015;
            const offY = (Math.floor(i / 5) - 1.5) * 0.040 + (Math.random() - 0.5) * 0.015;
            setTimeout(() => {
                if (this.gameState.isGameOver()) { this._pendingJetLaunches--; return; }
                this._jetIdCounter++;
                const jet = new FighterJet(this._jetIdCounter, baseX + offX, baseY + offY, wing.patrol[0], wing.patrol[1]);
                jet.onKill(target => {
                    if (target.type === 'bomber') return; // onDestroy handles credit
                    this.gameState.addMoney(target.reward);
                    this.gameState.addInterception();
                    const jd = Math.sqrt(target.x * target.x + target.y * target.y);
                    this.gameState.addScore(Math.round(target.reward * (1 + jd * 4)));
                    this.onInterception?.(target.reward, target.type);
                    this.entityManager.addExplosion(
                        new Explosion(target.x, target.y, 'intercept', '#ffdd44')
                    );
                    this.sound?.playInterceptionExplosion();
                    this.sound?.playKillSfx();
                    this.onLog?.(`✈ ${jet.callsign} splash — ${target.config?.name || target.type}  +$${target.reward}`, 'success');
                });
                this.entityManager.addFighterJet(jet);
                this._pendingJetLaunches--;
            }, i * 250);
        }
        this.onLog?.(`\u2708 QAF SQUADRON (${SQUADRON_SIZE} jets) scrambling from Al Udeid — $${cost}`, 'success');
        this.sound?.speak('Fighter jet dispatched. Engaging threats.');
        return { ok: true };
    }

    dispatchHornetSquadron() {
        // Safety: reset stuck hornet state
        if (this._hornetActive && this._pendingHornetLaunches <= 0 && this.entityManager.countHornetDrones() === 0) {
            this._hornetActive = false;
            if (this.hornetCooldown <= 0) this.hornetCooldown = this.hornetRechargeCooldownMax;
        }
        if (!this._hornetUnlocked)     return { ok: false, reason: 'locked' };
        if (this.jetDisabledWaves > 0) return { ok: false, reason: `udeid:${this.jetDisabledWaves}` };
        if (this._hornetActive)        return { ok: false, reason: 'inflight' };
        if (this.hornetCooldown > 0)   return { ok: false, reason: `cooldown:${Math.ceil(this.hornetCooldown)}` };
        const cost = 600;
        if (!this.gameState.spendMoney(cost)) return { ok: false, reason: 'funds' };

        const SWARM_SIZE = 10;
        const baseX = 0.037, baseY = 0.074; // Al Udeid
        this._hornetActive          = true;
        this._pendingHornetLaunches = SWARM_SIZE;

        // 2 wings of 5 — west and east patrol sectors so drones spread across the radar
        const HORNET_WINGS = [
            { patrol: [-0.22,  0.05] }, // W sector
            { patrol: [ 0.22,  0.05] }, // E sector
        ];

        for (let i = 0; i < SWARM_SIZE; i++) {
            const wing = HORNET_WINGS[Math.floor(i / 5)];
            const slot = i % 5;
            const offX = (slot - 2) * 0.028 + (Math.random() - 0.5) * 0.012;
            const offY = (Math.floor(i / 5) - 0.5) * 0.032 + (Math.random() - 0.5) * 0.012;
            setTimeout(() => {
                if (this.gameState.isGameOver()) { this._pendingHornetLaunches--; return; }
                this._hornetIdCounter++;
                const uav = new HornetDrone(this._hornetIdCounter, baseX + offX, baseY + offY, wing.patrol[0], wing.patrol[1]);
                uav.onKill(target => {
                    this.gameState.addMoney(target.reward);
                    this.gameState.addInterception();
                    const hd = Math.sqrt(target.x * target.x + target.y * target.y);
                    this.gameState.addScore(Math.round(target.reward * (1 + hd * 4)));
                    this.onInterception?.(target.reward, target.type);
                    this.entityManager.addExplosion(
                        new Explosion(target.x, target.y, 'intercept', '#ffaa22')
                    );
                    this.sound?.playInterceptionExplosion();
                    this.sound?.playKillSfx();
                    this.onLog?.(`◈ ${uav.callsign} KAMIKAZE — ${target.type} destroyed  +$${target.reward}`, 'success');
                });
                this.entityManager.addHornetDrone(uav);
                this._pendingHornetLaunches--;
            }, i * 250);
        }
        this.onLog?.(`◈ HORNET SWARM (${SWARM_SIZE} UAVs) launched — $${cost} — 90s recharge`, 'success');
        this.sound?.speak('Hornet UAV swarm airborne.');
        return { ok: true };
    }

    dispatchFrigates() {
        // Safety reset
        if (this._frigateActive && this._pendingFrigateLaunches <= 0 && this.entityManager.countFrigates() === 0) {
            this._frigateActive = false;
            if (this.frigateCooldown <= 0) this.frigateCooldown = this.frigateRechargeCooldownMax;
        }
        if (!this._frigateUnlocked)          return { ok: false, reason: 'locked' };
        if (this._frigateDisabledWaves > 0)  return { ok: false, reason: `khor:${this._frigateDisabledWaves}` };
        if (this._frigateActive)             return { ok: false, reason: 'inflight' };
        if (this.frigateCooldown > 0)        return { ok: false, reason: `cooldown:${Math.ceil(this.frigateCooldown)}` };
        const cost = 1200;
        if (!this.gameState.spendMoney(cost)) return { ok: false, reason: 'funds' };

        const FLEET_SIZE = 7;
        this._frigateActive          = true;
        this._pendingFrigateLaunches = FLEET_SIZE;

        // Spread frigates across patrol waypoints
        for (let i = 0; i < FLEET_SIZE; i++) {
            const delay = i * 1200;
            const wpIdx = i;
            setTimeout(() => {
                try {
                    if (this.gameState.isGameOver()) { this._pendingFrigateLaunches--; return; }
                    this._frigateIdCounter++;
                    const frigate = new Frigate(
                        this._frigateIdCounter,
                        this._alKhorBaseX, this._alKhorBaseY,
                        wpIdx
                    );
                    // Frigate acts as a moving battery — launches real Interceptor entities.
                    // Kills are tracked naturally by EntityManager's killEvents pipeline.
                    frigate.onLaunch(({ fromX, fromY, target, isCram, callsign }) => {
                        const icType = isCram ? 'cram' : 'patriot';
                        const ic = new Interceptor(fromX, fromY, target, icType);
                        this.entityManager.addInterceptor(ic);
                        const weapon = isCram ? 'C-RAM' : 'VLS';
                        this.onLog?.(`⚓ ${callsign} ${weapon} → ${target.type}`, 'success');
                    });
                    this.entityManager.addFrigate(frigate);
                    this.onLog?.(`⚓ ${frigate.callsign} departing Al Khor`, 'success');
                } catch (err) {
                    console.error('[Frigate spawn]', err);
                } finally {
                    this._pendingFrigateLaunches--;
                }
            }, delay);
        }
        this.onLog?.(`⚓ FRIGATE SQUADRON (${FLEET_SIZE} ships) deploying — 3 near northern tip — $${cost}`, 'success');
        this.sound?.speak('Naval frigate squadron deploying. Seven ships underway.');
        return { ok: true };
    }

    addInterceptor(interceptor) {
        if (this._overclockActive) interceptor.speed = (interceptor.speed || 0.5) * 2.0;
        this.entityManager.addInterceptor(interceptor);
    }
    addMissile(m)               { this.entityManager.addMissile(m); }

    getMissilesNear(worldX, worldY, threshold = 0.07) {
        return this.entityManager.getMissiles().filter(m => {
            const dx = m.x - worldX, dy = m.y - worldY;
            return Math.sqrt(dx*dx + dy*dy) < threshold;
        });
    }

    getNearestMissile(worldX, worldY) {
        let nearest = null, bestDist = Infinity;
        const candidates = [...this.entityManager.getMissiles(), ...this.entityManager.getRadarGhosts()];
        for (const m of candidates) {
            if (!m.isActive()) continue;
            const dx = m.x - worldX, dy = m.y - worldY;
            const d = Math.sqrt(dx*dx + dy*dy);
            if (d < bestDist) { bestDist = d; nearest = m; }
        }
        return bestDist < 0.12 ? nearest : null;
    }

    getNearestEnemyFighter(worldX, worldY) {
        let nearest = null, bestDist = Infinity;
        for (const f of this.entityManager.getEnemyFighters()) {
            if (!f.isActive()) continue;
            const dx = f.x - worldX, dy = f.y - worldY;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < bestDist) { bestDist = d; nearest = f; }
        }
        return bestDist < 0.15 ? nearest : null;
    }

    getNearestBomber(worldX, worldY) {
        let nearest = null, bestDist = Infinity;
        for (const b of this.entityManager.getBombers()) {
            const dx = b.x - worldX, dy = b.y - worldY;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < bestDist) { bestDist = d; nearest = b; }
        }
        return bestDist < 0.18 ? nearest : null;
    }

    getNearestBattery(preferredType) {
        const batteries = this.radar.getBatteries().filter(b =>
            (this._batteryDisabledWaves[b.id] || 0) <= 0
        );
        return batteries.find(b => b.type === preferredType)
            || batteries.find(b => b.type !== preferredType)
            || this.radar.getBatteries()[0];
    }

    isLaserReady()      { return this.laserCooldown <= 0; }
    triggerLaserCooldown() { this.laserCooldown = this.laserCooldownMax; }
    triggerShake(dur)   { this.shakeDuration = Math.max(this.shakeDuration, dur); }
    togglePause() {
        this.paused = !this.paused;
        if (this.paused) this.sound?.stopAirRaidSiren();
        return this.paused;
    }
    pause()    { if (!this.paused) { this.paused = true;  this.sound?.stopAirRaidSiren(); } }
    resume()   { if (this.paused)  { this.paused = false; } }
    isPaused() { return this.paused; }
    resize(w, h, insets) { this.radar.resize(w ?? this.canvas.width, h ?? this.canvas.height, insets); }
    getGameState()      { return this.gameState; }
    getEntityManager()  { return this.entityManager; }
    getRadar()          { return this.radar; }

    setCallbacks({ onMissileSpawned, onInterception, onImpact, onWave, onGameOver, onLog, onHornetUnlocked, onFrigateUnlocked, onCutscene }) {
        this.onMissileSpawned  = onMissileSpawned;
        this.onInterception    = onInterception;
        this.onImpact          = onImpact;
        this.onWave            = onWave;
        this.onGameOver        = onGameOver;
        this.onLog             = onLog;
        this.onHornetUnlocked  = onHornetUnlocked;
        this.onFrigateUnlocked = onFrigateUnlocked;
        this.onCutscene        = onCutscene;
    }

    isJetDispatchReady() {
        // Safety: clear stuck active flag when no jets remain and no launches are pending
        if (this._squadronActive && this._pendingJetLaunches <= 0 && this.entityManager.countFighterJets() === 0) {
            this._squadronActive = false;
            if (this.jetDispatchCooldown <= 0) this.jetDispatchCooldown = this.jetRechargeCooldownMax;
        }
        return !this._squadronActive && this.jetDispatchCooldown <= 0 && this.jetDisabledWaves <= 0;
    }
    isSquadronActive()     { return this._squadronActive; }
    getJetCooldownRemaining() { return Math.ceil(Math.max(0, this.jetDispatchCooldown)); }
    getJetDisabledWaves()  { return this.jetDisabledWaves; }

    isHornetReady()        { return this._hornetUnlocked && !this._hornetActive && this.hornetCooldown <= 0 && this.jetDisabledWaves <= 0; }
    isHornetActive()       { return this._hornetActive; }
    isHornetUnlocked()     { return this._hornetUnlocked; }
    getHornetCooldown()    { return Math.ceil(this.hornetCooldown); }

    isFrigateReady()       { return this._frigateUnlocked && !this._frigateActive && this.frigateCooldown <= 0 && this._frigateDisabledWaves <= 0; }
    isFrigateActive()      { return this._frigateActive; }
    isFrigateUnlocked()    { return this._frigateUnlocked; }
    getFrigateCooldown()   { return Math.ceil(this.frigateCooldown); }
    getFrigateDisabledWaves() { return this._frigateDisabledWaves; }

    // Allied support
    activateAlliedSupport() {
        const cost = 5000;
        if (this._alliedSupportActive) return { ok: false, reason: 'active' };
        if (this._alliedSupportCooldown > 0) return { ok: false, reason: `cooldown:${Math.ceil(this._alliedSupportCooldown)}` };
        if (!this.gameState.spendMoney(cost)) return { ok: false, reason: 'funds' };
        this._alliedSupportActive   = true;
        this._alliedSupportTimer    = this._alliedSupportDuration;
        this._alliedSupportCooldown = 0;

        // Reset heartbeat state machine → BEGIN a fresh BUILD period
        // (The "cease-fire" window buys the player breathing room)
        this._diffState         = 'DRAIN';
        this._diffStateTimer    = 0;
        this._diffStateDuration = 30; // guaranteed 30s ebb right after allied support
        this._peakProfile       = null;
        this._tgp               = 0;

        this.onLog?.('◈ ALLIED AIR SUPPORT ACTIVE — ADIZ auto-intercept for 4 minutes! Difficulty reset.', 'success');
        this.sound?.playAllySupport();
        this.sound?.speak('Allied air defense support activated. ADIZ covered.');
        return { ok: true };
    }
    isAlliedSupportActive()  { return this._alliedSupportActive; }
    getAlliedSupportTimer()   { return Math.ceil(this._alliedSupportTimer); }
    getAlliedSupportCooldown() { return Math.ceil(this._alliedSupportCooldown ?? 0); }

    // EW Jammer
    dispatchEW() {
        if (this._ewActive)          return { ok: false, reason: 'active' };
        if (this._ewCooldown > 0)    return { ok: false, reason: `cooldown:${Math.ceil(this._ewCooldown)}` };
        const cost = 300;
        if (!this.gameState.spendMoney(cost)) return { ok: false, reason: 'funds' };
        this._ewActive = true;
        this._ewTimer  = this._ewDuration;
        // Apply jam to all current missiles
        for (const m of this.entityManager.getMissiles()) m._jamMult = 0.40;
        this.onLog?.('⚡ EW JAMMER ACTIVE — All missiles at 40% speed for 3 minutes!', 'success');
        this.sound?.speak('Electronic warfare jamming activated.');
        return { ok: true };
    }

    // Nearest civilian aircraft within click range
    getNearestCivilian(worldX, worldY) {
        let nearest = null, bestDist = Infinity;
        for (const c of this.entityManager.getCivilians()) {
            if (!c.isActive()) continue;
            const dx = c.x - worldX, dy = c.y - worldY;
            const d = Math.sqrt(dx*dx + dy*dy);
            if (d < bestDist) { bestDist = d; nearest = c; }
        }
        return bestDist < 0.12 ? nearest : null;
    }

    // Trigger civilian incident when player fires at civilian
    triggerCivilianIncident(aircraft) {
        aircraft.active = false;
        this.gameState.damaged(25);
        this.gameState.spendMoney(Math.min(2000, this.gameState.getMoney()));
        this.triggerShake(0.9);
        this.onImpact?.(25, 'civilian', 'Civilian Airliner');
        this.onLog?.('⚠ CATASTROPHIC: Civilian airliner destroyed! Diplomatic incident! -25HP -$2000', 'error');
        this.sound?.speak('Friendly fire incident. Civilian aircraft destroyed.', true);
    }

    _updateRadarBatteries() {
        const disabledIds = Object.entries(this._batteryDisabledWaves)
            .filter(([, v]) => v > 0)
            .map(([k]) => k);
        this.radar.setDisabledBatteries(disabledIds);
    }

    getExchangeRatio() {
        const spent = this.gameState.getMoneySpent();
        if (spent === 0) return null;
        return this._killEarnings / spent;
    }

    isEWReady()         { return !this._ewActive && this._ewCooldown <= 0; }
    isEWActive()        { return this._ewActive; }
    getEWCooldown()     { return Math.ceil(this._ewCooldown); }
    getEWTimer()        { return this._ewTimer; }
    getBatteryStatus()  { return { ...this._batteryDisabledWaves }; }
    isBatteryAvailable(type) {
        return this.radar.getBatteries()
            .filter(b => b.type === type)
            .some(b => (this._batteryDisabledWaves[b.id] || 0) <= 0);
    }

    // ── Achievement system ─────────────────────────────────────────────────
    _unlock(id) {
        if (this._achievementsEarned.has(id)) return;
        this._achievementsEarned.add(id);
        const LABELS = {
            first_blood:   { title: '🎯 FIRST INTERCEPT',    sub: 'First threat destroyed' },
            sharpshooter:  { title: '⚡ SHARPSHOOTER',       sub: '5-kill streak' },
            iron_dome:     { title: '◈ IRON DOME',           sub: '10-kill streak' },
            perfect_guard: { title: '★ PERFECT DEFENSE',     sub: 'Wave with zero hits' },
            untouchable:   { title: '◉ UNTOUCHABLE',         sub: '3 consecutive perfect waves' },
            survivor:      { title: '◎ SURVIVOR',            sub: 'Reached wave 5' },
            veteran:       { title: '⊛ VETERAN COMMANDER',   sub: 'Reached wave 10' },
            elite:         { title: '⊛ ELITE GUARDIAN',      sub: 'Reached wave 20' },
            big_spender:   { title: '💰 WAR ECONOMY',        sub: '$10,000 invested in defense' },
        };
        const a = LABELS[id];
        if (!a) return;
        this._achieveToasts.push({ title: a.title, sub: a.sub, age: 0, maxAge: 5.5 });
        this.onLog?.(`◈ ACHIEVEMENT UNLOCKED: ${a.title}`, 'success');
    }

    // ── Powerup system ──
    _spawnPowerup() {
        const p = new Powerup(); // uses weighted TYPE_POOL from Powerup.js
        this.entityManager.addPowerup(p);
        this.onLog?.(`◈ Resource drop incoming: ${p.config.label} (${p.config.desc})`, 'info');
    }

    _spawnPowerupAt(wx, wy) {
        const p = new Powerup();
        p.x = wx + (Math.random() - 0.5) * 0.08;
        p.y = wy + (Math.random() - 0.5) * 0.08;
        p.vx = 0; p.vy = 0.008; // slow drift downward
        this.entityManager.addPowerup(p);
        this.onLog?.(`🎁 COMBO JACKPOT — ${p.config.label} dropped!`, 'success');
    }

    collectPowerup(powerup) {
        if (!powerup.isActive()) return;
        powerup.active    = false;
        powerup.collected = true;
        const cfg = powerup.config;
        switch (powerup.type) {
            case 'funds':
                this.gameState.addMoney(cfg.amount);
                this.onLog?.(`💰 Emergency funding! +$${cfg.amount}`, 'success');
                this.sound?.playSuccess();
                break;
            case 'repair':
                this.gameState.heal(cfg.amount);
                // Reset all cooldowns and restore disabled batteries
                this.laserCooldown      = 0;
                this._ewCooldown        = 0;
                this.jetDispatchCooldown = 0;
                this.hornetCooldown     = 0;
                this.jetDisabledWaves   = 0;
                this._batteryDisabledWaves = {};
                this._updateRadarBatteries();
                this.onLog?.(`✚ Repair crew deployed! +${cfg.amount} HP — all systems restored!`, 'success');
                this.sound?.speak('Repair crew on site. All systems restored.');
                this.sound?.playSuccess();
                break;
            case 'shield':
                this._shieldActive = true;
                this._shieldTimer  = cfg.duration;
                // Immediately clear any missiles already inside ADIZ
                this.entityManager.getMissiles().forEach(m => {
                    if (!m.active || !this.radar.isInsideQatar(m.x, m.y)) return;
                    m.active = false;
                    this.gameState.addInterception();
                    this.entityManager.addExplosion(new Explosion(m.x, m.y, 'intercept', '#38bdf8'));
                    this.sound?.playInterceptionExplosion();
                });
                this.onLog?.(`◈ DEFENSE SHIELD ACTIVE — ${cfg.duration}s damage immunity + ADIZ auto-intercept!`, 'success');
                this.sound?.speak('Defense shield activated. ADIZ auto-protect enabled.');
                break;
            case 'intel':
                this.entityManager.clearGhosts();
                this.onLog?.('◎ Intel burst — all radar ghosts cleared!', 'success');
                this.sound?.speak('Radar contacts resolved.');
                break;
            case 'overclock':
                this._overclockActive = true;
                this._overclockTimer  = cfg.duration;
                this.onLog?.(`⚡ OVERCLOCK ACTIVE — interceptors at 2× speed for ${cfg.duration}s!`, 'success');
                this.sound?.speak('Systems overclocked. Maximum intercept velocity.');
                break;
            case 'ammo':
                this.gameState.addMoney(cfg.amount);
                // Reset key cooldowns
                this.laserCooldown       = 0;
                this._ewCooldown         = 0;
                this.jetDispatchCooldown = 0;
                this.onLog?.(`◉ RESUPPLY — +$${cfg.amount} + cooldowns reset!`, 'success');
                this.sound?.speak('Resupply complete. Systems ready.');
                break;
        }
    }

    getNearestPowerup(worldX, worldY) {
        let nearest = null, bestDist = Infinity;
        for (const p of this.entityManager.getPowerups()) {
            if (!p.isActive()) continue;
            const dx = p.x - worldX, dy = p.y - worldY;
            const d  = Math.sqrt(dx * dx + dy * dy);
            if (d < bestDist) { bestDist = d; nearest = p; }
        }
        return bestDist < 0.10 ? nearest : null;
    }

    isShieldActive()      { return this._shieldActive; }
    getShieldTimer()      { return Math.ceil(this._shieldTimer); }
    isOverclockActive()   { return this._overclockActive; }
    isAdrenMode()         { return this._adrenMode; }

    // Nearest friendly unit (jet or hornet drone) within click range
}
