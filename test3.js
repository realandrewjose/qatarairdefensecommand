'use strict';
// In Electron 28+, main process APIs may need to be accessed differently
const electronKeys = Object.keys(process).filter(k => k.includes('electron') || k.includes('Electron'));
console.log('electron-related process keys:', electronKeys);

// Try accessing via internal binding
try {
    const b = process._linkedBinding('electron_browser_app');
    console.log('linked binding app:', typeof b);
} catch(e) {
    console.log('_linkedBinding failed:', e.message.slice(0,80));
}

// Check if app is a global
console.log('global.app:', typeof global.app);
console.log('global.electron:', typeof global.electron);

// Check process.mainModule
console.log('process.mainModule:', typeof process.mainModule);

process.exit(0);
