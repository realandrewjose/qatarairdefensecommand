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


    // ── Loading bar elements ───────────────────────────────────────────────
    const loadingBar = document.getElementById('loadingBar');
    const lbl = document.getElementById('loadLabel');
    const bar = document.getElementById('loadFill');
    const pct = document.getElementById('loadCount');

    // ── Pseudo progress bar — CSS transition drives exactly 10s fill ────────
    const TOTAL_MS = 10000;
    const LABELS = [
        { ms:    0, text: '◈ INITIALIZING RADAR SYSTEMS…'  },
        { ms: 2000, text: '◈ LOADING WEAPON SYSTEMS…'       },
        { ms: 4000, text: '◈ CALIBRATING DEFENSE GRID…'     },
        { ms: 5800, text: '◈ SYNCING THREAT DATABASE…'      },
        { ms: 7400, text: '◈ ARMING INTERCEPTORS…'          },
        { ms: 8800, text: '◈ ESTABLISHING COMMAND LINK…'    },
        { ms: 9700, text: '◈ DEFENSE SYSTEMS READY'         },
    ];

    if (bar) {
        bar.style.transition = `width ${TOTAL_MS}ms linear`;
        bar.getBoundingClientRect(); // force reflow so transition starts from 0%
        bar.style.width = '100%';
    }

    LABELS.forEach(({ ms, text }) => {
        setTimeout(() => { if (lbl) lbl.textContent = text; }, ms);
    });

    for (let p = 0; p <= 100; p++) {
        setTimeout(() => { if (pct) pct.textContent = `${p}%`; }, TOTAL_MS * p / 100);
    }

    setTimeout(() => {
        if (bar) bar.style.background = 'linear-gradient(90deg,#065f46,#10b981,#34d399)';
        if (beginBtn) { beginBtn.disabled = false; beginBtn.textContent = '▶ ACTIVATE DEFENSE SYSTEM'; }
        if (loadingBar) setTimeout(() => { loadingBar.style.opacity = '0'; }, 1600);
    }, TOTAL_MS);

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
