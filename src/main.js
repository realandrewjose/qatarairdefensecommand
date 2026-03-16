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

// Start screen
const startScreen = document.getElementById('startScreen');
if (startScreen) {
    const begin = () => {
        startScreen.classList.add('fade-out');
        setTimeout(() => { startScreen.classList.add('hidden'); }, 600);
        sound.resume();
        game.start();
        sound.speak('Qatar Air Defense System activated. Defend the homeland.');
    };
    document.getElementById('beginBtn')?.addEventListener('click', begin);
} else {
    game.start();
}

console.log('Qatar Air Defense v2.0 — initialized');
