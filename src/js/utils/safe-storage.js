const memoryStore = new Map();

function hasLocalStorage() {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return false;
        const testKey = '__nometa_storage_test__';
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
}

export function storageGetItem(key) {
    try {
        if (hasLocalStorage()) return window.localStorage.getItem(key);
    } catch {
        // Fall back to in-memory storage
    }
    return memoryStore.has(key) ? memoryStore.get(key) : null;
}

export function storageSetItem(key, value) {
    const normalized = String(value);
    try {
        if (hasLocalStorage()) {
            window.localStorage.setItem(key, normalized);
            return;
        }
    } catch {
        // Fall back to in-memory storage
    }
    memoryStore.set(key, normalized);
}

export function storageRemoveItem(key) {
    try {
        if (hasLocalStorage()) {
            window.localStorage.removeItem(key);
        }
    } catch {
        // Ignore and continue to memory store cleanup
    }
    memoryStore.delete(key);
}
