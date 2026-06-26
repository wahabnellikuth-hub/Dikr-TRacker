// js/sync.js — Firebase Cross-Device Sync Module
// Exposes window.syncManager for use by store.js and app.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
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

let firebaseApp, auth, db;
let currentPin = null;
let activeListenerRef = null;
let isSyncingFromRemote = false;
let onChangeCallback = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generatePin() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pin = 'AZK-';
    for (let i = 0; i < 5; i++) {
        pin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pin;
}

async function initFirebase() {
    if (!firebaseApp) {
        firebaseApp = initializeApp(firebaseConfig);
        auth = getAuth(firebaseApp);
        db = getDatabase(firebaseApp);
    }
    if (!auth.currentUser) {
        await signInAnonymously(auth);
    }
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
    });
}

// ─── Public API ──────────────────────────────────────────────────────────────

async function createPin() {
    await initFirebase();
    const pin = generatePin();

    const currentData = window.store ? window.store.data : null;
    await set(ref(db, `Traker/${pin}`), {
        data: currentData,
        createdAt: Date.now(),
        lastUpdated: Date.now()
    });

    currentPin = pin;
    localStorage.setItem(SYNC_PIN_KEY, pin);
    startListening(pin);
    return pin;
}

async function linkPin(pin) {
    pin = pin.trim().toUpperCase();
    if (!pin) throw new Error('Please enter a PIN.');

    await initFirebase();

    const roomRef = ref(db, `Traker/${pin}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
        throw new Error('PIN not found. Please check and try again.');
    }

    // Merge remote data into local store
    const remoteData = snapshot.val().data;
    if (remoteData && window.store) {
        isSyncingFromRemote = true;
        window.store.data = {
            settings: {
                ...window.store.data.settings,
                ...remoteData.settings,
                theme: window.store.data.settings.theme // keep local theme
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
    return pin;
}

async function pushData(data) {
    if (!currentPin || isSyncingFromRemote || !db) return;
    try {
        await set(ref(db, `Traker/${currentPin}`), {
            data: data,
            lastUpdated: Date.now()
        });
    } catch (e) {
        console.warn('[Sync] Push failed:', e.message);
    }
}

function unlinkPin() {
    if (activeListenerRef) {
        off(activeListenerRef);
        activeListenerRef = null;
    }
    currentPin = null;
    localStorage.removeItem(SYNC_PIN_KEY);
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
            await initFirebase();
            currentPin = storedPin;
            startListening(storedPin);
            return storedPin;
        } catch (e) {
            console.warn('[Sync] Failed to restore sync:', e.message);
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
