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
        charity: false,
        help: false,
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
        this.calculateStreak(false); // Update streak dynamically based on current progress
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        // Dispatch custom event to notify UI
        window.dispatchEvent(new Event('storeUpdated'));
        // Push to Firebase if sync is active
        if (window.syncManager && window.syncManager.isLinked()) {
            window.syncManager.pushData(this.data);
        }
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
        // Calculate streak before resetting (end of day evaluation)
        this.calculateStreak(true);

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
            charity: false,
            help: false,
            customTasks: resetCustomTasks,
            allCompletedForToday: false
        };
        this.saveData();
    }

    calculateStreak(isEndOfDay = false) {
        const percent = this.getCompletionPercentage();
        
        // Push to history
        if (!this.data.stats.history) {
            this.data.stats.history = [];
        }
        
        // Avoid duplicate dates if reset manually multiple times
        const lastEntry = this.data.stats.history[this.data.stats.history.length - 1];
        if (lastEntry && lastEntry.date === this.data.today.date) {
            lastEntry.percent = percent;
        } else {
            this.data.stats.history.push({
                date: this.data.today.date,
                percent: percent
            });
        }

        if (this.data.stats.history.length > 30) {
            this.data.stats.history.shift();
        }

        if (percent > 0) {
            if (!this.data.today.allCompletedForToday) {
                this.data.stats.currentStreak += 1;
                // Only count as fully "completed day" if 100%
                if (percent === 100) {
                    this.data.stats.daysCompleted += 1;
                }
                this.data.today.allCompletedForToday = true;
            }
            if (this.data.stats.currentStreak > this.data.stats.longestStreak) {
                this.data.stats.longestStreak = this.data.stats.currentStreak;
            }
        } else {
            if (this.data.today.allCompletedForToday) {
                // User undid their progress for today, revert streak increment
                this.data.stats.currentStreak = Math.max(0, this.data.stats.currentStreak - 1);
                this.data.today.allCompletedForToday = false;
            } else if (isEndOfDay) {
                // Streak broken if 0% at the end of the day
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

    getCompletionPercentage() {
        let total = 0;
        let completed = 0;

        const prayers = Object.values(this.data.today.prayers);
        total += prayers.length * 2; // 1 for completed, 1 for jamaah
        completed += prayers.filter(p => p.completed).length;
        completed += prayers.filter(p => p.jamaah).length;

        total += 1;
        if (this.data.today.asmaulBadr) completed += 1;

        const salawat = Object.values(this.data.today.salawat);
        total += salawat.length;
        completed += salawat.filter(s => s >= 50).length;

        total += 2;
        if (this.data.today.dhikr.morning >= 11) completed += 1;
        if (this.data.today.dhikr.evening >= 11) completed += 1;

        total += 2;
        if (this.data.today.protectionAyah.fajr >= 3) completed += 1;
        if (this.data.today.protectionAyah.maghrib >= 3) completed += 1;

        total += 1;
        if (this.data.today.ratib) completed += 1;

        total += 1;
        if ((this.data.today.quranPages || 0) >= 7) completed += 1;

        if (this.data.today.charity) {
            total += 1;
            completed += 1;
        }
        if (this.data.today.help) {
            total += 1;
            completed += 1;
        }

        if (Array.isArray(this.data.today.customTasks) && this.data.today.customTasks.length > 0) {
            total += this.data.today.customTasks.length;
            completed += this.data.today.customTasks.filter(t => t.completed).length;
        }

        return total === 0 ? 0 : Math.round((completed / total) * 100);
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

    addExtraSalawat(amount) {
        if (isNaN(amount) || amount === 0) return;
        this.data.stats.totalSalawat += amount;
        if (this.data.stats.totalSalawat < 0) this.data.stats.totalSalawat = 0;
        this.saveData();
    }

    resetTotalSalawat() {
        this.data.stats.totalSalawat = 0;
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

    toggleCharity() {
        this.data.today.charity = !this.data.today.charity;
        this.saveData();
    }

    toggleHelp() {
        this.data.today.help = !this.data.today.help;
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
