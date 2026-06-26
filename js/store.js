const STORAGE_KEY = 'azkar_companion_data';

const defaultState = {
    settings: {
        theme: 'light',
        resetTime: 'midnight', // 'midnight' or 'isha'
        notifications: false,
        pdfLinks: {
            badr: 'https://drive.google.com/file/d/17fTUmBZTLPgFvBJUNhnz2YCExU5ka7OP/preview',
            ratib: 'https://drive.google.com/file/d/1PpT__Fe4kN6WgPQ6or8xsiVyGarU8jMj/preview'
        }
    },
    stats: {
        currentStreak: 0,
        longestStreak: 0,
        totalSalawat: 0,
        totalQuranPages: 0,
        daysCompleted: 0
    },
    today: {
        date: new Date().toDateString(),
        lastResetTime: Date.now(),
        prayers: {
            fajr: { completed: false, jamaah: false },
            dhuhr: { completed: false, jamaah: false },
            asr: { completed: false, jamaah: false },
            maghrib: { completed: false, jamaah: false },
            isha: { completed: false, jamaah: false }
        },
        asmaulBadr: false,
        quranPages: 0,
        salawat: {
            fajr: 0,
            dhuhr: 0,
            asr: 0,
            maghrib: 0,
            isha: 0
        },
        dhikr: {
            morning: 0,
            evening: 0
        },
        protectionAyah: { fajr: 0, maghrib: 0 },
        ratib: false,
        customTasks: [],
        allCompletedForToday: false
    }
};

class Store {
    constructor() {
        this.data = this.loadData();
        this.checkReset();
    }

    loadData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                // Merge with default state to ensure all keys exist
                const parsed = JSON.parse(stored);
                let todayData = { ...defaultState.today, ...parsed.today };
                if (typeof todayData.protectionAyah !== 'object') {
                    todayData.protectionAyah = { fajr: 0, maghrib: 0 };
                }
                if (typeof todayData.quranPages !== 'number') {
                    todayData.quranPages = 0;
                }
                if (!Array.isArray(todayData.customTasks)) {
                    todayData.customTasks = [];
                }
                if (typeof parsed.stats.totalQuranPages !== 'number') {
                    parsed.stats.totalQuranPages = 0;
                }
                return {
                    settings: { ...defaultState.settings, ...parsed.settings },
                    stats: { ...defaultState.stats, ...parsed.stats },
                    today: todayData
                };
            } catch (e) {
                console.error("Error parsing stored data", e);
                return JSON.parse(JSON.stringify(defaultState));
            }
        }
        return JSON.parse(JSON.stringify(defaultState));
    }

    saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        // Dispatch custom event to notify UI
        window.dispatchEvent(new Event('storeUpdated'));
    }

    checkReset() {
        const now = new Date();
        const todayDateString = now.toDateString();
        let shouldReset = false;

        if (this.data.settings.resetTime === 'midnight') {
            if (this.data.today.date !== todayDateString) {
                shouldReset = true;
            }
        } else if (this.data.settings.resetTime === 'isha') {
            // Approximate Isha time as 20:30 (8:30 PM) for automatic reset.
            // A more complex implementation would require geolocation and prayer times API.
            const resetHour = 20;
            const resetMinute = 30;
            const lastReset = new Date(this.data.today.lastResetTime);
            
            // If it's currently past Isha time
            if (now.getHours() > resetHour || (now.getHours() === resetHour && now.getMinutes() >= resetMinute)) {
                // And the last reset was before today's Isha time
                const todaysIshaTime = new Date(now);
                todaysIshaTime.setHours(resetHour, resetMinute, 0, 0);
                if (lastReset < todaysIshaTime) {
                    shouldReset = true;
                }
            } else {
                // If it's before Isha time, but date has changed and we haven't reset since yesterday's Isha
                const yesterdaysIshaTime = new Date(now);
                yesterdaysIshaTime.setDate(yesterdaysIshaTime.getDate() - 1);
                yesterdaysIshaTime.setHours(resetHour, resetMinute, 0, 0);
                if (lastReset < yesterdaysIshaTime) {
                    shouldReset = true;
                }
            }
        }

        if (shouldReset) {
            this.resetToday();
        }
    }

    resetToday() {
        // Calculate streak before resetting
        this.calculateStreak();

        const oldCustomTasks = Array.isArray(this.data.today.customTasks) ? this.data.today.customTasks : [];
        const resetCustomTasks = oldCustomTasks.map(t => ({ ...t, completed: false }));

        this.data.today = {
            date: new Date().toDateString(),
            lastResetTime: Date.now(),
            prayers: {
                fajr: { completed: false, jamaah: false },
                dhuhr: { completed: false, jamaah: false },
                asr: { completed: false, jamaah: false },
                maghrib: { completed: false, jamaah: false },
                isha: { completed: false, jamaah: false }
            },
            asmaulBadr: false,
            quranPages: 0,
            salawat: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
            dhikr: { morning: 0, evening: 0 },
            protectionAyah: { fajr: 0, maghrib: 0 },
            ratib: false,
            customTasks: resetCustomTasks,
            allCompletedForToday: false
        };
        this.saveData();
    }

    calculateStreak() {
        // Check if all essential tasks were completed
        const isCompleted = this.checkAllCompleted();
        
        if (isCompleted) {
            if (!this.data.today.allCompletedForToday) {
                this.data.stats.currentStreak += 1;
                this.data.stats.daysCompleted += 1;
                this.data.today.allCompletedForToday = true;
            }
            if (this.data.stats.currentStreak > this.data.stats.longestStreak) {
                this.data.stats.longestStreak = this.data.stats.currentStreak;
            }
        } else {
            // If resetting and not completed, streak is broken
            if (!this.data.today.allCompletedForToday) {
                this.data.stats.currentStreak = 0;
            }
        }
    }

    checkAllCompleted() {
        const prayers = Object.values(this.data.today.prayers).every(p => p.completed);
        const badr = this.data.today.asmaulBadr;
        const salawat = Object.values(this.data.today.salawat).every(s => s >= 50);
        const dhikr = this.data.today.dhikr.morning >= 11 && this.data.today.dhikr.evening >= 11;
        const ayah = this.data.today.protectionAyah.fajr >= 3 && this.data.today.protectionAyah.maghrib >= 3;
        const ratib = this.data.today.ratib;
        const quran = (this.data.today.quranPages || 0) >= 7;
        const custom = Array.isArray(this.data.today.customTasks) ? this.data.today.customTasks.every(t => t.completed) : true;

        return prayers && badr && salawat && dhikr && ayah && ratib && quran && custom;
    }

    // Actions
    togglePrayer(prayerName) {
        this.data.today.prayers[prayerName].completed = !this.data.today.prayers[prayerName].completed;
        this.saveData();
    }

    setJamaah(prayerName, isJamaah) {
        this.data.today.prayers[prayerName].jamaah = isJamaah;
        this.saveData();
    }

    toggleBadr() {
        this.data.today.asmaulBadr = !this.data.today.asmaulBadr;
        this.saveData();
    }

    updateQuranPages(delta) {
        let current = this.data.today.quranPages;
        let previous = current;
        current += delta;
        
        // Handle clear (if delta is heavily negative, e.g. -999)
        if (delta === -999) {
            current = 0;
        } else if (current < 0) {
            current = 0;
        }
        
        const actualAdded = current - previous;
        this.data.stats.totalQuranPages += actualAdded;
        if (this.data.stats.totalQuranPages < 0) this.data.stats.totalQuranPages = 0;

        this.data.today.quranPages = current;
        this.saveData();
    }

    updateSalawat(prayerName, delta) {
        let current = this.data.today.salawat[prayerName];
        let previous = current;
        current += delta;
        if (current < 0) current = 0;
        if (current > 50) current = 50;
        
        // Track total salawat for stats
        const actualAdded = current - previous;
        this.data.stats.totalSalawat += actualAdded;
        if (this.data.stats.totalSalawat < 0) this.data.stats.totalSalawat = 0;

        this.data.today.salawat[prayerName] = current;
        this.saveData();
    }

    updateDhikr(type, delta) {
        let current = this.data.today.dhikr[type];
        current += delta;
        if (current < 0) current = 0;
        if (current > 11) current = 11;
        this.data.today.dhikr[type] = current;
        this.saveData();
    }

    updateAyah(prayer, delta) {
        let current = this.data.today.protectionAyah[prayer];
        current += delta;
        if (current < 0) current = 0;
        if (current > 3) current = 3;
        this.data.today.protectionAyah[prayer] = current;
        this.saveData();
    }

    toggleRatib() {
        this.data.today.ratib = !this.data.today.ratib;
        this.saveData();
    }

    addCustomTask(name) {
        if (!Array.isArray(this.data.today.customTasks)) {
            this.data.today.customTasks = [];
        }
        this.data.today.customTasks.push({
            id: Date.now().toString(),
            name: name,
            completed: false
        });
        this.saveData();
    }

    toggleCustomTask(id) {
        const task = this.data.today.customTasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveData();
        }
    }

    deleteCustomTask(id) {
        this.data.today.customTasks = this.data.today.customTasks.filter(t => t.id !== id);
        this.saveData();
    }

    // Settings
    setTheme(theme) {
        this.data.settings.theme = theme;
        this.saveData();
    }
    
    setPdfLink(type, link) {
        this.data.settings.pdfLinks[type] = link;
        this.saveData();
    }

    setResetTime(time) {
        this.data.settings.resetTime = time;
        this.saveData();
    }

    toggleNotifications() {
        this.data.settings.notifications = !this.data.settings.notifications;
        this.saveData();
    }
}

window.store = new Store();
