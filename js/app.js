document.addEventListener('DOMContentLoaded', () => {
    // Initialize Icons safely
    if (typeof lucide !== 'undefined') {
        try { lucide.createIcons(); } catch (e) { console.warn('Lucide icons failed to load', e); }
    }

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
    
    let currentChartDays = 7;

    // Counter Modal
    const counterModal = document.getElementById('counter-modal');
    const btnCloseCounter = document.getElementById('btn-close-counter');
    const counterModalTitle = document.getElementById('counter-modal-title');
    const counterModalVal = document.getElementById('counter-modal-val');
    const counterModalLimit = document.getElementById('counter-modal-limit');
    const btnCounterModalMinus = document.getElementById('btn-counter-modal-minus');
    const btnCounterModalCustom = document.getElementById('btn-counter-modal-custom');
    const btnCounterModalPlus = document.getElementById('btn-counter-modal-plus');
    const btnCounterModalClear = document.getElementById('btn-counter-modal-clear');
    const counterModalCircle = document.getElementById('counter-modal-circle');

    let currentActiveCounter = null;

    function openCounterModal(category, id, title, limit) {
        currentActiveCounter = { category, id, limit };
        counterModalTitle.textContent = title;
        counterModalLimit.textContent = `/ ${limit}`;
        updateCounterModalUI();
        
        counterModal.classList.remove('hidden');
        setTimeout(() => {
            counterModal.style.opacity = '1';
        }, 10);
    }

    function closeCounterModal() {
        counterModal.style.opacity = '0';
        setTimeout(() => {
            counterModal.classList.add('hidden');
            currentActiveCounter = null;
        }, 300);
    }
    
    if(btnCloseCounter) btnCloseCounter.addEventListener('click', closeCounterModal);

    function updateCounterValue(delta) {
        if (!currentActiveCounter) return;
        const { category, id, limit } = currentActiveCounter;
        
        if (category === 'salawat') window.store.updateSalawat(id, delta);
        if (category === 'dhikr') window.store.updateDhikr(id, delta);
        if (category === 'ayah') window.store.updateAyah(id, delta);
        if (category === 'quran') window.store.updateQuranPages(delta);
        
        updateCounterModalUI();
        
        if (delta > 0) {
            const currentVal = parseInt(counterModalVal.textContent, 10);
            if (currentVal >= limit) {
                if (window.confetti) {
                    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 }, colors: ['#2e7d32', '#d4af37'], zIndex: 4000 });
                }
                setTimeout(closeCounterModal, 800);
            }
        }
    }

    function updateCounterModalUI() {
        if (!currentActiveCounter) return;
        const { category, id } = currentActiveCounter;
        let val = 0;
        const data = window.store.data.today;
        
        if (category === 'salawat') val = data.salawat[id];
        if (category === 'dhikr') val = data.dhikr[id];
        if (category === 'ayah') val = data.protectionAyah[id];
        if (category === 'quran') val = data.quranPages;
        
        counterModalVal.textContent = val;
    }

    if(counterModalCircle) {
        counterModalCircle.addEventListener('click', () => {
            counterModalCircle.style.transform = 'scale(0.95)';
            setTimeout(() => counterModalCircle.style.transform = 'scale(1)', 100);
            updateCounterValue(1);
        });
    }
    
    if(btnCounterModalPlus) btnCounterModalPlus.addEventListener('click', () => updateCounterValue(1));
    if(btnCounterModalMinus) btnCounterModalMinus.addEventListener('click', () => updateCounterValue(-1));
    if(btnCounterModalCustom) {
        btnCounterModalCustom.addEventListener('click', () => {
            if (!currentActiveCounter) return;
            const { limit } = currentActiveCounter;
            const val = prompt('Enter amount to add:', limit.toString());
            if (val !== null) {
                const num = parseInt(val, 10);
                if (!isNaN(num) && num !== 0) {
                    updateCounterValue(num);
                }
            }
        });
    }
    if(btnCounterModalClear) {
        btnCounterModalClear.addEventListener('click', () => {
            if (!currentActiveCounter) return;
            const { category, id } = currentActiveCounter;
            if (category === 'salawat') window.store.updateSalawat(id, -999);
            if (category === 'dhikr') window.store.updateDhikr(id, -999);
            if (category === 'ayah') window.store.updateAyah(id, -999);
            if (category === 'quran') window.store.updateQuranPages(-999);
            updateCounterModalUI();
        });
    }

    // Data structures
    const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const isFriday = new Date().getDay() === 5;
    const prayerNames = {
        fajr: { en: 'Fajr', ar: 'الفجر' },
        dhuhr: { en: isFriday ? 'Jumu\'ah' : 'Dhuhr', ar: isFriday ? 'الجمعة' : 'الظهر' },
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
                if (window.store.data.today.prayers[prayer].completed && window.confetti) {
                     confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 }, colors: ['#2e7d32', '#d4af37'], zIndex: 1000 });
                }
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
            `;
            card.style.cursor = 'pointer';
            container.appendChild(card);
            
            card.addEventListener('click', () => {
                openCounterModal('salawat', prayer, prayerNames[prayer].en + ' Salawat', 50);
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
            `;
            card.style.cursor = 'pointer';
            container.appendChild(card);
            
            card.addEventListener('click', () => {
                openCounterModal('dhikr', type, label, 11);
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
            `;
            card.style.cursor = 'pointer';
            container.appendChild(card);
            
            card.addEventListener('click', () => {
                openCounterModal('ayah', type, 'Protection Ayah ' + label, 3);
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
        const cardQuran = document.getElementById('card-quran');
        if (cardQuran) {
            cardQuran.addEventListener('click', () => {
                openCounterModal('quran', 'quran', "Qur'an Reading", 7);
            });
        }

        const isFriday = new Date().getDay() === 5;
        const kahfCard = document.getElementById('card-surah-kahf');
        if (isFriday && kahfCard) {
            kahfCard.classList.remove('hidden');
            const btnTickKahf = document.getElementById('btn-tick-kahf');
            if (btnTickKahf) {
                btnTickKahf.addEventListener('click', () => {
                    window.store.toggleKahf();
                });
            }
        }
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
        const link = type === 'badr' ? 'pdfs/Asmaul%20Badr.pdf.pdf' : 'pdfs/Haddad.pdf.pdf';
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

        // Surah Kahf
        const isFridayToday = new Date().getDay() === 5;
        if (isFridayToday) {
            const tickKahf = document.getElementById('btn-tick-kahf');
            if (tickKahf) {
                if (data.today.surahKahf) {
                    tickKahf.classList.add('completed');
                } else {
                    tickKahf.classList.remove('completed');
                }
            }
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

        const percentage = window.store.getCompletionPercentage();
        const headerBanner = document.getElementById('dashboard-header');
        const greetingTitle = document.getElementById('greeting-title');
        
        if (headerBanner && greetingTitle) {
            headerBanner.className = 'dashboard';
            if (percentage < 25) {
                headerBanner.classList.add('bg-severe');
                greetingTitle.textContent = "Start your day with sincere intentions";
            } else if (percentage < 50) {
                headerBanner.classList.add('bg-warning');
                greetingTitle.textContent = "May Allah guide your steps toward righteousness";
            } else if (percentage < 75) {
                headerBanner.classList.add('bg-good');
                greetingTitle.textContent = "Halfway there! Keep striving for His pleasure";
            } else if (percentage < 100) {
                headerBanner.classList.add('bg-happy');
                greetingTitle.textContent = "Subhanallah, your dedication is inspiring";
            } else {
                headerBanner.classList.add('bg-perfect');
                greetingTitle.textContent = "It's a beautiful Day";
            }
        }
        
        if (percentage === 100) {
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
            if (typeof lucide !== 'undefined') {
                try { lucide.createIcons(); } catch(e){}
            }
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
        const lastDays = history.slice(-currentChartDays);
        
        chartContainer.innerHTML = '';
        
        if (lastDays.length === 0) {
            chartContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem; margin: auto;">No data yet</p>';
            return;
        }

        lastDays.forEach(entry => {
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
        
        // Scroll to the end (right side)
        setTimeout(() => {
            chartContainer.scrollLeft = chartContainer.scrollWidth;
        }, 100);
    }
    
    // Bind chart controls
    const chartControls = document.getElementById('chart-controls');
    if (chartControls) {
        chartControls.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                // Update active state
                Array.from(chartControls.children).forEach(btn => btn.classList.remove('active-range'));
                e.target.classList.add('active-range');
                
                // Render chart
                currentChartDays = parseInt(e.target.dataset.days, 10);
                renderDailyProgressChart();
            }
        });
    }

    // Analysis Logic (Pie Chart)
    const btnAnalyzeProgress = document.getElementById('btn-analyze-progress');
    const analysisModal = document.getElementById('analysis-modal');
    const btnCloseAnalysis = document.getElementById('btn-close-analysis');
    
    if (btnAnalyzeProgress && analysisModal) {
        btnAnalyzeProgress.addEventListener('click', () => {
            const history = window.store.data.stats.history || [];
            
            // Show Modal
            analysisModal.classList.remove('hidden');
            setTimeout(() => {
                analysisModal.style.opacity = '1';
            }, 10);
            
            if (history.length === 0) return;
            
            const taskCounts = {};
            let totalTasksCompleted = 0;
            const allTasks = ['prayers', 'salawat', 'dhikr', 'ayah', 'badr', 'ratib', 'quran', 'kahf'];
            
            history.forEach(entry => {
                if (entry.tasks) {
                    Object.keys(entry.tasks).forEach(taskName => {
                        if (!taskCounts[taskName]) taskCounts[taskName] = 0;
                        if (entry.tasks[taskName]) {
                            taskCounts[taskName]++;
                            totalTasksCompleted++;
                        }
                    });
                } else if (entry.percent !== undefined) {
                    // Fallback for old data: extrapolate tasks from the daily percentage completion
                    const multiplier = entry.percent / 100;
                    if (multiplier > 0) {
                        allTasks.forEach(taskName => {
                            if (!taskCounts[taskName]) taskCounts[taskName] = 0;
                            taskCounts[taskName] += multiplier;
                            totalTasksCompleted += multiplier;
                        });
                    }
                }
            });
            
            document.getElementById('pie-chart-total').textContent = Math.round(totalTasksCompleted);
            
            const colors = {
                prayers: '#4ade80',
                salawat: '#60a5fa',
                dhikr: '#f472b6',
                ayah: '#facc15',
                badr: '#a78bfa',
                ratib: '#fb923c',
                quran: '#2dd4bf',
                kahf: '#94a3b8'
            };
            
            const legendContainer = document.getElementById('chart-legend');
            legendContainer.innerHTML = '';
            
            if (totalTasksCompleted === 0) {
                document.getElementById('pie-chart').style.background = 'var(--border)';
                legendContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); width: 100%;">No tasks completed yet.</p>';
                return;
            }
            
            let gradientStops = [];
            let currentPercent = 0;
            
            Object.keys(taskCounts).forEach(taskName => {
                const count = taskCounts[taskName];
                if (count > 0) {
                    const percent = (count / totalTasksCompleted) * 100;
                    const nextPercent = currentPercent + percent;
                    const color = colors[taskName] || '#fff';
                    
                    gradientStops.push(`${color} ${currentPercent}% ${nextPercent}%`);
                    currentPercent = nextPercent;
                    
                    // Add Legend Item
                    const formatName = name => name.charAt(0).toUpperCase() + name.slice(1);
                    const legendItem = document.createElement('div');
                    legendItem.className = 'legend-item';
                    legendItem.innerHTML = `
                        <div class="legend-color-box" style="background: ${color};"></div>
                        <span class="legend-label">${formatName(taskName)}</span>
                        <span class="legend-value">${Math.round(count)}</span>
                        <span class="legend-percent">${Math.round(percent)}%</span>
                    `;
                    legendContainer.appendChild(legendItem);
                }
            });
            
            document.getElementById('pie-chart').style.background = `conic-gradient(${gradientStops.join(', ')})`;
            
            // --- Detailed Insights ---
            const detailedPrayerCounts = {};
            const detailedSalawatCounts = {};
            const skippedCounts = {}; // Track skipped
            let totalDaysWithDetailedData = 0;
            let totalDaysWithTaskData = 0;

            const historyAndToday = [...history];
            // Include today's data so new users see insights immediately
            const todayDetailed = {
                prayers: JSON.parse(JSON.stringify(window.store.data.today.prayers)),
                salawat: JSON.parse(JSON.stringify(window.store.data.today.salawat)),
                dhikr: JSON.parse(JSON.stringify(window.store.data.today.dhikr)),
                ayah: JSON.parse(JSON.stringify(window.store.data.today.protectionAyah)),
                badr: window.store.data.today.asmaulBadr,
                ratib: window.store.data.today.ratib,
                quran: window.store.data.today.quranPages,
                kahf: window.store.data.today.surahKahf
            };
            
            const todayTasks = {
                prayers: Object.values(window.store.data.today.prayers).every(p => p.completed),
                badr: window.store.data.today.asmaulBadr,
                salawat: Object.values(window.store.data.today.salawat).every(s => s >= 50),
                dhikr: window.store.data.today.dhikr.morning >= 11 && window.store.data.today.dhikr.evening >= 11,
                ayah: window.store.data.today.protectionAyah.fajr >= 3 && window.store.data.today.protectionAyah.maghrib >= 3,
                ratib: window.store.data.today.ratib,
                quran: (window.store.data.today.quranPages || 0) >= 7,
                kahf: new Date(window.store.data.today.date).getDay() === 5 ? window.store.data.today.surahKahf : true
            };
            
            historyAndToday.push({
                tasks: todayTasks,
                detailedTasks: todayDetailed
            });

            historyAndToday.forEach(entry => {
                if (entry.tasks) {
                    totalDaysWithTaskData++;
                    // Calculate skipped (explicitly ignoring 'kahf' per user request)
                    Object.keys(entry.tasks).forEach(taskName => {
                        if (taskName !== 'kahf') {
                            if (!skippedCounts[taskName]) skippedCounts[taskName] = 0;
                            if (!entry.tasks[taskName]) skippedCounts[taskName]++;
                        }
                    });
                }
                if (entry.detailedTasks) {
                    totalDaysWithDetailedData++;
                    
                    if (entry.detailedTasks.prayers) {
                        Object.keys(entry.detailedTasks.prayers).forEach(pName => {
                            if (!detailedPrayerCounts[pName]) detailedPrayerCounts[pName] = { comp: 0, jam: 0 };
                            if (entry.detailedTasks.prayers[pName].completed) detailedPrayerCounts[pName].comp++;
                            if (entry.detailedTasks.prayers[pName].jamaah) detailedPrayerCounts[pName].jam++;
                        });
                    }
                    
                    if (entry.detailedTasks.salawat) {
                        Object.keys(entry.detailedTasks.salawat).forEach(sName => {
                            if (!detailedSalawatCounts[sName]) detailedSalawatCounts[sName] = 0;
                            detailedSalawatCounts[sName] += entry.detailedTasks.salawat[sName];
                        });
                    }
                }
            });

            const formatName = name => name.charAt(0).toUpperCase() + name.slice(1);

            let topPrayer = '--';
            if (totalDaysWithDetailedData > 0) {
                let maxPrayerCount = -1;
                let maxPrayerName = '';
                let jamCount = 0;
                Object.keys(detailedPrayerCounts).forEach(pName => {
                    if (detailedPrayerCounts[pName].comp > maxPrayerCount) {
                        maxPrayerCount = detailedPrayerCounts[pName].comp;
                        maxPrayerName = pName;
                        jamCount = detailedPrayerCounts[pName].jam;
                    }
                });
                if (maxPrayerCount > 0) {
                    topPrayer = `${formatName(maxPrayerName)} (${jamCount} Jama'ah)`;
                }
            }

            let topSalawat = '--';
            if (totalDaysWithDetailedData > 0) {
                let maxSalawatCount = -1;
                let maxSalawatName = '';
                Object.keys(detailedSalawatCounts).forEach(sName => {
                    if (detailedSalawatCounts[sName] > maxSalawatCount) {
                        maxSalawatCount = detailedSalawatCounts[sName];
                        maxSalawatName = sName;
                    }
                });
                if (maxSalawatCount > 0) {
                    // special format for salawat ibrahimiyyah as it's long
                    const shortName = maxSalawatName === 'ibrahimiyyah' ? 'Ibrahimiyyah' : formatName(maxSalawatName);
                    topSalawat = `${shortName} (${maxSalawatCount})`;
                }
            }

            let mostSkipped = '--';
            if (totalDaysWithTaskData > 0) {
                let maxSkippedCount = -1;
                let maxSkippedName = '';
                Object.keys(skippedCounts).forEach(taskName => {
                    if (skippedCounts[taskName] > maxSkippedCount) {
                        maxSkippedCount = skippedCounts[taskName];
                        maxSkippedName = taskName;
                    }
                });
                if (maxSkippedCount > 0) {
                    mostSkipped = formatName(maxSkippedName);
                } else {
                    mostSkipped = 'None! Perfect!';
                }
            }

            const elTopPrayer = document.getElementById('insight-top-prayer');
            const elTopSalawat = document.getElementById('insight-top-salawat');
            const elMostSkipped = document.getElementById('insight-most-skipped');
            
            if(elTopPrayer) elTopPrayer.textContent = topPrayer;
            if(elTopSalawat) elTopSalawat.textContent = topSalawat;
            if(elMostSkipped) elMostSkipped.textContent = mostSkipped;
        });
        
        btnCloseAnalysis.addEventListener('click', () => {
            analysisModal.style.opacity = '0';
            setTimeout(() => {
                analysisModal.classList.add('hidden');
            }, 300);
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
                stats: window.syncManager.mergeStats(window.store.data.stats, remoteData.stats),
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

            // Bind Auth Buttons
            const btnSignIn = document.getElementById('btn-google-signin');
            const btnLoginScreenSignIn = document.getElementById('btn-login-screen-signin');
            const btnLoginScreenSkip = document.getElementById('btn-login-screen-skip');
            const btnSignOut = document.getElementById('btn-google-signout');
            const userProfile = document.getElementById('user-profile');
            const userAvatar = document.getElementById('user-avatar');
            const userName = document.getElementById('user-name');
            
            const loginScreen = document.getElementById('login-screen');
            const appContainer = document.getElementById('app');
            const loginLoading = document.getElementById('login-loading');

            const signInHandler = () => {
                if(window.syncManager) window.syncManager.signIn();
            };

            if (btnSignIn) btnSignIn.addEventListener('click', signInHandler);
            if (btnLoginScreenSignIn) btnLoginScreenSignIn.addEventListener('click', signInHandler);
            if (btnLoginScreenSkip) {
                btnLoginScreenSkip.addEventListener('click', () => {
                    window.isSkippedAuth = true;
                    if (loginScreen) loginScreen.classList.add('hidden');
                    if (appContainer) appContainer.classList.remove('hidden');
                });
            }
            
            if (btnSignOut) {
                btnSignOut.addEventListener('click', () => {
                    if(window.syncManager) window.syncManager.signOut();
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

            // Handle Auth State Changes
            let authHandled = false;
            window.syncManager.onAuthChange((user) => {
                authHandled = true;
                if (user) {
                    if (loginScreen) loginScreen.classList.add('hidden');
                    if (appContainer) appContainer.classList.remove('hidden');

                    if (btnSignIn) btnSignIn.classList.add('hidden');
                    if (userProfile) userProfile.classList.remove('hidden');
                    if (userAvatar) userAvatar.src = user.photoURL || '';
                    if (userName) userName.textContent = user.displayName || 'User';
                } else {
                    if (!window.isSkippedAuth) {
                        if (loginScreen) loginScreen.classList.remove('hidden');
                        if (appContainer) appContainer.classList.add('hidden');
                    }
                    if (loginLoading) loginLoading.classList.add('hidden');
                    if (btnLoginScreenSignIn) btnLoginScreenSignIn.classList.remove('hidden');
                    if (btnLoginScreenSkip) btnLoginScreenSkip.classList.remove('hidden');

                    if (btnSignIn) btnSignIn.classList.remove('hidden');
                    if (userProfile) userProfile.classList.add('hidden');
                    if (userAvatar) userAvatar.src = '';
                    if (userName) userName.textContent = '';
                }
            });
            
            // Fallback if Firebase auth check hangs
            setTimeout(() => {
                if (!authHandled) {
                    console.error("Firebase auth state check timed out. Showing skip button.");
                    if (loginLoading) loginLoading.classList.add('hidden');
                    if (btnLoginScreenSkip) btnLoginScreenSkip.classList.remove('hidden');
                    if (btnLoginScreenSignIn) btnLoginScreenSignIn.classList.remove('hidden');
                }
            }, 3000);

        } else if (retries > 0) {
            setTimeout(() => waitForSyncManager(retries - 1), 150);
        } else {
            // Firebase failed to load, allow user to skip
            if (loginLoading) loginLoading.classList.add('hidden');
            if (btnLoginScreenSkip) btnLoginScreenSkip.classList.remove('hidden');
            console.error("Firebase sync module failed to load within timeout.");
        }
    }
    waitForSyncManager();

});
