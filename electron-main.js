// Electron main process — Qatar Air Defense Command
'use strict';
const { app, BrowserWindow, Menu, shell, protocol, net } = require('electron');
const path = require('path');
const fs   = require('fs');
const { pathToFileURL } = require('url');

// ── Must be called BEFORE app.whenReady() ─────────────────────────────────────
// Register 'game://' as a secure, standard-origin scheme so that:
//   • ES module imports resolve correctly
//   • fetch() works within the renderer
//   • Web Audio API / AudioContext work without autoplay restrictions
//   • localStorage / sessionStorage are available
protocol.registerSchemesAsPrivileged([{
    scheme: 'game',
    privileges: {
        standard:        true,   // behaves like http — relative URLs resolve normally
        secure:          true,   // treated as a secure context (needed for Web Audio, etc.)
        supportFetchAPI: true,   // fetch() works inside the renderer
        corsEnabled:     true,   // no CORS blocking for same-scheme requests
        stream:          true,   // enables streaming (large audio/video files)
    },
}]);

// Allow audio/video autoplay without requiring a prior user gesture
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Keep a global reference so the window is not garbage-collected
let mainWindow;

// ── Game protocol handler ─────────────────────────────────────────────────────
// Maps  game://app/<relative-path>  →  <project-root>/<relative-path>
function registerGameProtocol() {
    const root = __dirname;

    protocol.handle('game', (request) => {
        const url  = new URL(request.url);
        // url.pathname = '/index.html' or '/assets/sounds/foo.mp3', etc.
        let rel = url.pathname;
        if (rel.startsWith('/')) rel = rel.slice(1);
        rel = decodeURIComponent(rel);

        // Safety: prevent directory traversal
        const filePath = path.resolve(root, rel);
        if (!filePath.startsWith(root)) {
            return new Response('Forbidden', { status: 403 });
        }

        if (!fs.existsSync(filePath)) {
            return new Response('Not Found', { status: 404 });
        }

        // Use net.fetch with file:// so Electron handles MIME types automatically
        return net.fetch(pathToFileURL(filePath).toString());
    });
}

// ── Main window ───────────────────────────────────────────────────────────────
function createWindow() {
    mainWindow = new BrowserWindow({
        width:  1400,
        height: 900,
        minWidth:  1024,
        minHeight: 700,
        title: 'Qatar Air Defense Command',
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        backgroundColor: '#07090f',
        show: false,
        webPreferences: {
            nodeIntegration:            false,
            contextIsolation:           true,
            webSecurity:                true,
            allowRunningInsecureContent: false,
        },
    });

    // Load via game:// so all relative asset paths resolve under the same origin
    mainWindow.loadURL('game://app/index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.maximize();
        mainWindow.focus();
    });

    mainWindow.on('closed', () => { mainWindow = null; });

    // Open external links in system browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

// ── Application menu ──────────────────────────────────────────────────────────
function buildMenu() {
    const template = [
        {
            label: 'Game',
            submenu: [
                {
                    label: 'Toggle Fullscreen',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Ctrl+F' : 'F11',
                    click() { mainWindow?.setFullScreen(!mainWindow.isFullScreen()); },
                },
                { type: 'separator' },
                { role: 'quit', label: 'Quit' },
            ],
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload',      label: 'Restart Game' },
                { role: 'forceReload', label: 'Force Restart' },
                { type: 'separator' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { role: 'resetZoom' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
            ],
        },
        {
            label: 'Audio',
            submenu: [
                {
                    label: 'Mute / Unmute SFX',
                    accelerator: 'M',
                    click() { mainWindow?.webContents.executeJavaScript('window._soundMgr?.toggleSound()'); },
                },
                {
                    label: 'Mute / Unmute Music',
                    accelerator: 'Shift+M',
                    click() { mainWindow?.webContents.executeJavaScript('window._soundMgr?.toggleMusic()'); },
                },
                {
                    label: 'Mute / Unmute Voice',
                    accelerator: 'V',
                    click() { mainWindow?.webContents.executeJavaScript('window._soundMgr?.toggleVoice()'); },
                },
            ],
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Toggle DevTools',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Alt+I' : 'Ctrl+Shift+I',
                    click() { mainWindow?.webContents.toggleDevTools(); },
                },
            ],
        },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
    registerGameProtocol(); // must come before createWindow
    buildMenu();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
