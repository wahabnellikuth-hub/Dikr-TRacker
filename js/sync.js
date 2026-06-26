// js/sync.js — Firebase Global Sync Module
// No auth required — uses open rules on Traker/ path
// Exposes window.syncManager for a single, global dataset

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

let db = null;
let activeListenerRef = null;
let isSyncingFromRemote = false;
let onChangeCallback = null;

// The single, hardcoded path for the global database
const GLOBAL_DATA_PATH = 'Traker/globalData';

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

// ─── Listener ────────────────────────────────────────────────────────────────

function startListening() {
    if (activeListenerRef) {
        off(activeListenerRef);
        activeListenerRef = null;
    }
    const dataRef = ref(db, `${GLOBAL_DATA_PATH}/data`);
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

async function initSync() {
    try {
        initFirebase();
        
        // Check if data exists, if not, push current local data to initialize
        const snapshot = await get(ref(db, `${GLOBAL_DATA_PATH}/data`));
        if (!snapshot.exists()) {
             const currentData = window.store ? window.store.data : null;
             await set(ref(db, GLOBAL_DATA_PATH), {
                 data: currentData,
                 createdAt: Date.now(),
                 lastUpdated: Date.now()
             });
             console.log('[Sync] Initialized global data in Firebase');
        } else {
             // Merge remote data into local store initially
             const remoteData = snapshot.val();
             if (remoteData && window.store) {
                 isSyncingFromRemote = true;
                 
                 const localDateStr = window.store.data.today.date;
                 const remoteDateStr = remoteData.today ? remoteData.today.date : null;
                 const localDate = new Date(localDateStr);
                 const remoteDate = remoteDateStr ? new Date(remoteDateStr) : new Date(0);
                 
                 let mergedToday = remoteData.today;
                 let needsPush = false;
                 
                 // If the local date is newer than the remote date, don't overwrite local today
                 if (localDate > remoteDate) {
                     mergedToday = window.store.data.today;
                     needsPush = true;
                 }

                 window.store.data = {
                     settings: {
                         ...window.store.data.settings,
                         ...remoteData.settings,
                         theme: window.store.data.settings.theme // keep local theme
                     },
                     stats: { ...window.store.data.stats, ...remoteData.stats },
                     today: { ...window.store.data.today, ...mergedToday }
                 };
                 localStorage.setItem('azkar_companion_data', JSON.stringify(window.store.data));
                 window.dispatchEvent(new Event('storeUpdated'));
                 isSyncingFromRemote = false;
                 
                 if (needsPush) {
                     pushData(window.store.data);
                 }
             }
             console.log('[Sync] Loaded existing global data from Firebase');
        }
        
        startListening();
        return true;
    } catch (e) {
        console.error('[Sync] Failed to init sync:', e.message);
        return false;
    }
}

async function pushData(data) {
    if (isSyncingFromRemote || !db) return;
    try {
        await set(ref(db, GLOBAL_DATA_PATH), {
            data: data,
            lastUpdated: Date.now()
        });
        console.log('[Sync] Global data pushed to Firebase ✅');
    } catch (e) {
        console.error('[Sync] Push failed ❌:', e.message);
    }
}

// Always consider it linked since it's a global database
function isLinked() {
    return true; 
}

function onRemoteChange(callback) {
    onChangeCallback = callback;
}

// ─── Expose globally ─────────────────────────────────────────────────────────

window.syncManager = {
    pushData,
    isLinked,
    onRemoteChange,
    initSync
};

console.log('[Sync] sync.js loaded ✅');
