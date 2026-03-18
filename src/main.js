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

    // ── Pseudo progress bar — animates to 100% then unlocks button ──────────
    const PHASES = [
        { label: '◈ INITIALIZING RADAR SYSTEMS…',      target: 18,  delay: 120 },
        { label: '◈ LOADING WEAPON SYSTEMS…',           target: 38,  delay: 90  },
        { label: '◈ CALIBRATING DEFENSE GRID…',         target: 55,  delay: 80  },
        { label: '◈ SYNCING THREAT DATABASE…',          target: 72,  delay: 70  },
        { label: '◈ ARMING INTERCEPTORS…',              target: 85,  delay: 60  },
        { label: '◈ ESTABLISHING COMMAND LINK…',        target: 95,  delay: 50  },
        { label: '◈ DEFENSE SYSTEMS READY',             target: 100, delay: 40  },
    ];

    let current = 0;
    let phaseIdx = 0;

    function tick() {
        if (phaseIdx >= PHASES.length) return;
        const phase = PHASES[phaseIdx];
        if (current < phase.target) {
            current++;
            if (bar) bar.style.width = `${current}%`;
            if (pct) pct.textContent = `${current}%`;
            if (lbl) lbl.textContent = phase.label;
            setTimeout(tick, phase.delay);
        } else {
            phaseIdx++;
            if (phaseIdx < PHASES.length) {
                setTimeout(tick, 120);
            } else {
                // Done — unlock
                if (bar) bar.style.background = 'linear-gradient(90deg,#065f46,#10b981,#34d399)';
                if (beginBtn) { beginBtn.disabled = false; beginBtn.textContent = '▶ ACTIVATE DEFENSE SYSTEM'; }
                if (loadingBar) setTimeout(() => { loadingBar.style.opacity = '0'; }, 1600);
            }
        }
    }

    setTimeout(tick, 300);

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
