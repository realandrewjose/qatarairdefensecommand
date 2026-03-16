import { Interceptor, INTERCEPTOR_TYPES } from '../entities/Interceptor.js';

export class InputHandler {
    constructor(canvas, game, soundManager) {
        this.canvas = canvas;
        this.game   = game;
        this.sound  = soundManager;
        this.selectedType    = 'patriot';
        this.onLog           = null;
        this._hoveredMissile = null;

        this._setupListeners();
    }

    _setupListeners() {
        // Canvas events
        this.canvas.addEventListener('click',     e => this._handleClick(e));
        this.canvas.addEventListener('mousemove', e => this._handleHover(e));
        this.canvas.addEventListener('mouseleave', () => {
            this._hoveredMissile = null;
            this.canvas.style.cursor = 'crosshair';
        });
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());

        // HUD buttons
        const on = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);
        on('pauseBtn',         () => this._pause());
        on('resumeBtn',        () => this._resume());
        on('restartBtn',       () => { location.href = location.href; });
        on('quitBtn',          () => { location.href = location.href; });
        on('settingsBtn',      () => this._toggleSettings());
        on('closeSettingsBtn', () => this._toggleSettings());
        on('zoomInBtn',        () => this._zoomIn());
        on('zoomOutBtn',       () => this._zoomOut());
        on('zoomResetBtn',     () => this._zoomReset());
        on('allyRequestBtn',   () => this._allyRequest());
        on('soundBtn',         () => this._toggleSound());
        on('soundBtn2',        () => this._toggleSound());
        on('voiceBtn',         () => this._toggleVoice());
        on('voiceBtn2',        () => this._toggleVoice());
        on('musicBtn',         () => this._toggleMusic());
        on('jetBtn',           () => this._dispatchJet());
        on('hornetBtn',        () => this._dispatchHornets());
        on('frigateBtn',       () => this._dispatchFrigates());
        on('ewBtn',            () => this._dispatchEW());

        document.addEventListener('keydown', e => this._keydown(e));
        this._initMusicPlayer();

        // Volume sliders
        const sfxSlider = document.getElementById('sfxVolumeSlider');
        if (sfxSlider) sfxSlider.addEventListener('input', e => {
            const vol = e.target.value / 100;
            this.sound?.setSfxVolume(vol);
            const lbl = document.getElementById('sfxVolumeLabel');
            if (lbl) lbl.textContent = e.target.value + '%';
        });
        const musicSlider = document.getElementById('musicVolumeSlider');
        if (musicSlider) musicSlider.addEventListener('input', e => {
            const vol = e.target.value / 100;
            this.sound?.setMusicVolume(vol);
            const lbl = document.getElementById('musicVolumeLabel');
            if (lbl) lbl.textContent = e.target.value + '%';
        });

        // Arsenal list (delegated)
        document.getElementById('arsenalList')?.addEventListener('click', e => {
            const item = e.target.closest('.arsenal-item');
            if (!item?.dataset?.type) return;
            if (item.classList.contains('locked')) {
                const w = item.dataset.unlocksAt;
                this.log(`${item.dataset.type.toUpperCase()} unlocks at Wave ${w}.`, 'warning');
                return;
            }
            this.selectType(item.dataset.type);
            e.stopPropagation();
        });
    }

    // Track missile under cursor + update cursor style
    _handleHover(e) {
        const { wx, wy } = this._worldCoords(e);
        if (!this.game.radar.isInBounds(wx, wy)) {
            this._hoveredMissile = null;
            this.canvas.style.cursor = 'default';
            return;
        }
        this._hoveredMissile = this.game.getNearestMissile(wx, wy);
        const nearPowerup = this.game.getNearestPowerup?.(wx, wy);
        this.canvas.style.cursor = nearPowerup ? 'pointer' : 'crosshair';
    }

    // Fire at hovered (or nearest) missile on click
    _handleClick(e) {
        // Only fire when clicking the canvas itself, not overlapping HUD elements
        if (e.target !== this.canvas) return;

        this.sound?.resume();

        const { wx, wy } = this._worldCoords(e);
        if (!this.game.radar.isInBounds(wx, wy)) return;

        // Powerup pickup — highest priority; never misfire as an intercept
        const nearestPowerup = this.game.getNearestPowerup?.(wx, wy);
        if (nearestPowerup) {
            this.game.collectPowerup(nearestPowerup);
            document.getElementById('moneyDisplay').textContent = '$' + this.game.getGameState().getMoney();
            return;
        }

        // Bombers can be clicked directly (larger target, checked first)
        const nearestBomber = this.game.getNearestBomber(wx, wy);
        if (nearestBomber) {
            this._launchInterceptor(nearestBomber);
            return;
        }

        // Enemy fighters can be clicked (check before missiles)
        const nearestFighter = this.game.getNearestEnemyFighter(wx, wy);
        if (nearestFighter) {
            this._launchInterceptor(nearestFighter);
            return;
        }

        const target = (this._hoveredMissile?.isActive())
            ? this._hoveredMissile
            : this.game.getNearestMissile(wx, wy);

        if (target) {
            this._launchInterceptor(target);
            return;
        }

        // No missile in range — check if accidentally clicking a civilian
        const nearestCivilian = this.game.getNearestCivilian(wx, wy);
        if (nearestCivilian) {
            nearestCivilian.onIntercepted = () => this.game.triggerCivilianIncident(nearestCivilian);
            this._launchInterceptor(nearestCivilian);
            return;
        }

        this.log('No threat in range. Click on a missile or bomber.', 'warning');
    }

    // Convert mouse event → world coordinates (handles CSS-scaled canvas)
    _worldCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = (e.clientX - rect.left) * (this.canvas.width  / rect.width);
        const sy = (e.clientY - rect.top)  * (this.canvas.height / rect.height);
        const { x: wx, y: wy } = this.game.radar.screenToWorld(sx, sy);
        return { wx, wy };
    }

    _launchInterceptor(targetMissile) {
        const cfg = INTERCEPTOR_TYPES[this.selectedType];
        if (!cfg) return;

        if (this.selectedType === 'laser' && !this.game.isLaserReady()) {
            this.log('Iron Beam recharging — not ready.', 'warning');
            return;
        }

        // C-RAM: target must be within ADIZ (point defence — short range only)
        if (this.selectedType === 'cram') {
            if (!this.game.radar.isInsideQatar(targetMissile.x, targetMissile.y)) {
                this.log('C-RAM range limited to ADIZ — target out of range.', 'warning');
                return;
            }
            return this._fireCramBurst(targetMissile, cfg);
        }

        // Check if selected battery is disabled
        if (!this.game.isBatteryAvailable(this.selectedType)) {
            this.log(`${cfg.name} battery OFFLINE — ${this.selectedType.toUpperCase()} unavailable!`, 'error');
            return;
        }

        const gameState = this.game.getGameState();
        if (!gameState.spendMoney(cfg.cost)) {
            this.log(`Insufficient funds — need $${cfg.cost}.`, 'warning');
            this.sound?.playMissileAlert();
            return;
        }

        const battery     = this.game.getNearestBattery(this.selectedType);
        const interceptor = new Interceptor(battery.x, battery.y, targetMissile, this.selectedType);
        this.game.addInterceptor(interceptor);
        if (targetMissile.isGhost) {
            this.log('⚡ EW ghost contact — interceptor wasted!', 'warning');
        } else if (targetMissile.isCivilian) {
            this.log(`⚠ WARNING: Interceptor fired at civilian aircraft ${targetMissile.callsign}!`, 'error');
        }

        const tgtName = targetMissile.isCivilian
            ? targetMissile.callsign
            : (targetMissile.config?.name || targetMissile.config?.shortName || targetMissile.type);

        if (this.selectedType === 'laser') {
            this.game.triggerLaserCooldown();
            this.sound?.playLaserFire();
            this.log(`Iron Beam fired at ${tgtName} — $${cfg.cost}`, 'success');
        } else {
            this.sound?.playMissileLaunch();
            this.sound?.playLaunch();
            this.log(`${cfg.name} → ${tgtName} — $${cfg.cost}`, targetMissile.isCivilian ? 'error' : 'success');
        }
        document.getElementById('moneyDisplay').textContent = '$' + gameState.getMoney();
    }

    /** Fire all 3 C-RAM Phalanx batteries in machine-gun bursts — 18 rds/battery, $20/burst.
     *  Hardened targets (ballistic, mirv, hypersonic) automatically get 4 sequential bursts. */
    _fireCramBurst(targetMissile, cfg) {
        const gameState     = this.game.getGameState();
        const cramBatteries = this.game.radar.getBatteries().filter(b => b.type === 'cram');
        if (cramBatteries.length === 0) {
            this.log('No C-RAM batteries available.', 'warning');
            return;
        }

        const FLAT_COST   = 20;   // $20 per burst
        const ROUNDS_PER  = 18;   // rounds per battery per burst
        const ROUND_DELAY = 55;   // ms between rounds
        const BURST_MS    = ROUNDS_PER * ROUND_DELAY + 150; // one burst window (~1140ms)

        // Ballistic/MIRV/hypersonic: low kill-prob per shell → auto-queue 4 bursts
        const tgtType   = targetMissile.type ?? '';
        const isHard    = ['ballistic', 'mirv', 'hypersonic'].includes(tgtType);
        const numBursts = isHard ? 4 : 1;
        const totalCost = FLAT_COST * numBursts;

        if (!gameState.spendMoney(totalCost)) {
            this.log(`Insufficient funds — C-RAM needs $${totalCost}.`, 'warning');
            return;
        }

        for (let b = 0; b < numBursts; b++) {
            const burstOffset = b * BURST_MS;

            // Schedule each round from each battery
            cramBatteries.forEach((battery, bi) => {
                for (let r = 0; r < ROUNDS_PER; r++) {
                    setTimeout(() => {
                        if (!targetMissile.isActive?.() && !targetMissile.active) return;
                        const ic = new Interceptor(battery.x, battery.y, targetMissile, 'cram');
                        this.game.addInterceptor(ic);
                    }, burstOffset + bi * 15 + r * ROUND_DELAY);
                }
            });

            // Trigger audio for each burst window
            setTimeout(() => {
                if (!targetMissile.isActive?.() && !targetMissile.active) return;
                this.sound?.playCramBurst(BURST_MS);
            }, burstOffset);
        }

        const tgtName   = targetMissile.config?.shortName || tgtType || 'target';
        const burstDesc = numBursts > 1 ? `${numBursts}× burst` : 'burst';
        this.log(`C-RAM ${burstDesc} (${cramBatteries.length}× Phalanx ×${ROUNDS_PER} rds) → ${tgtName} — $${totalCost}`, 'success');
        document.getElementById('moneyDisplay').textContent = '$' + gameState.getMoney();
    }

    selectType(type) {
        if (!INTERCEPTOR_TYPES[type]) return;
        this.selectedType = type;
        document.querySelectorAll('.arsenal-item').forEach(el => {
            el.classList.toggle('selected', el.dataset.type === type);
            // Close any open tooltip when switching weapons
            el.querySelector('.arsenal-tooltip')?.classList.remove('visible');
        });
        const cfg = INTERCEPTOR_TYPES[type];
        this.log(`Selected: ${cfg.name} — $${cfg.cost}/shot`, 'info');
    }

    _pause() {
        const isPaused = this.game.togglePause();
        document.getElementById('pauseScreen')?.classList.toggle('hidden', !isPaused);
        if (isPaused) this.sound?.pauseMusic?.();
        else          this.sound?.resumeMusic?.();
    }

    _resume() {
        if (!this.game.paused) return;
        this.game.togglePause();
        document.getElementById('pauseScreen')?.classList.add('hidden');
        this.sound?.resume();
    }

    _allyRequest() {
        const result = this.game.activateAlliedSupport?.();
        if (!result) return;
        if (result.ok) {
            this.log('◈ ALLIED AIR SUPPORT ACTIVE — ADIZ auto-intercept for 4 minutes! Difficulty reset. ($5000)', 'success');
        } else if (result.reason === 'active') {
            const t = this.game.getAlliedSupportTimer?.() ?? '?';
            this.log(`Allied support already active — ${t}s remaining.`, 'warning');
        } else if (result.reason?.startsWith('cooldown:')) {
            const cd = result.reason.split(':')[1];
            this.log(`Allied support recharging — ${cd}s remaining (5-min cooldown).`, 'warning');
        } else {
            this.log('Allied support costs $5000. Insufficient funds.', 'warning');
        }
    }

    _toggleSettings() {
        document.getElementById('settingsPanel')?.classList.toggle('hidden');
    }

    _toggleSound() {
        if (!this.sound) return;
        const on = this.sound.toggleSound();
        const txt = on ? 'SFX: ON' : 'SFX: OFF';
        ['soundBtn', 'soundBtn2'].forEach(id => { const b = document.getElementById(id); if (b) b.textContent = txt; });
    }

    _toggleVoice() {
        if (!this.sound) return;
        const on = this.sound.toggleVoice();
        const txt = on ? 'VOICE: ON' : 'VOICE: OFF';
        ['voiceBtn', 'voiceBtn2'].forEach(id => { const b = document.getElementById(id); if (b) b.textContent = txt; });
    }

    _toggleMusic() {
        // Toggle the music player popup; wire controls on first open
        const player = document.getElementById('musicPlayer');
        if (!player) return;
        const isHidden = player.classList.toggle('hidden');
        if (!isHidden) this._updateMusicPlayer();
    }

    _updateMusicPlayer() {
        if (!this.sound) return;
        const name = document.getElementById('musicTrackName');
        const ppBtn = document.getElementById('musicPlayPauseBtn');
        if (name)  name.textContent  = this.sound.currentTrackName?.() ?? '—';
        if (ppBtn) ppBtn.textContent = this.sound.isMusicPlaying?.() ? '⏸' : '▶';
    }

    _initMusicPlayer() {
        if (this._musicPlayerWired) return;
        this._musicPlayerWired = true;
        const on = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);
        on('musicPlayPauseBtn', () => {
            if (!this.sound) return;
            if (this.sound.isMusicPlaying?.()) this.sound.pauseMusic();
            else this.sound.resumeMusic();
            this._updateMusicPlayer();
        });
        on('musicNextBtn', () => { this.sound?.nextTrack?.(); this._updateMusicPlayer(); });
        on('musicPrevBtn', () => { this.sound?.prevTrack?.(); this._updateMusicPlayer(); });
        on('musicStopBtn', () => {
            this.sound?.stopMusic?.();
            document.getElementById('musicPlayer')?.classList.add('hidden');
        });
        if (this.sound) this.sound.onTrackChange = () => this._updateMusicPlayer();
    }

    _zoomIn() {
        this.game.radar.zoomIn();
        this.log(`Radar zoom: ${this.game.radar.getZoomLevel().toFixed(1)}x`, 'info');
    }

    _zoomOut() {
        this.game.radar.zoomOut();
        this.log(`Radar zoom: ${this.game.radar.getZoomLevel().toFixed(1)}x`, 'info');
    }

    _zoomReset() {
        this.game.radar.resetZoom();
        this.log('Radar zoom reset to 1.0x', 'info');
    }

    _keydown(e) {
        switch (e.key) {
            case ' ':  e.preventDefault(); this._pause(); break;
            case 'Escape':
                if (!document.getElementById('pauseScreen')?.classList.contains('hidden')) this._resume();
                break;
            case '1': this.selectType('patriot'); break;
            case '2': this.selectType('arrow');   break;
            case '3': this.selectType('shorad');  break;
            case '4': this.selectType('laser');   break;
            case '5': this.selectType('cram');    break;
            case '6': this._dispatchJet();        break;
            case '7': this._dispatchFrigates();   break;
            case '8': this._dispatchHornets();    break;
            case '9': this._dispatchEW();         break;
            case '+':
            case '=': this._zoomIn(); break;
            case '-':
            case '_': this._zoomOut(); break;
            case '0': this._zoomReset(); break;
        }
    }

    _dispatchJet() {
        const result = this.game.dispatchFighterJet();
        if (result.ok) {
            document.getElementById('moneyDisplay').textContent = '$' + this.game.getGameState().getMoney();
        } else if (result.reason?.startsWith('udeid:')) {
            const waves = result.reason.split(':')[1];
            this.log(`\u2708 Al Udeid offline \u2014 jets unavailable for ${waves} more wave(s).`, 'warning');
        } else if (result.reason === 'inflight') {
            this.log('\u2708 Squadron still airborne — wait for RTB.', 'warning');
        } else if (result.reason?.startsWith('cooldown:')) {
            const secs = result.reason.split(':')[1];
            this.log(`\u2708 Jet recharging \u2014 ${secs}s remaining.`, 'warning');
        } else {
            this.log('Cannot dispatch jet \u2014 insufficient funds ($1500).', 'warning');
        }
    }

    _dispatchHornets() {
        const result = this.game.dispatchHornetSquadron();
        if (!result) return;
        if (result.ok) {
            document.getElementById('moneyDisplay').textContent = '$' + this.game.getGameState().getMoney();
        } else if (result.reason === 'locked') {
            this.log('\u25c8 Hornet UAVs unlock at Wave 8.', 'warning');
        } else if (result.reason?.startsWith('udeid:')) {
            const waves = result.reason.split(':')[1];
            this.log(`\u25c8 Al Udeid offline \u2014 hornets unavailable for ${waves} wave(s).`, 'warning');
        } else if (result.reason === 'inflight') {
            this.log('\u25c8 Hornet swarm still airborne — wait for RTB.', 'warning');
        } else if (result.reason?.startsWith('cooldown:')) {
            const secs = result.reason.split(':')[1];
            this.log(`\u25c8 Hornets recharging \u2014 ${secs}s remaining.`, 'warning');
        } else {
            this.log('Cannot launch hornets \u2014 insufficient funds ($600).', 'warning');
        }
    }

    _dispatchFrigates() {
        const result = this.game.dispatchFrigates?.();
        if (!result) return;
        if (result.ok) {
            document.getElementById('moneyDisplay').textContent = '$' + this.game.getGameState().getMoney();
        } else if (result.reason === 'locked') {
            this.log('⚓ Frigate squadron unlocks at Wave 11.', 'warning');
        } else if (result.reason?.startsWith('khor:')) {
            const waves = result.reason.split(':')[1];
            this.log(`⚓ Al Khor Naval Base offline — frigates unavailable for ${waves} more wave(s).`, 'warning');
        } else if (result.reason === 'inflight') {
            this.log('⚓ Frigate squadron deployed — wait for RTB.', 'warning');
        } else if (result.reason?.startsWith('cooldown:')) {
            const secs = result.reason.split(':')[1];
            this.log(`⚓ Frigates recharging — ${secs}s remaining.`, 'warning');
        } else {
            this.log('Cannot deploy frigates — insufficient funds ($1200).', 'warning');
        }
    }

    _dispatchEW() {
        const result = this.game.dispatchEW();
        if (result.ok) {
            document.getElementById('moneyDisplay').textContent = '$' + this.game.getGameState().getMoney();
        } else if (result.reason === 'active') {
            this.log('⚡ EW jammer already active!', 'warning');
        } else if (result.reason?.startsWith('cooldown:')) {
            const secs = result.reason.split(':')[1];
            this.log(`⚡ EW jammer recharging — ${secs}s remaining.`, 'warning');
        } else {
            this.log('Cannot activate EW — insufficient funds ($300).', 'warning');
        }
    }

    log(msg, type = 'info') { this.onLog?.(msg, type); }
}
