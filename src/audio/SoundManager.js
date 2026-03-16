const MUSIC_FILES = [
    '#الآدعم.mp3',
    'أبشري يا دار  اخو روضة بنا _ كلمات_ محمد الصلابي.mp3',
    'أغنية_ حنا لها - كلمات_ فالح العجلان الهاجري - الحان_ عبدالله المناعي.mp3',
    'حنا بخير وديرة العز في خير - قطر_  تميم المجد 2017.mp3',
    'حنا هلك حنا هلك  نحمي جبالك وسهلك والمعنوية عاليه.mp3',
    'دار السعد - كلمات _ متعب ال سليمان المري -ألحان _ عبدالله المناعي - أداء _ المجموعه.mp3',
    'زلزال -  فهد الحجاجي.mp3',
    'شربة الفنجان غناء _ فهد الحجاجي   كلمات _ خالد البوعينين   الحان _ حسن حامد.mp3',
    'شيلة نحبك ياتميم _ كلمات محمد النمران _ اداء خالد الشليه.mp3',
    'طرق خشوم (لطامة العايل) - فهد الحجاجي.mp3',
    'عـرضة مقـدام.mp3',
    'عيدي يا بلادي [ مبروك 2030 ] - كلمات  خليل الشبرمي - تطوير  غانم شاهين - غناء  المجموعة  ( حصري ).mp3',
    'كلنا لك يا قطر سمعا وطاعه ( أسود تميم )   حصري.mp3',
    'مراسم رفع علم دولة قطر على سفينة الزبارة في ايطاليا.mp3',
    'يارباه __ كلمات خليل الشبرمي __ أداء عبدالعزيز العليوي.mp3',
    'يامطوعين الصعايب __ كلمات _ خليل الشبرمي __ أداء _ عبدالعزيز العليوي.mp3',
];

// Kill SFX files — cycled in order on each interception
const KILL_SFX_FILES = [
    'assets/sounds/AllahUAkbaralt.mp3',
    'assets/sounds/Confirm Kill.mp3',
    'assets/sounds/Haihoom.mp3',
    'assets/sounds/Allah U Akbar.m4a',
];

export class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.voiceEnabled = true;
        this.lastSpeakTime = 0;
        this.speakCooldown = 4.5;
        this.voicesLoaded = false;
        this._speechQueue = [];
        this._speaking = false;

        // Music
        this.musicEnabled  = true;
        this._musicAudio   = null;
        this._playlist     = [];
        this._trackIdx     = 0;
        this._musicVolume  = 0.20;
        this._musicStarted = false;

        // Kill SFX — cycling through KILL_SFX_FILES
        this._killSfxIdx     = 0;
        this._killSfxBuffers = {}; // url → AudioBuffer (preloaded)

        // Air raid siren
        this._sirenAudio   = null;
        this._sirenPlaying = false;
        this._sirenTimeout = null; // pending 1s delay timer

        // Volume levels (0–1)
        this._sfxVolume    = 1.0;
        this._masterSfxGain = null; // Web Audio master gain (set in init)

        // Wave-start SFX
        this._waveStartAudio = null;

        // C-RAM burst sound state
        this._cramOpened      = false;   // whether the opener has played yet
        this._cramLoopAudio   = null;
        this._cramLoopTimeout = null;

        this.init();
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this._masterSfxGain = this.ctx.createGain();
            this._masterSfxGain.gain.value = this._sfxVolume;
            this._masterSfxGain.connect(this.ctx.destination);
        } catch (e) {
            console.warn('Web Audio API not supported');
        }

        if (window.speechSynthesis) {
            window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => { this.voicesLoaded = true; };
        }

        this._preloadKillSfx();
    }

    setSfxVolume(vol) {
        this._sfxVolume = Math.max(0, Math.min(1, vol));
        if (this._masterSfxGain) this._masterSfxGain.gain.value = this._sfxVolume;
        if (this._sirenAudio) this._sirenAudio.volume = 0.92 * this._sfxVolume;
    }

    setMusicVolume(vol) {
        this._musicVolume = Math.max(0, Math.min(1, vol));
        if (this._musicAudio) this._musicAudio.volume = this._musicVolume;
    }

    // ── Music ───────────────────────────────────────────────────────────────

    _shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    startMusic() {
        if (this._musicStarted) return;
        this._musicStarted = true;
        this._playlist = this._shuffle(MUSIC_FILES);
        this._trackIdx = 0;
        if (this.musicEnabled) this._playTrack();
    }

    _playTrack() {
        if (this._musicAudio) {
            this._musicAudio.pause();
            this._musicAudio.onended = null;
        }
        const file = this._playlist[this._trackIdx];
        this._musicAudio = new Audio('assets/sounds/Music/' + encodeURIComponent(file));
        this._musicAudio.volume = this._musicVolume;
        this._musicAudio.onended = () => {
            this._trackIdx = (this._trackIdx + 1) % this._playlist.length;
            if (this._trackIdx === 0) this._playlist = this._shuffle(MUSIC_FILES);
            if (this.musicEnabled) this._playTrack();
            this.onTrackChange?.();
        };
        this._musicAudio.play().catch(() => {});
    }

    pauseMusic()  { if (this._musicAudio) this._musicAudio.pause(); }
    resumeMusic() {
        if (!this.musicEnabled) return;
        if (!this._musicStarted) { this.startMusic(); return; }
        if (this._musicAudio) this._musicAudio.play().catch(() => {});
    }
    stopMusic()   { if (this._musicAudio) { this._musicAudio.pause(); this._musicAudio.currentTime = 0; } }
    nextTrack()   { this._trackIdx = (this._trackIdx + 1) % this._playlist.length; this._playTrack(); this.onTrackChange?.(); }
    prevTrack()   { this._trackIdx = (this._trackIdx - 1 + this._playlist.length) % this._playlist.length; this._playTrack(); this.onTrackChange?.(); }
    isMusicPlaying() { return this._musicAudio && !this._musicAudio.paused; }
    currentTrackName() {
        const f = this._playlist[this._trackIdx] ?? '';
        return f.replace(/\.mp3$/i, '').replace(/\.m4a$/i, '');
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            if (!this._musicStarted) { this.startMusic(); }
            else this._playTrack();
        } else {
            if (this._musicAudio) this._musicAudio.pause();
        }
        return this.musicEnabled;
    }

    // ── Kill SFX (cycled) ────────────────────────────────────────────────────

    async _preloadKillSfx() {
        if (!this.ctx) return;
        for (const url of KILL_SFX_FILES) {
            try {
                const resp = await fetch(url);
                const buf  = await resp.arrayBuffer();
                this._killSfxBuffers[url] = await this.ctx.decodeAudioData(buf);
            } catch (_) { /* will fall back to HTML Audio */ }
        }
    }

    playKillSfx() {
        if (!this.enabled) return;
        const url = KILL_SFX_FILES[this._killSfxIdx];
        this._killSfxIdx = (this._killSfxIdx + 1) % KILL_SFX_FILES.length;

        const buf = this._killSfxBuffers[url];
        if (buf && this.ctx) {
            const src  = this.ctx.createBufferSource();
            const gain = this.ctx.createGain();
            src.buffer     = buf;
            gain.gain.value = 0.85;
            src.connect(gain);
            gain.connect(this._masterSfxGain || this.ctx.destination);
            src.start(this.ctx.currentTime);
        } else {
            // HTML Audio fallback (also works for m4a)
            const a = new Audio(url);
            a.volume = 0.85;
            a.play().catch(() => {});
        }
    }

    // ── Interception explosion (plays first on every intercept) ──────────────

    playInterceptionExplosion() {
        if (!this.enabled) return;
        const a = new Audio('assets/sounds/InterceptionExplosion.mp3');
        a.volume = 0.90;
        a.play().catch(() => {});
    }

    // ── Enemy impact explosion ────────────────────────────────────────────────

    playEnemyExplosion() {
        if (!this.enabled) return;
        const a = new Audio('assets/sounds/Explosion.mp3');
        a.volume = 0.95;
        a.play().catch(() => {});
    }

    // ── Missile launch sfx ────────────────────────────────────────────────────

    playMissileLaunch() {
        if (!this.enabled) return;
        const a = new Audio('assets/sounds/Sound Effect - Missile Launch.mp3');
        a.volume = 0.80;
        a.play().catch(() => {});
    }

    // ── Air Raid Siren ───────────────────────────────────────────────────────

    playAirRaidSiren() {
        if (!this.enabled) return;
        if (this._sirenPlaying) return; // already looping — don't restart

        // Tear down any previous stale element before creating a new one
        if (this._sirenAudio) {
            this._sirenAudio.onended = null;
            this._sirenAudio.onerror = null;
            this._sirenAudio.pause();
            this._sirenAudio = null;
        }

        const audio = new Audio('assets/sounds/AirRaidSiren.mp3');
        audio.loop   = true;                          // loop continuously while threats remain
        audio.volume = 0.92 * this._sfxVolume;

        audio.onerror = () => { this._sirenPlaying = false; this._sirenAudio = null; };

        audio.play().then(() => {
            // Play succeeded — mark as active only after browser confirms
            this._sirenPlaying = true;
            this._sirenAudio   = audio;
        }).catch(() => {
            // Autoplay blocked or file missing — reset so the next ENTRY can retry
            this._sirenPlaying = false;
            this._sirenAudio   = null;
        });
    }

    stopAirRaidSiren() {
        if (this._sirenAudio) {
            this._sirenAudio.loop    = false;
            this._sirenAudio.onended = null;
            this._sirenAudio.onerror = null;
            this._sirenAudio.pause();
            this._sirenAudio = null;
        }
        this._sirenPlaying = false;
    }

    isSirenPlaying() { return this._sirenPlaying; }

    // ── C-RAM Phalanx burst sound ─────────────────────────────────────────────
    // First click: plays C-RAMOpening.mp3 (gun spin-up).
    // All subsequent clicks: loops C-RAM.mp3 for the burst duration.

    /**
     * Play the appropriate C-RAM sound, sped up to fill exactly `burstDurationMs`.
     * First burst → C-RAMOpening.mp3 (spin-up, fills the burst window).
     * All subsequent bursts → C-RAM.mp3 (looped/sped-up to fill the burst window).
     * Neither file is cut mid-play; playbackRate is set so the last iteration ends naturally.
     */
    playCramBurst(burstDurationMs = 1100) {
        if (!this.enabled) return;

        if (!this._cramOpened) {
            this._cramOpened = true;
            this._playCramFile('assets/sounds/C-RAMOpening.mp3', burstDurationMs, false);
        } else {
            this._playCramFile('assets/sounds/C-RAM.mp3', burstDurationMs, true);
        }
    }

    /**
     * Load `url`, then set playbackRate so the audio fills `durationMs` exactly
     * (or an integer multiple of it if the file is shorter than the burst).
     * `canLoop` — allow looping if the file is shorter than the burst.
     */
    _playCramFile(url, durationMs, canLoop) {
        this._stopCramLoop();
        const audio = new Audio(url);
        audio.volume = 0.92 * this._sfxVolume;

        audio.onloadedmetadata = () => {
            const burstSec = durationMs / 1000;
            const fileDur  = audio.duration;
            if (!fileDur || fileDur <= 0) { audio.play().catch(() => {}); return; }

            if (fileDur >= burstSec) {
                // File longer than burst — speed it up to finish exactly at burst end
                audio.playbackRate = Math.min(4.0, fileDur / burstSec);
                audio.loop = false;
                audio.play().catch(() => {});
                // No timeout: playback ends naturally at exactly burstSec wall-clock
            } else if (canLoop) {
                // File shorter — loop, sped up so an integer number of reps ends at burst end
                const reps = Math.ceil(burstSec / fileDur);
                audio.playbackRate = Math.min(4.0, (reps * fileDur) / burstSec);
                audio.loop = true;
                audio.play().catch(() => {});
                // Stop after last natural iteration (echo tail plays, no abrupt cut)
                const stopMs = (reps * fileDur / audio.playbackRate) * 1000;
                this._cramLoopTimeout = setTimeout(() => this._stopCramLoop(), stopMs);
            } else {
                // Opener shorter than burst — just play once at normal speed
                audio.play().catch(() => {});
            }
        };

        this._cramLoopAudio = audio;
    }

    _stopCramLoop() {
        if (this._cramLoopTimeout) { clearTimeout(this._cramLoopTimeout); this._cramLoopTimeout = null; }
        if (this._cramLoopAudio)   { this._cramLoopAudio.pause(); this._cramLoopAudio = null; }
    }

    // ── Wave-start SFX ───────────────────────────────────────────────────────

    playWaveStartSfx() {
        if (!this.enabled) return;
        const a = new Audio('assets/sounds/MissileAlert.mp3');
        a.volume = 0.90;
        a.play().catch(() => {});
    }

    // ── Core synth ───────────────────────────────────────────────────────────

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        this.startMusic();
    }

    _tone(freq, type, duration, volume = 0.3, delay = 0, freqEnd = null) {
        if (!this.ctx || !this.enabled) return;
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this._masterSfxGain || this.ctx.destination);
        osc.type = type;
        const t = this.ctx.currentTime + delay;
        osc.frequency.setValueAtTime(freq, t);
        if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.start(t);
        osc.stop(t + duration + 0.05);
    }

    _noise(duration, filterFreq = 300, volume = 0.5, delay = 0) {
        if (!this.ctx || !this.enabled) return;
        const samples = Math.floor(this.ctx.sampleRate * (duration + 0.1));
        const buf  = this.ctx.createBuffer(1, samples, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;

        const src  = this.ctx.createBufferSource();
        const filt = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        src.buffer = buf;
        filt.type  = 'lowpass';
        filt.frequency.value = filterFreq;
        const t = this.ctx.currentTime + delay;
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        src.connect(filt); filt.connect(gain); gain.connect(this._masterSfxGain || this.ctx.destination);
        src.start(t);
    }

    playRadarPing()      { this._tone(1200, 'sine', 0.06, 0.06); }
    playMissileAlert()   { this._tone(440, 'sine', 0.18, 0.45, 0, 900); this._tone(440, 'sine', 0.18, 0.45, 0.22, 900); }
    playLaunch()         { this._noise(0.18, 3000, 0.55); this._tone(280, 'sawtooth', 0.15, 0.22, 0, 180); }
    playExplosion()      { this._noise(0.55, 250, 0.85); this._tone(55, 'sine', 0.45, 0.7); this._tone(90, 'sine', 0.3, 0.4, 0.08); }
    playImpact()         { this._noise(0.9, 180, 1.0); this._tone(40, 'sine', 0.7, 0.9); this._tone(900, 'sawtooth', 0.12, 0.45, 0.05); this._tone(700, 'sawtooth', 0.12, 0.35, 0.25); this._tone(500, 'sawtooth', 0.12, 0.35, 0.45); }
    playSuccess()        { this._tone(523, 'sine', 0.1, 0.28); this._tone(659, 'sine', 0.1, 0.28, 0.13); this._tone(784, 'sine', 0.22, 0.35, 0.26); }
    playAllySupport()    { this._tone(440, 'square', 0.06, 0.22); this._tone(554, 'square', 0.06, 0.22, 0.09); this._tone(659, 'square', 0.06, 0.22, 0.18); this._tone(880, 'square', 0.18, 0.35, 0.27); }
    playNewWave()        { this._tone(330, 'square', 0.09, 0.22); this._tone(440, 'square', 0.09, 0.22, 0.12); this._tone(550, 'square', 0.09, 0.22, 0.24); }
    playGameOver()       { this._tone(440, 'sawtooth', 0.35, 0.55); this._tone(370, 'sawtooth', 0.35, 0.5, 0.4); this._tone(310, 'sawtooth', 0.5, 0.65, 0.8); this._tone(220, 'sawtooth', 0.9, 0.75, 1.35); this._noise(0.7, 120, 0.5, 1.35); }
    playLaserFire()      { this._tone(2000, 'sine', 0.4, 0.4, 0, 800); this._tone(3000, 'square', 0.08, 0.2, 0); this._tone(1500, 'sine', 0.4, 0.25, 0, 500); }
    playHypersonicAlert(){ for (let i = 0; i < 4; i++) this._tone(880, 'square', 0.06, 0.5, i * 0.1); }
    playSiren()          { this._tone(800, 'sawtooth', 0.3, 0.6, 0); this._tone(600, 'sawtooth', 0.3, 0.6, 0.35); this._tone(800, 'sawtooth', 0.3, 0.6, 0.7); this._tone(600, 'sawtooth', 0.3, 0.6, 1.05); }

    // English-only voice with cooldown
    speak(text, priority = false) {
        if (!this.voiceEnabled || !window.speechSynthesis) return;
        const now = Date.now() / 1000;
        if (!priority && now - this.lastSpeakTime < this.speakCooldown) return;
        this.lastSpeakTime = now;

        if (priority) {
            window.speechSynthesis.cancel();
            this._speechQueue = [];
            this._speaking    = false;
            this._speechQueue.unshift(text);
        } else {
            if (this._speechQueue.length >= 4) return;
            this._speechQueue.push(text);
        }
        if (!this._speaking) this._drainQueue();
    }

    speakEnOnly(text) {
        if (!this.voiceEnabled || !window.speechSynthesis) return;
        if (this._speechQueue.length >= 4) return;
        this._speechQueue.push(text);
        if (!this._speaking) this._drainQueue();
    }

    _drainQueue() {
        if (this._speechQueue.length === 0) { this._speaking = false; return; }
        this._speaking = true;
        const text   = this._speechQueue.shift();
        const voices = window.speechSynthesis.getVoices();
        const utt    = new SpeechSynthesisUtterance(text);
        utt.rate   = 0.88;
        utt.pitch  = 0.72;
        utt.volume = 1.0;
        const voice =
            voices.find(v => v.lang === 'en-US' && /male|david|mark|richard/i.test(v.name)) ||
            voices.find(v => v.lang === 'en-GB' && /male|daniel/i.test(v.name)) ||
            voices.find(v => v.lang.startsWith('en-US')) ||
            voices.find(v => v.lang.startsWith('en')) ||
            voices[0];
        if (voice) utt.voice = voice;
        utt.onend   = () => this._drainQueue();
        utt.onerror = () => this._drainQueue();
        window.speechSynthesis.speak(utt);
    }

    isMusicEnabled() { return this.musicEnabled; }
    toggleSound()    { this.enabled = !this.enabled; return this.enabled; }
    toggleVoice()    {
        this.voiceEnabled = !this.voiceEnabled;
        if (!this.voiceEnabled && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            this._speechQueue = [];
            this._speaking    = false;
        }
        return this.voiceEnabled;
    }
}
