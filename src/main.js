import { Game } from './game/Game.js';
import { InputHandler } from './input/InputHandler.js';
import { UIManager } from './ui/UIManager.js';
import { SoundManager } from './audio/SoundManager.js';

const canvas = document.getElementById('radarCanvas');

// Measure HUD elements that overlay the canvas so the radar fits the free area exactly
function getHudInsets() {
    const topBar  = document.querySelector('.hud-top');
    const btmBar  = document.querySelector('.hud-bottom');
    const leftPnl = document.querySelector('.panel-left');
    const rightPnl= document.querySelector('.panel-right');
    return {
        top:   topBar   ? topBar.offsetHeight   : 58,
        btm:   btmBar   ? btmBar.offsetHeight   : 58,
        left:  leftPnl  ? leftPnl.offsetWidth   : 230,
        right: rightPnl ? rightPnl.offsetWidth  : 230,
    };
}

function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();

const sound = new SoundManager();
const game  = new Game(canvas, sound);
const input = new InputHandler(canvas, game, sound);
const ui    = new UIManager(game, input, sound);

// Expose sound manager for Electron menu bar controls
window._soundMgr = sound;

// Initial radar fit — defer one frame so DOM has rendered and panel heights are known
requestAnimationFrame(() => {
    resizeCanvas();
    game.resize(canvas.width, canvas.height, getHudInsets());
});

window.addEventListener('resize', () => {
    resizeCanvas();
    game.resize(canvas.width, canvas.height, getHudInsets());
});

// ── Start Screen ─────────────────────────────────────────────────────────────
const startScreen = document.getElementById('startScreen');
if (startScreen) {
    const beginBtn = document.getElementById('beginBtn');
    const vid      = document.getElementById('openingVideo');

    // ── Loading overlay (injected over the video) ──────────────────────────
    const overlay = document.createElement('div');
    overlay.style.cssText = [
        'position:absolute;bottom:0;left:0;right:0;z-index:11;',
        'padding:18px 28px 26px;',
        'background:linear-gradient(transparent,rgba(0,0,0,0.88));',
        'pointer-events:none;',
        'transition:opacity 0.6s ease',
    ].join('');
    overlay.innerHTML = `
        <div id="_loadLbl" style="
            color:#64748b;font-family:monospace;font-size:0.70em;
            letter-spacing:1.8px;margin-bottom:9px;text-transform:uppercase;
            text-shadow:0 0 8px rgba(59,130,246,0.4)">
            ◈ INITIALIZING SYSTEMS…
        </div>
        <div style="background:rgba(255,255,255,0.06);border-radius:3px;
                    height:4px;overflow:hidden;box-shadow:0 0 10px rgba(59,130,246,0.2)">
            <div id="_loadBar" style="
                height:100%;width:0%;
                background:linear-gradient(90deg,#1e40af,#3b82f6);
                transition:width 0.20s linear"></div>
        </div>
        <div id="_loadPct" style="
            color:#334155;font-family:monospace;font-size:0.60em;
            letter-spacing:1px;margin-top:5px;text-align:right">0%</div>
    `;
    startScreen.appendChild(overlay);

    const lbl = overlay.querySelector('#_loadLbl');
    const bar = overlay.querySelector('#_loadBar');
    const pct = overlay.querySelector('#_loadPct');

    // ── State flags ────────────────────────────────────────────────────────
    let videoLoopDone   = false;
    let allAssetsLoaded = false;

    function tryUnlock() {
        if (!videoLoopDone || !allAssetsLoaded) return;
        lbl.textContent = '◈ DEFENSE SYSTEMS READY';
        bar.style.background = 'linear-gradient(90deg,#065f46,#10b981)';
        bar.style.width      = '100%';
        pct.textContent      = '100%';
        beginBtn.disabled    = false;
        beginBtn.textContent = '▶ ACTIVATE DEFENSE SYSTEM';
        setTimeout(() => { overlay.style.opacity = '0'; }, 1200);
    }

    // ── Video-driven progress bar ──────────────────────────────────────────
    // Remove `loop` so `ended` fires exactly once, then re-enable loop.
    if (vid) {
        vid.removeAttribute('loop');
        vid.addEventListener('timeupdate', () => {
            if (videoLoopDone) return;
            const progress = vid.duration > 0 ? vid.currentTime / vid.duration : 0;
            bar.style.width  = `${(progress * 100).toFixed(1)}%`;
            pct.textContent  = `${Math.round(progress * 100)}%`;
        });
        vid.addEventListener('ended', () => {
            videoLoopDone = true;
            // Resume looping for ambient background
            vid.loop = true;
            vid.play().catch(() => {});
            tryUnlock();
        });
        // Safety: if video never loads/plays, unlock after 12 s
        setTimeout(() => { if (!videoLoopDone) { videoLoopDone = true; tryUnlock(); } }, 12000);
    } else {
        videoLoopDone = true;
    }

    // ── Asset preloading ───────────────────────────────────────────────────
    const M = 'assets/sounds/Music/';
    const ASSETS = [
        // SFX
        { src: 'assets/sounds/AirRaidSiren.mp3',                  label: 'Air Raid Siren' },
        { src: 'assets/sounds/MissileAlert.mp3',                   label: 'Missile Alert' },
        { src: 'assets/sounds/Explosion.mp3',                      label: 'Explosion SFX' },
        { src: 'assets/sounds/InterceptionExplosion.mp3',          label: 'Intercept Explosion' },
        { src: 'assets/sounds/Target Destroyed.mp3',               label: 'Target Destroyed' },
        { src: 'assets/sounds/Sound Effect - Missile Launch.mp3',  label: 'Launch SFX' },
        { src: 'assets/sounds/C-RAM.mp3',                          label: 'C-RAM Fire' },
        { src: 'assets/sounds/C-RAMOpening.mp3',                   label: 'C-RAM Spin-Up' },
        { src: 'assets/sounds/AllahUAkbaralt.mp3',                 label: 'Kill Voice 1' },
        { src: 'assets/sounds/Confirm Kill.mp3',                   label: 'Kill Voice 2' },
        { src: 'assets/sounds/Haihoom.mp3',                        label: 'Kill Voice 3' },
        { src: 'assets/sounds/Allah U Akbar.m4a',                  label: 'Kill Voice 4' },
        // Music
        { src: M + 'الآدعم.mp3',                                   label: 'Music: الآدعم' },
        { src: M + 'أبشري يا دار  اخو روضة بنا _ كلمات_ محمد الصلابي.mp3',                                                        label: 'Music: أبشري يا دار' },
        { src: M + 'أغنية_ حنا لها - كلمات_ فالح العجلان الهاجري - الحان_ عبدالله المناعي.mp3',                                    label: 'Music: أغنية حنا لها' },
        { src: M + 'حنا بخير وديرة العز في خير - قطر_  تميم المجد 2017.mp3',                                                       label: 'Music: حنا بخير' },
        { src: M + 'حنا هلك حنا هلك  نحمي جبالك وسهلك والمعنوية عاليه.mp3',                                                       label: 'Music: حنا هلك' },
        { src: M + 'دار السعد - كلمات _ متعب ال سليمان المري -ألحان _ عبدالله المناعي - أداء _ المجموعه.mp3',                      label: 'Music: دار السعد' },
        { src: M + 'زلزال -  فهد الحجاجي.mp3',                    label: 'Music: زلزال' },
        { src: M + 'شربة الفنجان غناء _ فهد الحجاجي   كلمات _ خالد البوعينين   الحان _ حسن حامد.mp3',                             label: 'Music: شربة الفنجان' },
        { src: M + 'شيلة نحبك ياتميم _ كلمات محمد النمران _ اداء خالد الشليه.mp3',                                                label: 'Music: نحبك ياتميم' },
        { src: M + 'طرق خشوم (لطامة العايل) - فهد الحجاجي.mp3',   label: 'Music: طرق خشوم' },
        { src: M + 'عـرضة مقـدام.mp3',                            label: 'Music: عرضة مقدام' },
        { src: M + 'عيدي يا بلادي [ مبروك 2030 ] - كلمات  خليل الشبرمي - تطوير  غانم شاهين - غناء  المجموعة  ( حصري ).mp3',      label: 'Music: عيدي يا بلادي' },
        { src: M + 'كلنا لك يا قطر سمعا وطاعه ( أسود تميم )   حصري.mp3',                                                          label: 'Music: كلنا لك يا قطر' },
        { src: M + 'مراسم رفع علم دولة قطر على سفينة الزبارة في ايطاليا.mp3',                                                      label: 'Music: مراسم رفع علم' },
        { src: M + 'يارباه __ كلمات خليل الشبرمي __ أداء عبدالعزيز العليوي.mp3',                                                   label: 'Music: يارباه' },
        { src: M + 'يامطوعين الصعايب __ كلمات _ خليل الشبرمي __ أداء _ عبدالعزيز العليوي.mp3',                                     label: 'Music: يامطوعين الصعايب' },
        // Images
        { src: 'assets/images/Avatar.png',       label: 'Avatar', img: true },
        { src: 'assets/images/QatarOutline.svg', label: 'Qatar Map', img: true },
        { src: 'assets/images/qa.svg',           label: 'Qatar Flag', img: true },
    ];

    let loadedCount = 0;

    function assetLoaded(label) {
        loadedCount++;
        lbl.textContent = `◈ LOADED: ${label}`;
        if (loadedCount >= ASSETS.length) {
            allAssetsLoaded = true;
            tryUnlock();
        }
    }

    for (const asset of ASSETS) {
        if (asset.img) {
            const img = new Image();
            img.onload = img.onerror = () => assetLoaded(asset.label);
            img.src = asset.src;
        } else {
            const a = new Audio();
            a.addEventListener('canplaythrough', () => assetLoaded(asset.label), { once: true });
            a.addEventListener('error',          () => assetLoaded(asset.label), { once: true });
            a.src = asset.src;
            a.load();
        }
    }

    // ── Begin button ────────────────────────────────────────────────────────
    const begin = () => {
        startScreen.classList.add('fade-out');
        setTimeout(() => { startScreen.classList.add('hidden'); }, 600);
        sound.resume();
        game.start();
        sound.speak('Qatar Air Defense System activated. Defend the homeland.');
    };
    beginBtn?.addEventListener('click', begin);

} else {
    game.start();
}

console.log('Qatar Air Defense v2.0 — initialized');
