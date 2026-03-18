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

    // ── Loading bar (static HTML elements in index.html) ──────────────────
    const loadingBar = document.getElementById('loadingBar');
    const lbl = document.getElementById('loadLabel');
    const bar = document.getElementById('loadFill');
    const pct = document.getElementById('loadCount');

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
        { src: 'assets/sounds/Mowashem.mp3',                       label: 'Kill Voice 5' },
        { src: 'assets/sounds/Kamel.mp3',                          label: 'Kill Voice 6' },
        { src: 'assets/sounds/Destroyed.mp3',                      label: 'Kill Voice 7' },
        { src: 'assets/sounds/AlHamdulilah.mp3',                   label: 'Kill Voice 8' },
        { src: 'assets/sounds/YaWatan.mp3',                        label: 'Kill Voice 9' },
        { src: 'assets/sounds/TargetDestroyedCalloutVoice.mp3',    label: 'Kill Voice 10' },
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

    const total = ASSETS.length;
    let loadedCount = 0;
    let unlocked = false;

    function assetLoaded(label) {
        if (unlocked) return;
        loadedCount++;
        const pct100 = ((loadedCount / total) * 100).toFixed(1);
        if (bar) bar.style.width = `${pct100}%`;
        if (pct) pct.textContent = `${loadedCount} / ${total}`;
        if (lbl) lbl.textContent = `◈ LOADING: ${label}`;
        if (loadedCount >= total) unlock();
    }

    function unlock() {
        if (unlocked) return;
        unlocked = true;
        if (lbl) lbl.textContent  = '◈ DEFENSE SYSTEMS READY';
        if (bar) { bar.style.background = 'linear-gradient(90deg,#065f46,#10b981,#34d399)'; bar.style.width = '100%'; }
        if (pct) pct.textContent  = `${total} / ${total}`;
        if (beginBtn) { beginBtn.disabled = false; beginBtn.textContent = '▶ ACTIVATE DEFENSE SYSTEM'; }
        if (loadingBar) setTimeout(() => { loadingBar.style.opacity = '0'; }, 1400);
    }

    // Show initial count
    if (pct) pct.textContent = `0 / ${total}`;
    if (bar) bar.style.width = '0%';

    for (const asset of ASSETS) {
        if (asset.img) {
            // Images: use Image element — onload/onerror reliably fire
            const img = new Image();
            img.onload  = () => assetLoaded(asset.label);
            img.onerror = () => assetLoaded(asset.label);
            img.src = asset.src;
        } else {
            // Audio: fetch() fully downloads the file — always resolves, no browser quirks
            fetch(asset.src)
                .then(r => r.arrayBuffer())
                .then(() => assetLoaded(asset.label))
                .catch(() => assetLoaded(asset.label));
        }
    }

    // Video plays ambient in background — does NOT gate the button
    if (vid) {
        vid.loop = true;
        vid.play().catch(() => {});
    }

    // ── Begin button ────────────────────────────────────────────────────────
    const startGame = () => {
        startScreen.classList.add('fade-out');
        setTimeout(() => { startScreen.classList.add('hidden'); }, 600);
        sound.resume();
        game.start();
        sound.speak('Qatar Air Defense System activated. Defend the homeland.');
    };

    beginBtn?.addEventListener('click', () => {
        const fsPrompt = document.getElementById('fsPrompt');
        if (!fsPrompt) { startGame(); return; }

        fsPrompt.style.display = 'block';

        const closePrompt = () => {
            fsPrompt.style.display = 'none';
            startGame();
        };
        document.getElementById('fsPromptClose')?.addEventListener('click', closePrompt, { once: true });
        document.getElementById('fsPromptNo')?.addEventListener('click', closePrompt, { once: true });
        document.getElementById('fsPromptYes')?.addEventListener('click', () => {
            document.documentElement.requestFullscreen().catch(() => {});
            closePrompt();
        }, { once: true });
    }, { once: true });

} else {
    game.start();
}

console.log('Qatar Air Defense v2.0 — initialized');
