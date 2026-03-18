import { INTERCEPTOR_TYPES } from '../entities/Interceptor.js';
import { MISSILE_TYPES } from '../entities/Missile.js';

// ── PSA cutscene playlist ───────────────────────────────────────────────────
const PSA_VIDEOS = [
    'AlertLoud.mp4',
    'Drones.mp4',
    'ExplosionsWhenDriving.mp4',
    'Fake News.mp4',
    'IfYouSeeMissile.mp4',
    'IntegratedSecurityFramework.mp4',
    'LoudSound.mp4',
    'MarketsStable.mp4',
    'ReportSuspicious.mp4',
    'ShoppingComplexes.mp4',
    'WorkplaceProcedure.mp4',
].map(f => `assets/videos/PSAs/${encodeURIComponent(f)}`);

// ── Rank system ─────────────────────────────────────────────────────────────
const RANKS = [
    { id: 'jundi',       nameAr: 'جندي',     nameEn: 'Jundi',         cat: 'ENLISTED', file: null,                repPoints: 0        },
    { id: 'wakil_awwal', nameAr: 'وكيل اول',  nameEn: 'Wakil Awwal',  cat: 'ENLISTED', file: 'Wakil awwal.png',   repPoints: 500      },
    { id: 'wakil_thani', nameAr: 'وكيل ثاني', nameEn: 'Wakil Thani',  cat: 'ENLISTED', file: 'Wakil thani.png',   repPoints: 1500     },
    { id: 'raqib',       nameAr: 'رقيب',       nameEn: 'Raqib',        cat: 'ENLISTED', file: 'Raqib.png',         repPoints: 4000     },
    { id: 'nayib',       nameAr: 'نائب',       nameEn: 'Nayib',        cat: 'ENLISTED', file: 'Nayib.png',         repPoints: 9000     },
    { id: 'earif',       nameAr: 'عريف',       nameEn: 'Earif',        cat: 'ENLISTED', file: 'Earif.png',         repPoints: 18000    },
    { id: 'wakil_earif', nameAr: 'وكيل عريف',  nameEn: 'Wakil Earif',  cat: 'ENLISTED', file: 'Wakil Earif.png',   repPoints: 35000    },
    { id: 'mulazim',     nameAr: 'ملازم',      nameEn: 'Mulazim',       cat: 'OFFICER',  file: 'Mulazim.png',      repPoints: 60000    },
    { id: 'mulazim_aw',  nameAr: 'ملازم أول',  nameEn: 'Mulazim Awwal', cat: 'OFFICER',  file: 'Mulazim awwal.png',repPoints: 95000    },
    { id: 'naqib',       nameAr: 'نقيب',       nameEn: 'Naqib',         cat: 'OFFICER',  file: 'Naqib.png',        repPoints: 140000   },
    { id: 'raid',        nameAr: 'رائد',       nameEn: "Ra'id",         cat: 'OFFICER',  file: "Ra'id.png",        repPoints: 200000   },
    { id: 'muqaddam',    nameAr: 'مقدم',       nameEn: 'Muqaddam',      cat: 'OFFICER',  file: 'Muqaddam.png',     repPoints: 280000   },
    { id: 'aqid',        nameAr: 'عقيد',       nameEn: 'Aqid',          cat: 'OFFICER',  file: 'Aqid.png',         repPoints: 380000   },
    { id: 'amid',        nameAr: 'عميد',       nameEn: 'Amid',          cat: 'OFFICER',  file: 'Amid.png',         repPoints: 500000   },
    { id: 'liwa',        nameAr: 'لواء',       nameEn: 'Liwa',          cat: 'OFFICER',  file: 'Liwa.png',         repPoints: 650000   },
    { id: 'fariq',       nameAr: 'فريق',       nameEn: 'Fariq',         cat: 'OFFICER',  file: 'Fariq.png',        repPoints: 850000   },
    { id: 'fariq_awwal', nameAr: 'فريق اول',   nameEn: 'Fariq Awwal',   cat: 'OFFICER',  file: 'Fariq awwal.png',  repPoints: 1100000  },
];

// Multi-pathway RepPoints formula — rank is based on experience, NOT score
function _computeRepPoints(totalKills, playtimeSec, gamesPlayed, bestStreak, penalty) {
    const base = totalKills * 8
               + Math.floor(playtimeSec / 60) * 50
               + gamesPlayed * 30
               + bestStreak * 20;
    let mult = 1.0;
    if (bestStreak >= 5)    mult += 0.10; // Combat specialist pathway
    if (bestStreak >= 10)   mult += 0.12; // Elite combat pathway
    if (gamesPlayed >= 10)  mult += 0.08; // Leadership pathway
    if (gamesPlayed >= 25)  mult += 0.10; // Veteran commander pathway
    if (totalKills >= 200)  mult += 0.08; // Veteran kills pathway
    if (totalKills >= 500)  mult += 0.10; // Elite veteran pathway
    return Math.max(0, Math.round(base * mult) - (penalty || 0));
}

function _getRank(repPoints) {
    let rank = RANKS[0];
    for (const r of RANKS) { if (repPoints >= r.repPoints) rank = r; }
    return rank;
}

function _shuffleArr(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const THREAT_COLORS = {
    ballistic:     '#ff2200',
    cruise:        '#ff8800',
    hypersonic:    '#ff00ff',
    drone:         '#ff4422',
    antiship:      '#00ccff',
    maneuver:      '#ff6622',
    loiter:        '#ffaa00',
    mirv:          '#ff0044',
    bomber:        '#ffaa22',
    enemy_fighter: '#ff4444',
    cluster:       '#ff6600',
    submunition:   '#ff8833',
};

const THREAT_ICONS = {
    ballistic:     '☢',
    cruise:        '✈',
    hypersonic:    '⚡',
    drone:         '⌖',
    antiship:      '⚓',
    maneuver:      '⊕',
    loiter:        '◎',
    mirv:          '✶',
    bomber:        '✈',
    enemy_fighter: '⚠',
    civilian:      '✈',
    ghost:         '?',
    cluster:       '✦',
    submunition:   '◆',
};

const KILL_DISPLAY = {
    ballistic:     { label: 'BALLISTIC',  color: '#ff2200' },
    cruise:        { label: 'CRUISE',     color: '#ff8800' },
    drone:         { label: 'DRONE',      color: '#ffdd00' },
    hypersonic:    { label: 'HYPERSONIC', color: '#ff00ff' },
    antiship:      { label: 'ANTI-SHIP',  color: '#00ccff' },
    maneuver:      { label: 'MANEUVER',   color: '#ff88ff' },
    loiter:        { label: 'LOITER',     color: '#ffaa00' },
    mirv:          { label: 'MIRV',       color: '#ff44ff' },
    bomber:        { label: 'BOMBER',     color: '#ffaa22' },
    enemy_fighter: { label: 'ENEMY FIGHTER', color: '#ff4444' },
    cluster:       { label: 'CLUSTER CBM',   color: '#ff6600' },
    submunition:   { label: 'SUBMUNITION',   color: '#ff8833' },
};

// ── Cookie helpers for persistent high score ────────────────────────────────
function _setCookie(name, val, days = 730) {
    const exp = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(val)};expires=${exp};path=/;SameSite=Lax`;
}
function _getCookie(name) {
    const m = document.cookie.split('; ').find(r => r.startsWith(name + '='));
    return m ? decodeURIComponent(m.split('=')[1]) : null;
}

export class UIManager {
    constructor(game, inputHandler, soundManager) {
        this.game = game;
        this.input = inputHandler;
        this.sound = soundManager;
        this._killCounts   = {};
        this._impactCounts = {}; // hits taken by missile type
        this._totalImpacts = 0;
        this._waveTimer    = null;
        this._highScore    = parseInt(_getCookie('qad_hs') || '0', 10);
        this._cumScore     = parseInt(_getCookie('qad_cs') || '0', 10); // kept for score display only
        this._gamesPlayed  = parseInt(_getCookie('qad_gp') || '0', 10);
        this._totalKills   = parseInt(_getCookie('qad_tk') || '0', 10);
        this._totalPlaytime= parseInt(_getCookie('qad_pt') || '0', 10); // seconds
        this._bestStreak   = parseInt(_getCookie('qad_ks') || '0', 10);
        this._repPenalty   = parseInt(_getCookie('qad_rkp') || '0', 10);
        this._currentRank  = _getRank(_computeRepPoints(this._totalKills, this._totalPlaytime, this._gamesPlayed, this._bestStreak, this._repPenalty));

        // PSA cutscene state
        this._psaPlaylist    = _shuffleArr(PSA_VIDEOS);
        this._psaIndex       = 0;
        this._psaDone        = false;
        this._cutsceneEnabled = true;

        this._buildArsenal();
        this._buildThreatLegend();
        this._initTabs();
        this._initTopBarButtons();

        // Cache DOM element references once — never call getElementById in the hot update loop
        this._els = {
            moneyDisplay:     document.getElementById('moneyDisplay'),
            waveDisplay:      document.getElementById('waveDisplay'),
            scoreDisplay:     document.getElementById('scoreDisplay'),
            threatCount:      document.getElementById('threatCount'),
            healthDisplay:    document.getElementById('healthDisplay'),
            activeThreatList: document.getElementById('activeThreatList'),
            killBoard:            document.getElementById('killBoard'),
            hitBoard:             document.getElementById('hitBoard'),
            interceptionsDisplay: document.getElementById('interceptionsDisplay'),
            hitsDisplay:          document.getElementById('hitsDisplay'),
            ewBtn:                document.getElementById('ewBtn'),
            allyBtn:              document.getElementById('allyRequestBtn'),
            exchangeDisplay:  document.getElementById('exchangeDisplay'),
            hornetBtn:        document.getElementById('hornetBtn'),
            jetBtn:           document.getElementById('jetBtn'),
            frigateBtn:       document.getElementById('frigateBtn'),
            laserItem:        document.querySelector('.arsenal-item[data-type="laser"]'),
            arsenalItems:     [...document.querySelectorAll('.arsenal-item')],
            bestDisplay:      document.getElementById('bestDisplay'),
            rankInsignia:     document.getElementById('rankInsignia'),
            rankCat:          document.getElementById('rankCat'),
            rankNameEn:       document.getElementById('rankNameEn'),
            rankNameAr:       document.getElementById('rankNameAr'),
            rankProgress:     document.getElementById('rankProgress'),
        };

        // Previous values — only write to DOM when value changes
        this._prev = { money: null, wave: null, score: null, threats: null, healthPct: null, shieldActive: null, best: null, rank: null };
        // Init best display from cookie
        if (this._els.bestDisplay) this._els.bestDisplay.textContent = this._highScore.toLocaleString();

        // Wire input log callback
        this.input.onLog = (msg, type) => this.log(msg, type);

        // Game event callbacks
        game.setCallbacks({
            onMissileSpawned:  (type, level, target) => this._onMissileSpawned(type, level, target),
            onInterception:    (reward, type)         => this._onInterception(reward, type),
            onImpact:          (dmg, type, target)    => this._onImpact(dmg, type, target),
            onWave:            (n, count, types)       => this._onWave(n, count, types),
            onGameOver:        (gs)                    => this._showGameOver(gs),
            onLog:             (msg, type)             => this.log(msg, type),
            onHornetUnlocked:  ()                      => this._unlockHornet(),
            onFrigateUnlocked: ()                      => this._unlockFrigate(),
            onCutscene:        (waveNum, doneCb)       => this._playCutscene(waveNum, doneCb),
            onCivilianIncident: ()                     => this._onCivilianIncident(),
        });

        this._updateKillBoard();
        this._updateHitBoard();
        this._updateInterval = setInterval(() => this._updateHUD(), 100);
        this.log('Qatar Air Defense System — ONLINE. Click a missile blip to intercept.', 'success');
        // Init rank display
        this._applyRankDisplay(this._currentRank);
    }

    _applyRankDisplay(rank) {
        const els = this._els;
        if (!els) return;
        if (els.rankInsignia) {
            if (rank.file) {
                els.rankInsignia.src = `assets/Rank/${rank.file}`;
                els.rankInsignia.style.display = 'block';
            } else {
                els.rankInsignia.style.display = 'none';
            }
        }
        if (els.rankCat)    els.rankCat.textContent    = rank.cat;
        if (els.rankNameEn) els.rankNameEn.textContent  = rank.nameEn.toUpperCase();
        if (els.rankNameAr) els.rankNameAr.textContent  = rank.nameAr;

        // Next rank progress bar
        const nextIdx = RANKS.indexOf(rank) + 1;
        if (els.rankProgress) {
            if (nextIdx < RANKS.length) {
                const next = RANKS[nextIdx];
                const effectiveRp = _computeRepPoints(this._totalKills, this._totalPlaytime, this._gamesPlayed, this._bestStreak, this._repPenalty);
                const pct = Math.min(100, Math.round(((effectiveRp - rank.repPoints) / (next.repPoints - rank.repPoints)) * 100));
                els.rankProgress.style.width = pct + '%';
                els.rankProgress.title = `${pct}% to ${next.nameEn}`;
            } else {
                els.rankProgress.style.width = '100%';
            }
        }
    }

    _initTopBarButtons() {
        const cutsceneToggle = document.getElementById('cutsceneToggleBtn');
        if (cutsceneToggle) {
            cutsceneToggle.addEventListener('click', () => {
                this._cutsceneEnabled = !this._cutsceneEnabled;
                cutsceneToggle.textContent = `🎬 PSA: ${this._cutsceneEnabled ? 'ON' : 'OFF'}`;
                cutsceneToggle.style.opacity = this._cutsceneEnabled ? '1' : '0.5';
                this.log(`◉ PSA cutscenes ${this._cutsceneEnabled ? 'enabled' : 'disabled'}.`, 'info');
            });
        }

        document.getElementById('clearDataBtn')?.addEventListener('click', () => {
            if (!confirm(`Clear all saved data?\n\nThis will permanently reset:\n• High Score\n• Rank (${this._currentRank.nameEn}) — you will return to Jundi\n• Total Kills: ${this._totalKills}\n• Playtime: ${Math.floor(this._totalPlaytime/60)} min\n• Games Played: ${this._gamesPlayed}\n• Best Streak: ${this._bestStreak}\n\nThis cannot be undone.`)) return;
            // Expire the high score cookie
            document.cookie = 'qad_hs=0;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            this._highScore = 0;
            this._cumScore    = 0;
            this._gamesPlayed = 0;
            this._currentRank = RANKS[0];
            document.cookie = 'qad_cs=0;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            document.cookie = 'qad_gp=0;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            document.cookie = 'qad_tk=0;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            document.cookie = 'qad_pt=0;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            document.cookie = 'qad_ks=0;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            document.cookie = 'qad_rkp=0;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            this._totalKills    = 0;
            this._totalPlaytime = 0;
            this._bestStreak    = 0;
            this._repPenalty    = 0;
            this._applyRankDisplay(RANKS[0]);
            if (this._els?.bestDisplay) this._els.bestDisplay.textContent = '0';
            this.log('◉ Saved data cleared.', 'info');
        });
    }

    _playCutscene(waveNum, doneCb) {
        if (!this._cutsceneEnabled || this._psaDone || this._psaIndex >= this._psaPlaylist.length) {
            if (!this._cutsceneEnabled) { doneCb(); return; }
            this._psaDone = true;
            doneCb();
            return;
        }

        const overlay = document.getElementById('cutsceneOverlay');
        const video   = document.getElementById('cutsceneVideo');
        const intro   = document.getElementById('cutsceneIntro');
        const skipBtn = document.getElementById('cutsceneSkipBtn');
        if (!overlay || !video) { doneCb(); return; }

        const src = this._psaPlaylist[this._psaIndex++];
        if (this._psaIndex >= this._psaPlaylist.length) this._psaDone = true;

        // Prepare video but don't play yet
        video.src = src;
        video.currentTime = 0;
        video.style.visibility = 'hidden';

        // Show overlay with intro screen
        if (intro) intro.style.display = 'flex';
        overlay.style.display = 'flex';

        const close = () => {
            window.speechSynthesis?.cancel();
            video.pause();
            video.src = '';
            overlay.style.display = 'none';
            if (intro) intro.style.display = 'none';
            doneCb();
        };

        const playVideo = () => {
            if (intro) intro.style.display = 'none';
            video.style.visibility = 'visible';
            video.play().catch(() => {});
            video.onended = close;
        };

        // Speak intro text in English, then play video
        const INTRO_TEXT = 'Ministry of Interior. This is not a drill. This is a public service announcement.';
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(INTRO_TEXT);
            utt.rate  = 0.82;
            utt.pitch = 0.72;
            utt.volume = 1.0;
            const voices = window.speechSynthesis.getVoices();
            const voice =
                voices.find(v => v.lang === 'en-US' && /male|david|mark|richard/i.test(v.name)) ||
                voices.find(v => v.lang === 'en-GB' && /male|daniel/i.test(v.name)) ||
                voices.find(v => v.lang.startsWith('en-US')) ||
                voices.find(v => v.lang.startsWith('en')) ||
                voices[0];
            if (voice) utt.voice = voice;
            utt.onend   = playVideo;
            utt.onerror = playVideo;
            // Safety: if speech never fires, start video after 5s
            const speechTimeout = setTimeout(playVideo, 5000);
            utt.onend = () => { clearTimeout(speechTimeout); playVideo(); };
            window.speechSynthesis.speak(utt);
        } else {
            // No speech API — show intro for 3s then play
            setTimeout(playVideo, 3000);
        }

        // Wire skip button (clone to remove stale listeners)
        const newSkip = skipBtn.cloneNode(true);
        skipBtn.parentNode.replaceChild(newSkip, skipBtn);
        document.getElementById('cutsceneSkipBtn').addEventListener('click', close, { once: true });
    }

    _initTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const panel = btn.dataset.panel;
                const tab   = btn.dataset.tab;

                // Deactivate all buttons in this panel
                document.querySelectorAll(`.tab-btn[data-panel="${panel}"]`)
                    .forEach(b => b.classList.remove('active'));

                // Hide all content in this panel
                document.querySelectorAll(`.tab-btn[data-panel="${panel}"]`)
                    .forEach(b => {
                        const el = document.getElementById(`tab-${b.dataset.tab}`);
                        if (el) el.classList.add('hidden');
                    });

                // Activate selected
                btn.classList.add('active');
                const content = document.getElementById(`tab-${tab}`);
                if (content) content.classList.remove('hidden');
            });
        });
    }

    _buildArsenal() {
        const list = document.getElementById('arsenalList');
        if (!list) return;
        list.innerHTML = '';
        const colorMap = { patriot: '#00ff88', arrow: '#0088ff', shorad: '#88ff00', laser: '#ff4488', hornet: '#ffaa22', cram: '#ff6600' };

        Object.entries(INTERCEPTOR_TYPES).forEach(([key, cfg]) => {
            const col = colorMap[key] || '#00ff00';
            const locked = !!cfg.unlocksAtWave;
            const eff = cfg.effectiveness;

            const speedLabel = cfg.speed >= 0.7 ? 'Very Fast' : cfg.speed >= 0.5 ? 'Fast' : cfg.speed >= 0.3 ? 'Medium' : 'Slow';
            const rangeLabel = cfg.killRadius >= 0.06 ? 'Long' : cfg.killRadius >= 0.045 ? 'Medium' : 'Short';

            const allStats = [
                { label: 'BAL', val: eff.ballistic  ?? 0, color: '#ff3300' },
                { label: 'CRZ', val: eff.cruise     ?? 0, color: '#ff8800' },
                { label: 'HYP', val: eff.hypersonic ?? 0, color: '#ff00ff' },
                { label: 'DRN', val: eff.drone      ?? 0, color: '#ff4422' },
                { label: 'LTR', val: eff.loiter     ?? 0, color: '#ffaa00' },
                { label: 'MRV', val: eff.mirv       ?? 0, color: '#ff0044' },
                { label: 'A/S', val: eff.antiship   ?? 0, color: '#00aaff' },
                { label: 'BMB', val: eff.bomber     ?? 0, color: '#ffcc44' },
                { label: 'FTR', val: eff.enemy_fighter ?? 0, color: '#ff6666' },
                { label: 'MAN', val: eff.maneuver   ?? 0, color: '#cc44ff' },
            ];

            const tooltipRows = allStats.map(s => {
                const pct = Math.round(s.val * 100);
                return `<div class="arsenal-tooltip-stat">
                    <span class="ts-label">${s.label}</span>
                    <div class="ts-bar-bg"><div class="ts-bar-fill" style="width:${pct}%;background:${s.color}"></div></div>
                    <span class="ts-pct">${pct}%</span>
                </div>`;
            }).join('');

            const div = document.createElement('div');
            div.className = 'arsenal-item' + (key === 'patriot' ? ' selected' : '') + (locked ? ' locked' : '');
            div.dataset.type = key;
            div.dataset.unlocksAt = cfg.unlocksAtWave || 0;
            div.innerHTML = `
                <div class="arsenal-header">
                    <span class="arsenal-key">${cfg.keyHint}</span>
                    <span class="arsenal-name" style="color:${col}">${cfg.name}</span>
                    ${locked ? `<span class="lock-badge">🔒 W${cfg.unlocksAtWave}</span>` : ''}
                    <span class="arsenal-info-btn" title="Show stats">ℹ</span>
                </div>
                <div class="arsenal-cost">$${cfg.cost}/shot</div>
                <div class="arsenal-desc">${cfg.description}</div>
                <div class="arsenal-eff">
                    ${this._effBar('BAL', eff.ballistic  ?? 0, '#ff2200')}
                    ${this._effBar('HYP', eff.hypersonic ?? 0, '#ff00ff')}
                    ${this._effBar('CRZ', eff.cruise     ?? 0, '#ff8800')}
                    ${this._effBar('DRN', eff.drone      ?? 0, '#ff4422')}
                    ${this._effBar('LTR', eff.loiter     ?? 0, '#ffaa00')}
                    ${this._effBar('MRV', eff.mirv       ?? 0, '#ff0044')}
                </div>
                <div class="arsenal-tooltip">
                    <div class="arsenal-tooltip-title">◈ Full Effectiveness</div>
                    <div class="arsenal-tooltip-grid">${tooltipRows}</div>
                    <div class="arsenal-tooltip-meta">
                        <div class="tm-item">Speed: <span>${speedLabel}</span></div>
                        <div class="tm-item">Range: <span>${rangeLabel}</span></div>
                        <div class="tm-item">Cost: <span>$${cfg.cost}/shot</span></div>
                        ${cfg.isBeam ? '<div class="tm-item">Type: <span>Energy Beam</span></div>' : ''}
                        ${cfg.isLoitering ? '<div class="tm-item">Type: <span>Loitering UAV</span></div>' : ''}
                    </div>
                </div>`;

            // Info icon toggles tooltip; stops propagation so it doesn't select weapon
            div.querySelector('.arsenal-info-btn').addEventListener('click', e => {
                e.stopPropagation();
                const tip = div.querySelector('.arsenal-tooltip');
                tip.classList.toggle('visible');
            });

            list.appendChild(div);
        });
    }

    _unlockHornet() {
        const btn = document.getElementById('hornetBtn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = '\u25c8 [8] HORNET SWARM ($600)';
            btn.style.opacity = '1';
            btn.classList.add('primary');
            btn.style.outline = '2px solid #ffaa22';
            setTimeout(() => { btn.style.outline = ''; }, 3000);
        }
    }

    _unlockFrigate() {
        const btn = document.getElementById('frigateBtn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = '⚓ [7] DEPLOY FRIGATES ($1200)';
            btn.style.opacity = '1';
            btn.classList.add('primary');
            btn.style.outline = '2px solid #44aaff';
            setTimeout(() => { btn.style.outline = ''; }, 3000);
        }
    }

    _effBar(label, val, color) {
        const pct = Math.round(val * 100);
        return `<div class="eff-row">
            <span class="eff-label">${label}</span>
            <div class="eff-bar-bg"><div class="eff-bar-fill" style="width:${pct}%;background:${color}"></div></div>
            <span class="eff-pct">${pct}%</span>
        </div>`;
    }

    _buildThreatLegend() {
        const legend = document.getElementById('threatLegend');
        if (!legend) return;
        legend.innerHTML = '';

        const mkSep = (label) => {
            const el = document.createElement('div');
            el.style.cssText = 'font-size:0.55em;color:#4a5568;padding:4px 0 2px;letter-spacing:1px;text-transform:uppercase';
            el.textContent = `— ${label} —`;
            legend.appendChild(el);
        };
        const mkRow = (color, icon, name, dmg) => {
            const div = document.createElement('div');
            div.className = 'legend-item';
            div.innerHTML = `
                <span class="legend-dot" style="background:${color}"></span>
                <span class="legend-name" style="color:${color}">${icon} ${name}</span>
                <span class="legend-dmg" style="color:${color}">${dmg}</span>`;
            legend.appendChild(div);
        };

        mkSep('Missiles & Warheads');
        Object.entries(MISSILE_TYPES).forEach(([key, cfg]) => {
            mkRow(cfg.color, THREAT_ICONS[key] || '•', cfg.name, `-${cfg.damage}hp`);
        });

        mkSep('Aircraft');
        mkRow('#ffaa22', '✈', 'Strategic Bomber',  '3–8hp · drops ordnance');
        mkRow('#ff4444', '⚠', 'Enemy Fighter',     '2hp · dogfights jets, fires cruise missiles');
        mkRow('#7799cc', '✈', 'Civilian Airliner', 'DO NOT SHOOT — penalty');
        mkRow('#888844', '?', 'Radar Ghost (EW)',   'Decoy — wastes interceptors');
        mkRow('#ff6600', '✦', 'Cluster Ballistic (CBM)', 'Splits into 10 submunitions over Qatar — intercept early!');
        mkRow('#ff8833', '◆', 'Cluster Submunition',    'Released by CBM — fast plunging warheads');

        mkSep('Friendly Assets');
        mkRow('#ffdd44', '✈', 'QAF Fighter (QAF-#)', 'Engages all but ballistic, hypersonic, anti-ship');
        mkRow('#ffaa22', '◈', 'Hornet UAV (UAV-##)', 'Kamikaze vs drones/loiters');
        mkRow('#44aaff', '⚓', 'Frigate (QN-#)',      'Anti-cruise/anti-ship; no hypersonic');

        mkSep('Powerup Drops — click to collect');
        mkRow('#f59e0b', '$', 'Emergency Funds',   '+$1200 — click to collect');
        mkRow('#22c55e', '+', 'Repair Crew',        '+25 HP + resets all cooldowns');
        mkRow('#38bdf8', '◈', 'Defense Shield',     '30s ADIZ auto-intercept + damage block');
        mkRow('#00ffcc', '⚡', 'OVERCLOCK',          '20s — interceptors at 2× speed');
        mkRow('#fbbf24', '◉', 'Resupply',           '+$600 + resets weapon cooldowns');
        mkRow('#a78bfa', '◎', 'Intel Burst',        'Clears all radar ghost decoys');
    }

    _updateHUD() {
        const gs   = this.game.getGameState();
        const em   = this.game.entityManager;
        const els  = this._els;
        const prev = this._prev;

        // Helper: only touch DOM when value actually changed
        const setText = (el, val) => {
            if (!el) return;
            const s = String(val);
            if (el.textContent !== s) el.textContent = s;
        };

        // --- Core stats (skip write if unchanged) ---
        const money = '$' + gs.getMoney().toLocaleString();
        if (money !== prev.money) { prev.money = money; if (els.moneyDisplay) els.moneyDisplay.textContent = money; }

        // Wave counter: Math.max ensures it never visually shows below 0
        const wave = Math.max(0, gs.getWaveCount());
        if (wave !== prev.wave) { prev.wave = wave; if (els.waveDisplay) els.waveDisplay.textContent = wave; }

        const score = gs.getScore().toLocaleString();
        if (score !== prev.score) { prev.score = score; if (els.scoreDisplay) els.scoreDisplay.textContent = score; }
        // Best score — update live if player beats their record mid-game
        if (els.bestDisplay) {
            const live = gs.getScore();
            if (live > this._highScore) { this._highScore = live; _setCookie('qad_hs', live); }
            els.bestDisplay.textContent = this._highScore.toLocaleString();
        }

        // --- Rank display ---
        if (this._currentRank.id !== this._prev.rank) {
            this._prev.rank = this._currentRank.id;
            this._applyRankDisplay(this._currentRank);
        }

        // Live kills + hits counters
        setText(els.interceptionsDisplay, gs.getInterceptionsCount());
        setText(els.hitsDisplay, this._totalImpacts);

        const threats = em.countMissiles() + em.countBombers() + em.countEnemyFighters();
        if (threats !== prev.threats) { prev.threats = threats; if (els.threatCount) els.threatCount.textContent = threats; }

        // --- Health (color changes too) ---
        const hp  = Math.max(0, gs.getHealth());
        const pct = Math.round((hp / gs.getMaxHealth()) * 100);
        if (pct !== prev.healthPct && els.healthDisplay) {
            prev.healthPct = pct;
            els.healthDisplay.textContent = pct + '%';
            els.healthDisplay.style.color = pct > 50 ? '#00ff44' : pct > 25 ? '#ffcc00' : '#ff3300';
        }

        // --- Shield glow on health display ---
        const shieldActive = !!this.game.isShieldActive?.();
        if (shieldActive !== prev.shieldActive && els.healthDisplay) {
            prev.shieldActive = shieldActive;
            els.healthDisplay.style.textShadow = shieldActive ? '0 0 8px #38bdf8' : '';
        }

        // --- Threat list (must update every tick — progress bars move) ---
        this._updateThreatList(em.getMissiles(), em.getBombers(), em.getEnemyFighters());

        // --- Laser indicator ---
        if (els.laserItem) {
            const ready = this.game.isLaserReady();
            els.laserItem.classList.toggle('laser-ready',   ready);
            els.laserItem.classList.toggle('laser-cooling', !ready);
        }

        // --- EW button ---
        if (els.ewBtn) {
            const ewActive   = this.game.isEWActive?.();
            const ewCooldown = this.game.getEWCooldown?.() || 0;
            const ewReady    = this.game.isEWReady?.();
            if (ewActive) {
                const ewTimer = this.game.getEWTimer?.() || 0;
                const ewMins  = Math.floor(ewTimer / 60), ewSecs = Math.ceil(ewTimer % 60);
                setText(els.ewBtn, `⚡ EW JAMMING ${ewMins}:${String(ewSecs).padStart(2,'0')}`);
                els.ewBtn.style.opacity = '0.85';
            } else if (!ewReady) {
                const cdMins = Math.floor(ewCooldown / 60), cdSecs = Math.ceil(ewCooldown % 60);
                setText(els.ewBtn, `⚡ [9] EW RECHARGING ${cdMins}:${String(cdSecs).padStart(2,'0')}`);
                els.ewBtn.style.opacity = '0.55';
            } else {
                setText(els.ewBtn, '⚡ [9] EW JAM ($300) 3MIN');
                els.ewBtn.style.opacity = '1';
            }
        }

        // --- Allied Support button ---
        if (els.allyBtn) {
            const alliedActive   = this.game.isAlliedSupportActive?.();
            const alliedCooldown = this.game.getAlliedSupportCooldown?.() || 0;
            if (alliedActive) {
                const t = this.game.getAlliedSupportTimer?.() || 0;
                setText(els.allyBtn, `⚡ ALLIED ACTIVE ${t}s`);
                els.allyBtn.disabled      = true;
                els.allyBtn.style.opacity = '0.75';
            } else if (alliedCooldown > 0) {
                setText(els.allyBtn, `⚡ ALLIED RECHARGING ${alliedCooldown}s`);
                els.allyBtn.disabled      = true;
                els.allyBtn.style.opacity = '0.45';
            } else {
                setText(els.allyBtn, '⚡ ALLIED SUPPORT ($5000)');
                els.allyBtn.disabled      = false;
                els.allyBtn.style.opacity = '1';
            }
        }

        // --- Exchange ratio ---
        if (els.exchangeDisplay) {
            const ratio = this.game.getExchangeRatio?.();
            if (ratio === null || ratio === undefined) {
                setText(els.exchangeDisplay, '—');
                els.exchangeDisplay.style.color = '#94a3b8';
            } else {
                setText(els.exchangeDisplay, ratio.toFixed(1) + 'x');
                els.exchangeDisplay.style.color = ratio >= 1.2 ? '#22c55e' : ratio >= 0.8 ? '#f59e0b' : '#ef4444';
            }
        }

        // --- Arsenal battery disabled state (cached item list) ---
        const batteryStatus = this.game.getBatteryStatus?.() || {};
        const batteries     = this.game.getRadar?.().getBatteries() || [];
        for (const el of els.arsenalItems) {
            const type = el.dataset.type;
            const typeBatteries = batteries.filter(b => b.type === type);
            const allDisabled   = typeBatteries.length > 0 && typeBatteries.every(b => (batteryStatus[b.id] || 0) > 0);
            const wavesLeft     = allDisabled ? Math.max(...typeBatteries.map(b => batteryStatus[b.id] || 0)) : 0;
            el.classList.toggle('battery-disabled', allDisabled);
            let badge = el.querySelector('.battery-badge');
            if (allDisabled) {
                if (!badge) { badge = document.createElement('span'); badge.className = 'battery-badge'; el.querySelector('.arsenal-header')?.appendChild(badge); }
                setText(badge, `⚠ OFFLINE ${wavesLeft}W`);
            } else if (badge) {
                badge.remove();
            }
        }

        // --- Hornet button ---
        if (els.hornetBtn && this.game.isHornetUnlocked?.()) {
            const hInflight = this.game.isHornetActive?.();
            const hCooldown = this.game.getHornetCooldown?.() || 0;
            const hReady    = this.game.isHornetReady?.();
            if (hInflight) {
                const activeUAVs = this.game.getEntityManager().countHornetDrones();
                setText(els.hornetBtn, `◈ HORNETS ACTIVE (${activeUAVs} alive)`);
                els.hornetBtn.style.opacity = '0.6';
            } else if (!hReady) {
                setText(els.hornetBtn, `◈ [5] RECHARGING ${hCooldown}s`);
                els.hornetBtn.style.opacity = '0.55';
            } else {
                setText(els.hornetBtn, '◈ [5] LAUNCH 10 HORNETS ($600)');
                els.hornetBtn.style.opacity = '1';
            }
        }

        // --- Frigate button ---
        if (els.frigateBtn && this.game.isFrigateUnlocked?.()) {
            const fInflight  = this.game.isFrigateActive?.();
            const fCooldown  = this.game.getFrigateCooldown?.() || 0;
            const fReady     = this.game.isFrigateReady?.();
            const fDisabled  = (this.game.getFrigateDisabledWaves?.() || 0) > 0;
            if (fDisabled) {
                setText(els.frigateBtn, `⚓ AL KHOR OFFLINE (${this.game.getFrigateDisabledWaves()} waves)`);
                els.frigateBtn.style.opacity = '0.4';
            } else if (fInflight) {
                const activeFrigates = this.game.getEntityManager().countFrigates();
                setText(els.frigateBtn, `⚓ FLEET ON PATROL (${activeFrigates} ships)`);
                els.frigateBtn.style.opacity = '0.6';
            } else if (!fReady) {
                setText(els.frigateBtn, `⚓ [7] RECHARGING ${fCooldown}s`);
                els.frigateBtn.style.opacity = '0.55';
            } else {
                setText(els.frigateBtn, '⚓ [7] DEPLOY 7 FRIGATES ($1200)');
                els.frigateBtn.style.opacity = '1';
            }
        }

        // --- Jet button ---
        if (els.jetBtn) {
            const disabled = this.game.getJetDisabledWaves?.() > 0;
            const inflight = this.game.isSquadronActive?.();
            const cooldown = this.game.getJetCooldownRemaining?.() || 0;
            const ready    = this.game.isJetDispatchReady();
            if (disabled) {
                setText(els.jetBtn, `✈ AL UDEID OFFLINE (${this.game.getJetDisabledWaves()} waves)`);
                els.jetBtn.style.opacity = '0.4';
            } else if (inflight) {
                const activeJets = this.game.getEntityManager().countFighterJets();
                setText(els.jetBtn, `✈ SQUADRON IN FLIGHT (${activeJets} jets)`);
                els.jetBtn.style.opacity = '0.6';
            } else if (!ready) {
                setText(els.jetBtn, `✈ [6] RECHARGING ${cooldown}s`);
                els.jetBtn.style.opacity = '0.6';
            } else {
                setText(els.jetBtn, '✈ [6] SCRAMBLE 20 JETS ($1500)');
                els.jetBtn.style.opacity = '1';
            }
        }
    }

    _updateThreatList(missiles, bombers = [], enemyFighters = []) {
        const list = this._els.activeThreatList;
        if (!list) return;

        const rows = [];

        // Bombers
        for (const b of bombers) {
            if (!b.isActive()) continue;
            const hpPct = Math.round((b.hp / b.maxHp) * 100);
            rows.push(`<div class="threat-row">
                <span style="color:#ffaa22;font-size:11px">✈</span>
                <span class="threat-type" style="color:#ffaa22">BOMBER</span>
                <div class="threat-bar-bg"><div class="threat-bar-fill" style="width:${hpPct}%;background:#ffaa22"></div></div>
                <span class="threat-pct">${hpPct}%hp</span>
                ${b.targeted ? '<span class="tracked-badge">⊙ TRACKED</span>' : ''}
            </div>`);
        }

        // Enemy fighters
        for (const f of enemyFighters) {
            if (!f.isActive()) continue;
            const hpPct = Math.round((f.hp / f.maxHp) * 100);
            const flareTag = f._flareActive ? '<span class="tracked-badge" style="color:#ffd700">✦ FLARE</span>' : '';
            rows.push(`<div class="threat-row">
                <span style="color:#ff4444;font-size:11px">⚠</span>
                <span class="threat-type" style="color:#ff4444">ENEMY FIGHTER</span>
                <div class="threat-bar-bg"><div class="threat-bar-fill" style="width:${hpPct}%;background:#ff4444"></div></div>
                <span class="threat-pct">${hpPct}%hp</span>
                ${f.targeted ? '<span class="tracked-badge">⊙ TRACKED</span>' : ''}${flareTag}
            </div>`);
        }

        // Missiles (sorted by progress descending, up to remaining slots)
        const maxRows = 8;
        const sorted = [...missiles].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0)).slice(0, maxRows - rows.length);
        for (const m of sorted) {
            const pct = Math.round((m.progress ?? 0) * 100);
            const col = THREAT_COLORS[m.type] || '#ff4400';
            const icon = THREAT_ICONS[m.type] || '•';
            const isDrone = m.type === 'drone';
            rows.push(`<div class="threat-row">
                <span style="color:${col};font-size:11px">${icon}</span>
                <span class="threat-type" style="color:${col}">${m.config.shortName}${isDrone ? ' ✦' : ''}</span>
                <div class="threat-bar-bg"><div class="threat-bar-fill" style="width:${pct}%;background:${col}"></div></div>
                <span class="threat-pct">${pct}%</span>
                ${m.targeted ? '<span class="tracked-badge">⊙ TRACKED</span>' : ''}
            </div>`);
        }

        if (rows.length === 0) {
            list.innerHTML = '<div class="no-threats">No active threats detected</div>';
        } else {
            list.innerHTML = rows.join('');
        }
    }

    _onMissileSpawned(type, level, target) {
        const cfg = MISSILE_TYPES[type] || {};
        const icon = THREAT_ICONS[type] || '•';
        this.log(`${icon} ${cfg.name || type} → ${target} [${level}]`, 'warning');
    }

    _onInterception(reward, type) {
        const displayName = type === 'bomber' ? 'Strategic Bomber'
            : type === 'enemy_fighter' ? 'Enemy Fighter'
            : (MISSILE_TYPES[type]?.name || type);
        this.log(`✓ ${displayName} destroyed  +$${reward}`, 'success');
        this._killCounts[type] = (this._killCounts[type] || 0) + 1;
        this._updateKillBoard();
    }

    _updateKillBoard() {
        const el = this._els?.killBoard || document.getElementById('killBoard');
        if (!el) return;
        const entries = Object.entries(this._killCounts).filter(([, v]) => v > 0);
        if (entries.length === 0) { el.innerHTML = '<div class="no-threats">No kills yet</div>'; return; }
        el.innerHTML = entries.map(([type, count]) => {
            const d = KILL_DISPLAY[type] || { label: type.toUpperCase(), color: '#aaa' };
            return `<div class="kill-row">
                <span class="kill-label" style="color:${d.color}">${d.label}</span>
                <span class="kill-count">${count}</span>
            </div>`;
        }).join('');
    }

    _onImpact(dmg, type, target) {
        this.log(`⚠ IMPACT! ${MISSILE_TYPES[type]?.name || type} hit ${target || 'Qatar'} (-${dmg} HP)`, 'error');
        this._totalImpacts++;
        const key = type || 'unknown';
        this._impactCounts[key] = (this._impactCounts[key] || 0) + 1;
        this._updateHitBoard();
        const flash = this._flashEl || (this._flashEl = document.getElementById('screenFlash'));
        if (flash) { flash.style.opacity = '1'; setTimeout(() => { flash.style.opacity = '0'; }, 600); }
    }

    _updateHitBoard() {
        const el = this._els?.hitBoard || document.getElementById('hitBoard');
        if (!el) return;
        const entries = Object.entries(this._impactCounts).filter(([, v]) => v > 0);
        if (entries.length === 0) { el.innerHTML = '<div class="no-threats" style="color:#f8717188">No hits taken</div>'; return; }
        el.innerHTML = entries.map(([type, count]) => {
            const d = KILL_DISPLAY[type] || { label: type.toUpperCase(), color: '#f87171' };
            return `<div class="kill-row">
                <span class="kill-label" style="color:#f87171">${d.label}</span>
                <span class="kill-count" style="color:#f87171">${count}</span>
            </div>`;
        }).join('');
    }

    _onWave(n, count, types) {
        const unique = [...new Set(types)].join(', ');
        this.log(`── WAVE ${n}: ${count} missiles inbound [${unique}] ──`, 'wave');
        const el = this._waveAlertEl || (this._waveAlertEl = document.getElementById('waveAlert'));
        if (el) {
            el.textContent = `◈  WAVE ${n}  —  ${count} INBOUND  ◈`;
            el.classList.remove('hidden');
            el.classList.add('show');
            clearTimeout(this._waveTimer);
            this._waveTimer = setTimeout(() => { el.classList.remove('show'); el.classList.add('hidden'); }, 3800);
        }
    }

    _showGameOver(gs) {
        clearInterval(this._updateInterval);
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

        // High score (cookie)
        const score = gs.getScore();
        const isNewBest = score > this._highScore;
        if (isNewBest) {
            this._highScore = score;
            _setCookie('qad_hs', score);
        }
        const hsEl = document.getElementById('finalHighScore');
        if (hsEl) {
            hsEl.textContent = this._highScore.toLocaleString()
                + (isNewBest ? '  ★ NEW BEST!' : '');
            if (isNewBest) hsEl.style.color = '#fcd34d';
        }

        // Update XP metrics for rank (independent of score)
        this._gamesPlayed++;
        this._cumScore += score; // still track for display purposes only
        _setCookie('qad_gp', this._gamesPlayed);
        _setCookie('qad_cs', this._cumScore);

        // Accumulate kills, playtime, best streak
        const gameKills    = gs.getInterceptionsCount();
        const gamePlaytime = Math.round(this.game.getGameTime?.() || 0);
        const gameStreak   = this.game.getPeakStreak?.() || 0;
        this._totalKills    += gameKills;
        this._totalPlaytime += gamePlaytime;
        if (gameStreak > this._bestStreak) this._bestStreak = gameStreak;
        _setCookie('qad_tk', this._totalKills);
        _setCookie('qad_pt', this._totalPlaytime);
        _setCookie('qad_ks', this._bestStreak);

        const oldRank = this._currentRank;
        const newRepPoints = _computeRepPoints(this._totalKills, this._totalPlaytime, this._gamesPlayed, this._bestStreak, this._repPenalty);
        const newRank = _getRank(newRepPoints);
        const rankedUp = RANKS.indexOf(newRank) > RANKS.indexOf(oldRank);
        this._currentRank = newRank;
        this._applyRankDisplay(newRank);

        // Show rank-up in game over
        const rankUpEl = document.getElementById('finalRankUp');
        if (rankUpEl) {
            if (rankedUp) {
                rankUpEl.innerHTML = `<span style="color:#ffd700;font-size:1.1em">★ PROMOTION! ${oldRank.nameEn} → ${newRank.nameEn} (${newRank.nameAr})</span>`;
                rankUpEl.style.display = 'block';
            } else {
                rankUpEl.style.display = 'none';
            }
        }
        const finalRankEl = document.getElementById('finalRank');
        if (finalRankEl) {
            finalRankEl.innerHTML = `
                ${newRank.file ? `<img src="assets/Rank/${newRank.file}" style="height:36px;vertical-align:middle;margin-right:8px">` : ''}
                <span style="color:#ffd700">${newRank.nameEn}</span>
                <span style="color:#94a3b8;font-size:0.85em;margin-left:6px">${newRank.nameAr}</span>
                <span style="color:#64748b;font-size:0.75em;margin-left:8px">[${newRank.cat}]</span>
            `;
        }
        const finalCumEl = document.getElementById('finalCumScore');
        if (finalCumEl) finalCumEl.textContent = `RP: ${newRepPoints.toLocaleString()} (Kills:${this._totalKills} | ${Math.floor(this._totalPlaytime/60)}min | Streak:${this._bestStreak})`;
        const finalGamesEl = document.getElementById('finalGamesPlayed');
        if (finalGamesEl) finalGamesEl.textContent = this._gamesPlayed;

        // Show promotion screen after a short delay if ranked up
        if (rankedUp) {
            setTimeout(() => this._showPromotionScreen(oldRank, newRank), 800);
        }

        set('finalMoney', score.toLocaleString()); // score — no $ prefix
        set('finalInterceptions', gs.getInterceptionsCount());
        set('finalWaves', gs.getWaveCount());
        const ratio = this.game.getExchangeRatio?.();
        const ratioEl = document.getElementById('finalExchangeRatio');
        if (ratioEl) ratioEl.textContent = ratio !== null && ratio !== undefined ? ratio.toFixed(2) + 'x' : '—';

        // Kill counts breakdown
        const kcEl = document.getElementById('finalKillCounts');
        if (kcEl) {
            const entries = Object.entries(this._killCounts).filter(([, v]) => v > 0);
            kcEl.innerHTML = entries.length ? entries.map(([type, count]) => {
                const d = KILL_DISPLAY[type] || { label: type.toUpperCase(), color: '#aaa' };
                return `<span style="color:${d.color};margin-right:14px">${d.label}: <b>${count}</b></span>`;
            }).join('') : '';
        }

        // Hit total + breakdown
        const hitTotalEl = document.getElementById('finalHitTotal');
        if (hitTotalEl) hitTotalEl.textContent = this._totalImpacts;
        const hitEl = document.getElementById('finalHitCounts');
        if (hitEl) {
            const entries = Object.entries(this._impactCounts).filter(([, v]) => v > 0);
            hitEl.innerHTML = entries.length ? entries.map(([type, count]) => {
                const d = KILL_DISPLAY[type] || { label: type.toUpperCase(), color: '#f87171' };
                return `<span style="color:#f87171;margin-right:14px">${d.label}: <b>${count}</b></span>`;
            }).join('') : '<span style="color:#666">None</span>';
        }

        document.getElementById('gameOverScreen')?.classList.remove('hidden');
    }

    _onCivilianIncident() {
        // Pause game immediately
        this.game.pause?.();

        const currentIdx = RANKS.indexOf(this._currentRank);

        // Jundi (0) or Wakil Awwal (1) — civilian hit = immediate game over
        if (currentIdx <= 1) {
            this._showMinisterScreen(this._currentRank, this._currentRank, () => {
                // Force game over by draining all health
                this.game.gameState.health = 0;
                this.game.gameState.gameOver = true;
                this.game.resume?.(); // let the loop detect game over and call _showGameOver
            }, true /* isCourtMartial */);
            return;
        }

        // Compute 2-rank demotion
        const newIdx = Math.max(0, currentIdx - 2);
        const targetRank = RANKS[newIdx];
        const oldRank = this._currentRank;

        // Apply penalty: set penalty so effective repPoints floors at targetRank
        const currentRp = _computeRepPoints(this._totalKills, this._totalPlaytime, this._gamesPlayed, this._bestStreak, this._repPenalty);
        const needed = currentRp - targetRank.repPoints;
        if (needed > 0) this._repPenalty += needed;
        _setCookie('qad_rkp', this._repPenalty);
        this._currentRank = targetRank;
        this._applyRankDisplay(targetRank);

        this._showMinisterScreen(oldRank, targetRank, () => {
            this.game.resume?.();
        });
    }

    _showMinisterScreen(oldRank, newRank, doneCb, isCourtMartial = false) {
        const overlay = document.getElementById('ministerOverlay');
        if (!overlay) { doneCb(); return; }

        // Dynamic text areas
        const headlineEl = document.getElementById('ministerHeadline');
        const bodyEl = document.getElementById('ministerBody');
        const rankLabelEl = document.getElementById('ministerRankLabel');

        if (isCourtMartial) {
            if (headlineEl) headlineEl.textContent = '⚠ COURT MARTIAL — DISHONORABLE DISCHARGE';
            if (bodyEl) bodyEl.innerHTML = `You hold the lowest rank in the Qatar Armed Forces and you have destroyed a civilian aircraft.<br><br>
                There is no further demotion possible. Your service record is permanently dishonored.
                <br><br><strong style="color:#dc2626">MISSION FAILED — GAME OVER</strong>`;
            if (rankLabelEl) rankLabelEl.textContent = 'DISHONORABLE DISCHARGE';
        } else {
            if (headlineEl) headlineEl.textContent = '⚠ OFFICIAL COMMUNIQUÉ';
            if (bodyEl) bodyEl.innerHTML = `The State of Qatar takes the accidental shootdown of civilian aircraft with the utmost
                seriousness. Your actions have cost the lives of innocent civilians and brought the
                country significant international embarrassment.<br><br>
                The Ministry of Defense has reviewed the incident and determined that disciplinary
                action is warranted. Effective immediately, your rank has been reduced.`;
            if (rankLabelEl) rankLabelEl.textContent = 'RANK REDUCTION — EFFECTIVE IMMEDIATELY';
        }

        // Populate rank names
        const oldEl = overlay.querySelector('#ministerOldRank');
        const newEl = overlay.querySelector('#ministerNewRank');
        if (oldEl) oldEl.innerHTML = `
            ${oldRank.file ? `<img src="assets/Rank/${oldRank.file}" style="height:40px;vertical-align:middle;margin-right:8px;opacity:0.5">` : ''}
            <span style="text-decoration:line-through;color:#ef4444">${oldRank.nameEn}</span>
            <span style="color:#64748b;font-size:0.8em;margin-left:6px">${oldRank.nameAr}</span>`;
        if (newEl) newEl.innerHTML = `
            ${newRank.file ? `<img src="assets/Rank/${newRank.file}" style="height:40px;vertical-align:middle;margin-right:8px">` : ''}
            <span style="color:#ffd700">${newRank.nameEn}</span>
            <span style="color:#94a3b8;font-size:0.8em;margin-left:6px">${newRank.nameAr}</span>`;
        overlay.style.display = 'flex';

        const ackBtnOrig = document.getElementById('ministerAckBtn');
        if (ackBtnOrig) {
            const newAck = ackBtnOrig.cloneNode(true);
            newAck.textContent = isCourtMartial ? 'ACCEPT CONSEQUENCES' : 'I ACKNOWLEDGE MY FAILURE';
            ackBtnOrig.parentNode.replaceChild(newAck, ackBtnOrig);
            newAck.addEventListener('click', () => {
                overlay.style.display = 'none';
                doneCb();
            }, { once: true });
        }
    }

    _showPromotionScreen(oldRank, newRank) {
        const overlay = document.getElementById('promotionOverlay');
        if (!overlay) return;
        const newInsEl = overlay.querySelector('#promoNewInsignia');
        const newNameEl = overlay.querySelector('#promoNewName');
        const newArEl = overlay.querySelector('#promoNewAr');
        const newCatEl = overlay.querySelector('#promoNewCat');
        const oldNameEl = overlay.querySelector('#promoOldName');
        if (newInsEl) {
            if (newRank.file) { newInsEl.src = `assets/Rank/${newRank.file}`; newInsEl.style.display = 'block'; }
            else newInsEl.style.display = 'none';
        }
        if (newNameEl) newNameEl.textContent = newRank.nameEn.toUpperCase();
        if (newArEl)   newArEl.textContent   = newRank.nameAr;
        if (newCatEl)  newCatEl.textContent  = newRank.cat;
        if (oldNameEl) oldNameEl.textContent = oldRank.nameEn;
        overlay.style.display = 'flex';

        const contBtn = document.getElementById('promoContinueBtn');
        if (contBtn) {
            const newBtn = contBtn.cloneNode(true);
            contBtn.parentNode.replaceChild(newBtn, contBtn);
            document.getElementById('promoContinueBtn').addEventListener('click', () => {
                overlay.style.display = 'none';
            }, { once: true });
        }
    }

    log(msg, type = 'info') {
        const log = this._statusLog || (this._statusLog = document.getElementById('statusLog'));
        if (!log) return;
        const el = document.createElement('div');
        el.className = `status-msg status-${type}`;
        const t = new Date();
        const ts = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}:${String(t.getSeconds()).padStart(2,'0')}`;
        el.textContent = `[${ts}] ${msg}`;
        log.appendChild(el);
        while (log.children.length > 7) log.removeChild(log.firstChild);
        log.scrollTop = log.scrollHeight;
    }
}
