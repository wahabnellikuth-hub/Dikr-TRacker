// js/sync.js — Firebase Multi-User Sync Module

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, off } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

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

let app = null;
let db = null;
let auth = null;
let currentUser = null;
let activeListenerRef = null;
let isSyncingFromRemote = false;
let onChangeCallback = null;
let onAuthChangeCallback = null;

function initFirebase() {
    if (!app) {
        try {
            app = initializeApp(firebaseConfig);
            db = getDatabase(app);
            auth = getAuth(app);
            
            // Listen for auth state changes
            onAuthStateChanged(auth, (user) => {
                currentUser = user;
                if (user) {
                    console.log('[Sync] User signed in:', user.displayName);
                    startSyncForUser(user.uid);
                } else {
                    console.log('[Sync] User signed out.');
                    stopSync();
                }
                
                if (onAuthChangeCallback) {
                    onAuthChangeCallback(user);
                }
            });
            console.log('[Sync] Firebase initialized ✅');
        } catch (e) {
            console.error('[Sync] Firebase init failed:', e.message);
        }
    }
}

// ─── Authentication ──────────────────────────────────────────────────────────

async function signIn() {
    initFirebase();
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('[Sync] Sign-in error:', error.message);
        alert('Sign-in failed: ' + error.message);
    }
}

async function signUserOut() {
    if (auth) {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('[Sync] Sign-out error:', error.message);
        }
    }
}

function onAuthChange(callback) {
    onAuthChangeCallback = callback;
    // If auth is already initialized and we have a user, trigger immediately
    if (auth && auth.currentUser !== undefined) {
        callback(auth.currentUser);
    }
}

// ─── Sync Logic ──────────────────────────────────────────────────────────────

function getDataPath(uid) {
    return `Traker/users/${uid}`;
}

async function startSyncForUser(uid) {
    const dataPath = getDataPath(uid);
    
    try {
        // Check if data exists on remote
        const snapshot = await get(ref(db, `${dataPath}/data`));
        if (!snapshot.exists()) {
             // Push current local data to initialize their cloud storage
             const currentData = window.store ? window.store.data : null;
             await set(ref(db, dataPath), {
                 data: currentData,
                 createdAt: Date.now(),
                 lastUpdated: Date.now()
             });
             console.log('[Sync] Initialized user data in Firebase');
        } else {
             // Merge remote data into local store
             const remoteData = snapshot.val();
             if (remoteData && window.store) {
                 isSyncingFromRemote = true;
                 
                 const localDateStr = window.store.data.today.date;
                 const remoteDateStr = remoteData.today ? remoteData.today.date : null;
                 const localDate = new Date(localDateStr);
                 const remoteDate = remoteDateStr ? new Date(remoteDateStr) : new Date(0);
                 
                 let mergedToday = remoteData.today;
                 let needsPush = false;
                 
                 if (localDate > remoteDate) {
                     mergedToday = window.store.data.today;
                     needsPush = true;
                 }

                 window.store.data = {
                     settings: {
                         ...window.store.data.settings,
                         ...remoteData.settings,
                         theme: window.store.data.settings.theme
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
             console.log('[Sync] Loaded user data from Firebase');
        }
        
        // Setup listener
        if (activeListenerRef) {
            off(activeListenerRef);
        }
        const dataRef = ref(db, `${dataPath}/data`);
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
        
    } catch (e) {
        console.error('[Sync] Failed to start sync:', e.message);
    }
}

function stopSync() {
    if (activeListenerRef) {
        off(activeListenerRef);
        activeListenerRef = null;
    }
}

async function pushData(data) {
    if (isSyncingFromRemote || !db || !currentUser) return;
    try {
        const dataPath = getDataPath(currentUser.uid);
        await set(ref(db, dataPath), {
            data: data,
            lastUpdated: Date.now()
        });
        console.log('[Sync] User data pushed to Firebase ✅');
    } catch (e) {
        console.error('[Sync] Push failed ❌:', e.message);
    }
}

function isLinked() {
    return currentUser !== null; 
}

function onRemoteChange(callback) {
    onChangeCallback = callback;
}

async function initSync() {
    initFirebase();
    return true;
}

// ─── Expose globally ─────────────────────────────────────────────────────────

window.syncManager = {
    pushData,
    isLinked,
    onRemoteChange,
    initSync,
    signIn,
    signOut: signUserOut,
    onAuthChange
};

console.log('[Sync] sync.js loaded ✅');
