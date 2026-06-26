// js/sync.js — Firebase Cross-Device Sync Module
// No auth required — uses open rules on Traker/ path
// Exposes window.syncManager

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, off } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyA8cBy7JNEhAuucBHwTOsYZc_EkW3wOa-c",
    authDomain: "tracker-507c0.firebaseapp.com",
    databaseURL: "https://tracker-507c0-default-rtdb.firebaseio.com",
    projectId: "tracker-507c0",
    storageBucket: "tracker-507c0.firebasestorage.app",
    messagingSenderId: "778650100212",
    appId: "1:778650100212:web:e15098f4410c6e2a5d99a1",
    measurementId: "G-MZH4N8E32M"
};

const SYNC_PIN_KEY = 'azkar_sync_pin';

let db = null;
let currentPin = null;
let activeListenerRef = null;
let isSyncingFromRemote = false;
let onChangeCallback = null;

// ─── Init Firebase (no auth needed) ──────────────────────────────────────────

function initFirebase() {
    if (!db) {
        try {
            const app = initializeApp(firebaseConfig);
            db = getDatabase(app);
            console.log('[Sync] Firebase initialized ✅');
        } catch (e) {
            console.error('[Sync] Firebase init failed:', e.message);
            throw e;
        }
    }
    return db;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generatePin() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pin = 'AZK-';
    for (let i = 0; i < 5; i++) {
        pin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pin;
}

// ─── Listener ────────────────────────────────────────────────────────────────

function startListening(pin) {
    if (activeListenerRef) {
        off(activeListenerRef);
        activeListenerRef = null;
    }
    const dataRef = ref(db, `Traker/${pin}/data`);
    activeListenerRef = dataRef;

    onValue(dataRef, (snapshot) => {
        if (isSyncingFromRemote) return;
        const remoteData = snapshot.val();
        if (remoteData && onChangeCallback) {
            isSyncingFromRemote = true;
            onChangeCallback(remoteData);
            isSyncingFromRemote = false;
        }
    }, (error) => {
        console.error('[Sync] Listener error:', error.message);
    });
}

// ─── Public API ──────────────────────────────────────────────────────────────

async function createPin() {
    initFirebase();
    const pin = generatePin();
    const currentData = window.store ? window.store.data : null;

    try {
        await set(ref(db, `Traker/${pin}`), {
            data: currentData,
            createdAt: Date.now(),
            lastUpdated: Date.now()
        });
        console.log('[Sync] PIN created & data saved to Firebase ✅:', pin);
    } catch (e) {
        console.error('[Sync] Failed to write to Firebase:', e.message);
        throw new Error('Could not save to Firebase. Check database rules (allow read/write = true).');
    }

    currentPin = pin;
    localStorage.setItem(SYNC_PIN_KEY, pin);
    startListening(pin);
    return pin;
}

async function linkPin(pin) {
    pin = pin.trim().toUpperCase();
    if (!pin) throw new Error('Please enter a PIN.');
    initFirebase();

    let snapshot;
    try {
        snapshot = await get(ref(db, `Traker/${pin}`));
    } catch (e) {
        console.error('[Sync] Failed to read from Firebase:', e.message);
        throw new Error('Could not connect to Firebase. Check database rules.');
    }

    if (!snapshot.exists()) {
        throw new Error('PIN not found. Please check and try again.');
    }

    const remoteData = snapshot.val().data;
    if (remoteData && window.store) {
        isSyncingFromRemote = true;
        window.store.data = {
            settings: {
                ...window.store.data.settings,
                ...remoteData.settings,
                theme: window.store.data.settings.theme
            },
            stats: { ...window.store.data.stats, ...remoteData.stats },
            today: { ...window.store.data.today, ...remoteData.today }
        };
        localStorage.setItem('azkar_companion_data', JSON.stringify(window.store.data));
        window.dispatchEvent(new Event('storeUpdated'));
        isSyncingFromRemote = false;
    }

    currentPin = pin;
    localStorage.setItem(SYNC_PIN_KEY, pin);
    startListening(pin);
    console.log('[Sync] Linked to PIN ✅:', pin);
    return pin;
}

async function pushData(data) {
    if (!currentPin || isSyncingFromRemote || !db) return;
    try {
        await set(ref(db, `Traker/${currentPin}`), {
            data: data,
            lastUpdated: Date.now()
        });
        console.log('[Sync] Data pushed to Firebase ✅');
    } catch (e) {
        console.error('[Sync] Push failed ❌:', e.message);
    }
}

function unlinkPin() {
    if (activeListenerRef) {
        off(activeListenerRef);
        activeListenerRef = null;
    }
    currentPin = null;
    localStorage.removeItem(SYNC_PIN_KEY);
    console.log('[Sync] Device unlinked');
}

function getStoredPin() {
    return localStorage.getItem(SYNC_PIN_KEY);
}

function isLinked() {
    return currentPin !== null;
}

function onRemoteChange(callback) {
    onChangeCallback = callback;
}

async function initSync() {
    const storedPin = getStoredPin();
    if (storedPin) {
        try {
            initFirebase();
            currentPin = storedPin;
            startListening(storedPin);
            console.log('[Sync] Restored sync for PIN:', storedPin);
            return storedPin;
        } catch (e) {
            console.error('[Sync] Failed to restore sync:', e.message);
        }
    }
    return null;
}

// ─── Expose globally ─────────────────────────────────────────────────────────

window.syncManager = {
    createPin,
    linkPin,
    unlinkPin,
    pushData,
    getStoredPin,
    isLinked,
    onRemoteChange,
    initSync,
    getCurrentPin: () => currentPin
};

console.log('[Sync] sync.js loaded ✅');
