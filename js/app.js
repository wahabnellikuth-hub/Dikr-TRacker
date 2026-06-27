document.addEventListener('DOMContentLoaded', () => {
    // Initialize Icons
    lucide.createIcons();

    // Elements
    const dateText = document.getElementById('current-date');
    const themeToggle = document.getElementById('theme-toggle');
    const mainProgressRing = document.querySelector('.circular-progress .fg');
    const progressText = document.getElementById('progress-text');
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('main.content .section');

    // Modals
    const pdfModal = document.getElementById('pdf-modal');
    const btnClosePdf = document.getElementById('btn-close-pdf');
    const pdfViewerFrame = document.getElementById('pdf-viewer-frame');
    const pdfLinkInput = document.getElementById('pdf-link-input');
    const btnSavePdfLink = document.getElementById('btn-save-pdf-link');
    const pdfTypeName = document.getElementById('pdf-type-name');
    let currentPdfType = null; // 'badr' or 'ratib'

    // Data structures
    const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const prayerNames = {
        fajr: { en: 'Fajr', ar: 'الفجر' },
        dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
        asr: { en: 'Asr', ar: 'العصر' },
        maghrib: { en: 'Maghrib', ar: 'المغرب' },
        isha: { en: 'Isha', ar: 'العشاء' }
    };
    let isInitialLoad = true;
    let isSyncing = false;
    const completedSectionsThisSession = new Set();
    let hasCelebratedQuranExtra = false;

    function checkSectionCompletion(id, isCompleted) {
        const badge = document.getElementById(id);
        if (!badge) return;
        if (isCompleted) {
            badge.classList.remove('hidden');
            if (!completedSectionsThisSession.has(id)) {
                completedSectionsThisSession.add(id);
                if (!isInitialLoad && !isSyncing && window.confetti) {
                    confetti({
                        particleCount: 50,
                        spread: 60,
                        origin: { y: 0.6 },
                        colors: ['#2e7d32', '#d4af37', '#ffffff'],
                        zIndex: 1000
                    });
                }
            }
        } else {
            badge.classList.add('hidden');
            completedSectionsThisSession.delete(id);
        }
    }

    // Setup Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateText.textContent = new Date().toLocaleDateString('en-US', options);

    // Render Initial UI
    renderPrayers();
    renderSalawat();
    renderDhikr();
    renderAyahCounters();
    renderCustomTasks();
    setupQuranListeners();
    updateUI();
    isInitialLoad = false;

    // Listen to Store Updates
    window.addEventListener('storeUpdated', updateUI);

    // --- Navigation ---
    navItems.forEach(btn => {
        btn.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            btn.classList.add('active');
            
            const target = btn.dataset.target;
            
            sections.forEach(sec => sec.classList.add('hidden'));
            
            if (target === 'home') {
                document.getElementById('prayers-section').classList.remove('hidden');
                document.getElementById('asmaul-badr-section').classList.remove('hidden');
                document.getElementById('salawat-section').classList.remove('hidden');
                document.getElementById('quran-section').classList.remove('hidden');
                document.getElementById('protection-dhikr-section').classList.remove('hidden');
                document.getElementById('protection-ayah-section').classList.remove('hidden');
                document.getElementById('ratib-section').classList.remove('hidden');
                document.getElementById('custom-tasks-section').classList.remove('hidden');
            } else if (target === 'stats') {
                document.getElementById('stats-section').classList.remove('hidden');
            } else if (target === 'settings') {
                document.getElementById('settings-section').classList.remove('hidden');
            }
        });
    });

    // --- Theme ---
    function applyTheme() {
        const theme = window.store.data.settings.theme;
        document.body.setAttribute('data-theme', theme);
        themeToggle.innerHTML = theme === 'light' ? '<i data-lucide="moon"></i>' : '<i data-lucide="sun"></i>';
        lucide.createIcons();
    };
    
    themeToggle.addEventListener('click', () => {
        const newTheme = window.store.data.settings.theme === 'light' ? 'dark' : 'light';
        window.store.setTheme(newTheme);
        applyTheme();
    });

    // --- Dynamic Rendering Functions ---
    function renderPrayers() {
        const container = document.getElementById('prayers-container');
        container.innerHTML = '';
        
        prayers.forEach(prayer => {
            const card = document.createElement('div');
            card.className = 'card prayer-card';
            card.id = `card-prayer-${prayer}`;
            
            const label = `${prayerNames[prayer].en} - <span class="arabic-text" style="font-size: 1.1em; font-weight: normal;">${prayerNames[prayer].ar}</span>`;
            
            card.innerHTML = `
                <div class="prayer-header">
                    <h4>${label} <span id="star-${prayer}" class="hidden"><i data-lucide="star" class="star-icon"></i></span></h4>
                    <button class="tick-button" id="btn-tick-${prayer}">
                        <i data-lucide="check"></i>
                    </button>
                </div>
                <div class="prayer-jamaah">
                    <span>Prayed in Jama'ah?</span>
                    <div class="radio-group">
                        <label class="radio-label">
                            <input type="radio" name="jamaah-${prayer}" value="yes"> Yes
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="jamaah-${prayer}" value="no"> No
                        </label>
                    </div>
                </div>
            `;
            container.appendChild(card);
            
            // Event Listeners
            card.querySelector(`#btn-tick-${prayer}`).addEventListener('click', () => {
                window.store.togglePrayer(prayer);
            });
            
            card.querySelectorAll(`input[name="jamaah-${prayer}"]`).forEach(radio => {
                radio.addEventListener('change', (e) => {
                    window.store.setJamaah(prayer, e.target.value === 'yes');
                });
            });
        });
        lucide.createIcons();
    }

    function renderSalawat() {
        const container = document.getElementById('salawat-container');
        container.innerHTML = '';
        
        prayers.forEach(prayer => {
            const label = `${prayerNames[prayer].en} - <span class="arabic-text" style="font-size: 1.1em; font-weight: normal;">${prayerNames[prayer].ar}</span>`;
            const card = document.createElement('div');
            card.className = 'card counter-card';
            card.id = `card-salawat-${prayer}`;
            
            card.innerHTML = `
                <div class="counter-info">
                    <h4>${label}</h4>
                    <div class="counter-value"><span id="salawat-val-${prayer}">0</span> / 50</div>
                </div>
                <div class="counter-controls">
                    <button class="counter-btn minus" id="btn-salawat-clear-${prayer}" title="Clear count" style="margin-right: 0.25rem;">
                        <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button class="counter-btn minus" id="btn-salawat-minus-${prayer}">-</button>
                    <button class="counter-btn custom" id="btn-salawat-custom-${prayer}" title="Add custom amount" style="background: transparent; border: 1px solid var(--border); color: var(--text-main);">
                        <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                    </button>
                    <button class="counter-btn plus" id="btn-salawat-plus-${prayer}">+</button>
                </div>
            `;
            container.appendChild(card);
            
            card.querySelector(`#btn-salawat-minus-${prayer}`).addEventListener('click', () => {
                window.store.updateSalawat(prayer, -1);
            });
            card.querySelector(`#btn-salawat-clear-${prayer}`).addEventListener('click', () => {
                window.store.updateSalawat(prayer, -999);
            });
            card.querySelector(`#btn-salawat-plus-${prayer}`).addEventListener('click', () => {
                window.store.updateSalawat(prayer, 1);
            });
            card.querySelector(`#btn-salawat-custom-${prayer}`).addEventListener('click', () => {
                const val = prompt('Enter amount to add (e.g., 10, 33):', '10');
                if (val !== null) {
                    const num = parseInt(val, 10);
                    if (!isNaN(num) && num > 0) {
                        window.store.updateSalawat(prayer, num);
                    }
                }
            });
        });
        lucide.createIcons();
    }

    function renderDhikr() {
        const container = document.getElementById('dhikr-container');
        container.innerHTML = '';
        const types = ['morning', 'evening'];
        
        types.forEach(type => {
            let label = type.charAt(0).toUpperCase() + type.slice(1) + ' Protection Dhikr';
            const card = document.createElement('div');
            card.className = 'card counter-card';
            card.id = `card-dhikr-${type}`;
            
            card.innerHTML = `
                <div class="counter-info">
                    <h4>${label}</h4>
                    <div class="counter-value"><span id="dhikr-val-${type}">0</span> / 11</div>
                </div>
                <div class="counter-controls">
                    <button class="counter-btn minus" id="btn-dhikr-clear-${type}" title="Clear count" style="margin-right: 0.5rem;">
                        <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button class="counter-btn plus" id="btn-dhikr-plus-${type}">+</button>
                </div>
            `;
            container.appendChild(card);
            
            card.querySelector(`#btn-dhikr-plus-${type}`).addEventListener('click', () => {
                window.store.updateDhikr(type, 1);
            });
            card.querySelector(`#btn-dhikr-clear-${type}`).addEventListener('click', () => {
                window.store.updateDhikr(type, -999);
            });
        });
    }

    function renderAyahCounters() {
        const container = document.getElementById('ayah-counters-container');
        container.innerHTML = '';
        const types = ['fajr', 'maghrib'];
        
        types.forEach(type => {
            const label = 'After ' + type.charAt(0).toUpperCase() + type.slice(1);
            const card = document.createElement('div');
            card.className = 'card counter-card';
            card.id = `card-ayah-${type}`;
            
            card.innerHTML = `
                <div class="counter-info">
                    <h4>${label}</h4>
                    <div class="counter-value"><span id="ayah-val-${type}">0</span> / 3</div>
                </div>
                <div class="counter-controls">
                    <button class="counter-btn minus" id="btn-ayah-clear-${type}" title="Clear count" style="margin-right: 0.5rem;">
                        <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button class="counter-btn plus" id="btn-ayah-plus-${type}">+</button>
                </div>
            `;
            container.appendChild(card);
            
            card.querySelector(`#btn-ayah-plus-${type}`).addEventListener('click', () => {
                window.store.updateAyah(type, 1);
            });
            card.querySelector(`#btn-ayah-clear-${type}`).addEventListener('click', () => {
                window.store.updateAyah(type, -999);
            });
        });
    }

    function renderCustomTasks() {
        const container = document.getElementById('custom-tasks-container');
        if (!container) return;
        container.innerHTML = '';
        const tasks = window.store.data.today.customTasks || [];
        
        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.display = 'flex';
            card.style.justifyContent = 'space-between';
            card.style.alignItems = 'center';
            card.style.padding = '0.75rem 1rem';
            card.style.marginBottom = '0.5rem';
            
            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <button class="tick-button ${task.completed ? 'completed' : ''}" id="btn-tick-custom-${task.id}" style="width:24px;height:24px;min-width:24px;">
                        <i data-lucide="check"></i>
                    </button>
                    <span>${task.name}</span>
                </div>
                <button class="action-button outline" style="padding: 0.25rem 0.5rem; color: var(--danger); border-color: var(--danger);" id="btn-del-custom-${task.id}">
                    <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                </button>
            `;
            container.appendChild(card);
            
            card.querySelector(`#btn-tick-custom-${task.id}`).addEventListener('click', () => {
                window.store.toggleCustomTask(task.id);
            });

            card.querySelector(`#btn-del-custom-${task.id}`).addEventListener('click', () => {
                if (confirm('Delete this task?')) {
                    window.store.deleteCustomTask(task.id);
                }
            });
        });
        lucide.createIcons();
    }

    function setupQuranListeners() {
        document.getElementById('btn-quran-minus').addEventListener('click', () => {
            window.store.updateQuranPages(-1);
        });
        document.getElementById('btn-quran-clear').addEventListener('click', () => {
            window.store.updateQuranPages(-999);
        });
        document.getElementById('btn-quran-plus').addEventListener('click', () => {
            window.store.updateQuranPages(1);
        });
        document.getElementById('btn-quran-custom').addEventListener('click', () => {
            const val = prompt('Enter pages read (e.g., 5, 10):', '5');
            if (val !== null) {
                const num = parseInt(val, 10);
                if (!isNaN(num) && num > 0) {
                    window.store.updateQuranPages(num);
                }
            }
        });
    }

    // --- Static Event Listeners ---
    const btnAddOneSalawat = document.getElementById('btn-add-one-salawat');
    if (btnAddOneSalawat) {
        btnAddOneSalawat.addEventListener('click', () => {
            window.store.addExtraSalawat(1);
        });
    }

    const btnCloseCelebration = document.getElementById('btn-close-celebration');
    if (btnCloseCelebration) {
        btnCloseCelebration.addEventListener('click', () => {
            const modal = document.getElementById('celebration-modal');
            if (modal) {
                modal.style.opacity = '0';
                modal.querySelector('.modal-content').style.transform = 'scale(0.95)';
                setTimeout(() => modal.classList.add('hidden'), 300);
            }
        });
    }

    const btnSubOneSalawat = document.getElementById('btn-sub-one-salawat');
    if (btnSubOneSalawat) {
        btnSubOneSalawat.addEventListener('click', () => {
            window.store.addExtraSalawat(-1);
        });
    }


    const btnAddExtraSalawat = document.getElementById('btn-add-extra-salawat');
    if (btnAddExtraSalawat) {
        btnAddExtraSalawat.addEventListener('click', () => {
            const val = prompt('Enter extra Salawat amount (e.g., 100):', '100');
            if (val !== null) {
                const num = parseInt(val, 10);
                if (!isNaN(num) && num > 0) {
                    window.store.addExtraSalawat(num);
                }
            }
        });
    }

    document.getElementById('btn-add-custom-task').addEventListener('click', () => {
        const name = prompt('Enter task name:');
        if (name && name.trim() !== '') {
            window.store.addCustomTask(name.trim());
        }
    });
    document.getElementById('btn-tick-badr').addEventListener('click', () => window.store.toggleBadr());
    document.getElementById('btn-tick-ratib').addEventListener('click', () => window.store.toggleRatib());
    
    document.getElementById('btn-charity').addEventListener('click', () => window.store.toggleCharity());
    document.getElementById('btn-help').addEventListener('click', () => window.store.toggleHelp());
    

    // PDF Handling
    const openPdf = (type) => {
        const typeName = type === 'badr' ? 'Asmaul Badr' : 'Ratib al-Haddad';
        let link = window.store.data.settings.pdfLinks[type];
        
        if (!link) {
            link = prompt(`Please enter the PDF link for ${typeName}:`, "https://");
            if (link && link.trim() !== "" && link.trim() !== "https://") {
                window.store.setPdfLink(type, link.trim());
            } else {
                return; // User cancelled or entered empty
            }
        }
        
        // Open the PDF in a new tab natively
        window.open(link, '_blank');
    };

    document.getElementById('btn-pdf-badr').addEventListener('click', () => openPdf('badr'));
    document.getElementById('btn-pdf-ratib').addEventListener('click', () => openPdf('ratib'));

    // Settings
    document.getElementById('reset-time-select').addEventListener('change', (e) => {
        window.store.setResetTime(e.target.value);
    });
    document.getElementById('btn-reset-progress').addEventListener('click', () => {
        if(confirm("Are you sure you want to reset today's progress?")) {
            window.store.resetToday();
        }
    });
    document.getElementById('btn-toggle-notifications').addEventListener('click', () => {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    window.store.toggleNotifications();
                } else {
                    alert('Notifications permission denied.');
                }
            });
        }
    });

    // --- Update UI Based on Store ---
    function updateUI() {
        const data = window.store.data;
        
        // Settings
        applyTheme();
        document.getElementById('reset-time-select').value = data.settings.resetTime;
        const notifBtn = document.getElementById('btn-toggle-notifications');
        notifBtn.textContent = data.settings.notifications ? 'Disable' : 'Enable';
        notifBtn.className = data.settings.notifications ? 'action-button primary' : 'action-button outline';

        // Prayers
        prayers.forEach(prayer => {
            const state = data.today.prayers[prayer];
            const tick = document.getElementById(`btn-tick-${prayer}`);
            const card = document.getElementById(`card-prayer-${prayer}`);
            const star = document.getElementById(`star-${prayer}`);
            
            if (state.completed) {
                tick.classList.add('completed');
                card.classList.add('completed');
            } else {
                tick.classList.remove('completed');
                card.classList.remove('completed');
            }
            
            if (state.jamaah && state.completed) {
                star.classList.remove('hidden');
            } else {
                star.classList.add('hidden');
            }
            
            const radioYes = card.querySelector(`input[name="jamaah-${prayer}"][value="yes"]`);
            const radioNo = card.querySelector(`input[name="jamaah-${prayer}"][value="no"]`);
            if (state.jamaah) radioYes.checked = true;
            else radioNo.checked = true;
        });

        // Asmaul Badr
        const tickBadr = document.getElementById('btn-tick-badr');
        const cardBadr = document.getElementById('asmaul-badr-card');
        if (data.today.asmaulBadr) {
            tickBadr.classList.add('completed');
            cardBadr.classList.add('completed');
        } else {
            tickBadr.classList.remove('completed');
            cardBadr.classList.remove('completed');
        }

        // Qur'an
        const quranPages = data.today.quranPages;
        document.getElementById('quran-val').textContent = quranPages;
        const cardQuran = document.getElementById('card-quran');
        if (quranPages >= 7) {
            cardQuran.classList.add('completed');
        } else {
            cardQuran.classList.remove('completed');
            hasCelebratedQuranExtra = false; // Reset if they go below 7
        }
        
        // Favour celebration if above 7
        if (quranPages > 7 && !hasCelebratedQuranExtra && !isInitialLoad && !isSyncing) {
            hasCelebratedQuranExtra = true;
            if (window.confetti) {
                const duration = 3000;
                const end = Date.now() + duration;
                const colors = ['#bb0000', '#ffffff', '#2e7d32', '#d4af37'];

                (function frame() {
                    confetti({
                        particleCount: 5,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0 },
                        colors: colors,
                        zIndex: 1000
                    });
                    confetti({
                        particleCount: 5,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1 },
                        colors: colors,
                        zIndex: 1000
                    });

                    if (Date.now() < end) {
                        requestAnimationFrame(frame);
                    }
                }());
            }
        }

        // Salawat
        let totalSalawat = 0;
        let salawatCompletedCount = 0;
        prayers.forEach(prayer => {
            const val = data.today.salawat[prayer];
            totalSalawat += val;
            document.getElementById(`salawat-val-${prayer}`).textContent = val;
            
            const card = document.getElementById(`card-salawat-${prayer}`);
            if (val >= 50) {
                card.classList.add('completed');
                salawatCompletedCount++;
            } else {
                card.classList.remove('completed');
            }
        });
        document.getElementById('salawat-total').textContent = `${totalSalawat} / 250`;

        // Dhikr
        ['morning', 'evening'].forEach(type => {
            const val = data.today.dhikr[type];
            document.getElementById(`dhikr-val-${type}`).textContent = val;
            const card = document.getElementById(`card-dhikr-${type}`);
            if (val >= 11) card.classList.add('completed');
            else card.classList.remove('completed');
        });

        // Ayah
        ['fajr', 'maghrib'].forEach(type => {
            const val = data.today.protectionAyah[type];
            document.getElementById(`ayah-val-${type}`).textContent = val;
            const card = document.getElementById(`card-ayah-${type}`);
            if (val >= 3) card.classList.add('completed');
            else card.classList.remove('completed');
        });

        // Ratib
        const tickRatib = document.getElementById('btn-tick-ratib');
        const cardRatib = document.getElementById('ratib-card');
        if (data.today.ratib) {
            tickRatib.classList.add('completed');
            cardRatib.classList.add('completed');
        } else {
            tickRatib.classList.remove('completed');
            cardRatib.classList.remove('completed');
        }

        // Charity and Help
        const btnCharity = document.getElementById('btn-charity');
        if (btnCharity) {
            const icon = btnCharity.querySelector('svg') || btnCharity.querySelector('i');
            if (data.today.charity) {
                btnCharity.style.background = 'var(--accent)';
                btnCharity.style.borderColor = 'var(--accent)';
                if (icon) icon.style.color = 'white';
            } else {
                btnCharity.style.background = 'var(--surface)';
                btnCharity.style.borderColor = 'var(--border)';
                if (icon) icon.style.color = 'var(--text-main)';
            }
        }
        
        const btnHelp = document.getElementById('btn-help');
        if (btnHelp) {
            const icon = btnHelp.querySelector('svg') || btnHelp.querySelector('i');
            if (data.today.help) {
                btnHelp.style.background = 'var(--accent)';
                btnHelp.style.borderColor = 'var(--accent)';
                if (icon) icon.style.color = 'white';
            } else {
                btnHelp.style.background = 'var(--surface)';
                btnHelp.style.borderColor = 'var(--border)';
                if (icon) icon.style.color = 'var(--text-main)';
            }
        }

        // Stats
        document.getElementById('current-streak').textContent = data.stats.currentStreak;
        document.getElementById('longest-streak').textContent = data.stats.longestStreak;
        
        const totalSalawatEl = document.getElementById('total-salawat');
        if (totalSalawatEl) {
            totalSalawatEl.textContent = data.stats.totalSalawat || 0;
        }
        
        const topStreakVal = document.getElementById('top-streak-val');
        if (topStreakVal) {
            topStreakVal.textContent = `${data.stats.currentStreak} Day Streak`;
        }

        renderDailyProgressChart();

        // Render custom tasks if there are changes
        renderCustomTasks();

        // Overall Progress Calculation
        calculateOverallProgress();
    }

    function calculateOverallProgress() {
        const data = window.store.data;
        const customTasks = data.today.customTasks || [];
        let totalItems = 10 + 1 + 5 + 2 + 2 + 1 + customTasks.length + 1; // 10 prayers, 1 badr, 5 salawat, 2 dhikr, 2 ayah, 1 ratib, +1 Quran
        let completedItems = 0;

        const allPrayers = prayers.every(p => data.today.prayers[p].completed);
        checkSectionCompletion('badge-prayers', allPrayers);

        checkSectionCompletion('badge-badr', data.today.asmaulBadr);

        const allSalawat = prayers.every(p => data.today.salawat[p] >= 50);
        checkSectionCompletion('badge-salawat', allSalawat);

        const hasQuran = data.today.quranPages >= 7;
        checkSectionCompletion('badge-quran', hasQuran);

        const allDhikr = data.today.dhikr.morning >= 11 && data.today.dhikr.evening >= 11;
        checkSectionCompletion('badge-dhikr', allDhikr);

        const allAyah = data.today.protectionAyah.fajr >= 3 && data.today.protectionAyah.maghrib >= 3;
        checkSectionCompletion('badge-ayah', allAyah);

        checkSectionCompletion('badge-ratib', data.today.ratib);
        
        const allCustom = customTasks.length > 0 && customTasks.every(t => t.completed);
        checkSectionCompletion('badge-custom', customTasks.length > 0 ? allCustom : false);

        prayers.forEach(p => { 
            if (data.today.prayers[p].completed) completedItems++; 
            if (data.today.prayers[p].jamaah) completedItems++; 
        });
        if (data.today.asmaulBadr) completedItems++;
        prayers.forEach(p => { if (data.today.salawat[p] >= 50) completedItems++; });
        if (data.today.quranPages >= 7) completedItems++;
        if (data.today.dhikr.morning >= 11) completedItems++;
        if (data.today.dhikr.evening >= 11) completedItems++;
        if (data.today.protectionAyah.fajr >= 3) completedItems++;
        if (data.today.protectionAyah.maghrib >= 3) completedItems++;
        if (data.today.ratib) completedItems++;
        if (data.today.charity) {
            completedItems++;
            totalItems++;
        }
        if (data.today.help) {
            completedItems++;
            totalItems++;
        }
        customTasks.forEach(t => { if (t.completed) completedItems++; });

        const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        
        if (percentage === 100 && totalItems > 0) {
            if (!completedSectionsThisSession.has('all')) {
                completedSectionsThisSession.add('all');
                if (!isInitialLoad && !isSyncing && window.confetti) {
                    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors: ['#2e7d32', '#d4af37', '#ffffff'], zIndex: 3000 });
                    setTimeout(() => confetti({ particleCount: 100, spread: 120, origin: { y: 0.6 }, colors: ['#2e7d32', '#d4af37', '#ffffff'], zIndex: 3000 }), 500);
                }
                
                const celebrationModal = document.getElementById('celebration-modal');
                if (!isInitialLoad && !isSyncing && celebrationModal) {
                    celebrationModal.classList.remove('hidden');
                    setTimeout(() => {
                        celebrationModal.style.opacity = '1';
                        celebrationModal.querySelector('.modal-content').style.transform = 'scale(1)';
                    }, 50);

                    setTimeout(() => {
                        celebrationModal.style.opacity = '0';
                        celebrationModal.querySelector('.modal-content').style.transform = 'scale(0.95)';
                        setTimeout(() => celebrationModal.classList.add('hidden'), 300);
                    }, 3000);
                }
            }
            progressText.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:0.25rem;"><i data-lucide="award" style="width:24px;height:24px;color:var(--gold);stroke:var(--gold);"></i><span style="font-size:0.875rem;">100%</span></div>';
            lucide.createIcons();
            setTimeout(() => {
                progressText.textContent = '100%';
            }, 3000);
        } else {
            completedSectionsThisSession.delete('all');
            progressText.textContent = `${percentage}%`;
        }
        
        // Update Ring
        // radius = 45, circumference = 2 * PI * 45 = 282.74
        const circumference = 283;
        const offset = circumference - (percentage / 100) * circumference;
        mainProgressRing.style.strokeDashoffset = offset;
    }

    function renderDailyProgressChart() {
        const chartContainer = document.getElementById('daily-progress-chart');
        if (!chartContainer) return;
        
        const history = window.store.data.stats.history || [];
        // Get last 7 days
        const last7 = history.slice(-7);
        
        chartContainer.innerHTML = '';
        
        if (last7.length === 0) {
            chartContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem; margin: auto;">No data yet</p>';
            return;
        }

        last7.forEach(entry => {
            const dateObj = new Date(entry.date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            
            const barContainer = document.createElement('div');
            barContainer.className = 'chart-bar-container';
            
            const percentLabel = document.createElement('div');
            percentLabel.className = 'chart-bar-percent';
            percentLabel.textContent = `${entry.percent}%`;
            
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.height = '0%';
            
            setTimeout(() => {
                bar.style.height = `${entry.percent}%`;
            }, 50);
            
            const dayLabel = document.createElement('div');
            dayLabel.className = 'chart-bar-label';
            dayLabel.textContent = dayName;
            
            barContainer.appendChild(percentLabel);
            barContainer.appendChild(bar);
            barContainer.appendChild(dayLabel);
            
            chartContainer.appendChild(barContainer);
        });
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then((registration) => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, (err) => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }

    // ─── Global Sync ──────────────────────────────────────────────────────────

    function attachRemoteChangeListener() {
        window.syncManager.onRemoteChange((remoteData) => {
            isSyncing = true;
            const localDateStr = window.store.data.today.date;
            const remoteDateStr = remoteData.today ? remoteData.today.date : null;
            const localDate = new Date(localDateStr);
            const remoteDate = remoteDateStr ? new Date(remoteDateStr) : new Date(0);
            
            let mergedToday = remoteData.today;
            
            if (localDate > remoteDate) {
                mergedToday = window.store.data.today;
            }

            window.store.data = {
                settings: { ...window.store.data.settings, ...remoteData.settings, theme: window.store.data.settings.theme },
                stats: { ...window.store.data.stats, ...remoteData.stats },
                today: { ...window.store.data.today, ...mergedToday }
            };
            localStorage.setItem('azkar_companion_data', JSON.stringify(window.store.data));
            window.dispatchEvent(new Event('storeUpdated'));
            
            if (localDate > remoteDate) {
                window.syncManager.pushData(window.store.data);
            }
            
            setTimeout(() => { isSyncing = false; }, 100);
        });
    }

    // sync.js loads as ES module (async) — wait for it then init
    function waitForSyncManager(retries = 20) {
        if (window.syncManager) {
            window.syncManager.initSync().then(success => {
                if (success) {
                    attachRemoteChangeListener();
                }
            });
        } else if (retries > 0) {
            setTimeout(() => waitForSyncManager(retries - 1), 150);
        }
    }
    waitForSyncManager();

});
