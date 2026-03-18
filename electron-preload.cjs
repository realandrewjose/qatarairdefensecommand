const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const userDataPath = (() => {
    try {
        return ipcRenderer.sendSync('qad:get-user-data-path');
    } catch {
        return null;
    }
})();

const storeFile = userDataPath
    ? path.join(userDataPath, 'career-data.json')
    : null;

let cache = null;

function loadStore() {
    if (cache) return cache;
    cache = {};
    if (!storeFile) return cache;

    try {
        if (fs.existsSync(storeFile)) {
            const raw = fs.readFileSync(storeFile, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                cache = parsed;
            }
        }
    } catch {
        cache = {};
    }

    return cache;
}

function saveStore() {
    if (!storeFile || !cache) return false;

    try {
        fs.mkdirSync(path.dirname(storeFile), { recursive: true });
        fs.writeFileSync(storeFile, JSON.stringify(cache, null, 2), 'utf8');
        return true;
    } catch {
        return false;
    }
}

contextBridge.exposeInMainWorld('qadStorage', {
    isAvailable: !!storeFile,
    get(key) {
        const store = loadStore();
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    set(key, value) {
        const store = loadStore();
        store[key] = String(value);
        return saveStore();
    },
    remove(key) {
        const store = loadStore();
        delete store[key];
        return saveStore();
    },
    clear() {
        cache = {};
        return saveStore();
    },
    getStoreFileName() {
        return storeFile;
    },
});