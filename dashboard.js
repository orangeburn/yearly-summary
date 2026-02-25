document.addEventListener('DOMContentLoaded', async () => {
    // === Navigation Logic ===
    const navItems = document.querySelectorAll('.nav-item');
    const views = {
        'overview': document.getElementById('view-overview'),
        'settings': document.getElementById('view-settings'),
        'history': document.getElementById('view-history')
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const tab = item.dataset.tab;
            Object.values(views).forEach(el => { if (el) el.style.display = 'none'; });
            if (views[tab]) {
                views[tab].style.display = tab === 'settings' ? 'block' : 'flex';
            }
        });
    });

    // === Dashboard Controls ===
    const rangeTypeSelect = document.getElementById('range-type');
    const pickerMonth = document.getElementById('picker-month');
    const pickerWeek = document.getElementById('picker-week');
    const pickerDay = document.getElementById('picker-day');
    const pickerYear = document.getElementById('picker-year');

    // === History View Controls ===
    const hRangeType = document.getElementById('history-range-type');
    const hPickerMonth = document.getElementById('history-picker-month');
    const hPickerWeek = document.getElementById('history-picker-week');
    const hPickerDay = document.getElementById('history-picker-day');
    const hPickerYear = document.getElementById('history-picker-year');

    // Initialize inputs (Overview)
    const today = new Date();
    pickerMonth.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    pickerDay.valueAsDate = today;
    const weekNum = getWeekNumber(today);
    pickerWeek.value = `${today.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

    pickerYear.innerHTML = ''; // Reset to avoid dupes if re-run
    for (let y = today.getFullYear(); y >= today.getFullYear() - 5; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = `${y}年`;
        pickerYear.appendChild(opt);
    }
    pickerYear.value = today.getFullYear();

    // Initialize inputs (History)
    hPickerMonth.value = pickerMonth.value;
    hPickerDay.valueAsDate = today;
    hPickerWeek.value = pickerWeek.value;

    hPickerYear.innerHTML = pickerYear.innerHTML; // Clone options
    hPickerYear.value = today.getFullYear();

    rangeTypeSelect.addEventListener('change', () => { updatePickerVisibility(); loadDashboardData(); });
    pickerMonth.addEventListener('change', loadDashboardData);
    pickerWeek.addEventListener('change', loadDashboardData);
    pickerDay.addEventListener('change', loadDashboardData);
    pickerYear.addEventListener('change', loadDashboardData);

    hRangeType.addEventListener('change', () => { updateHistoryPickerVisibility(); loadHistoryViewData(); });
    hPickerMonth.addEventListener('change', loadHistoryViewData);
    hPickerWeek.addEventListener('change', loadHistoryViewData);
    hPickerDay.addEventListener('change', loadHistoryViewData);
    hPickerYear.addEventListener('change', loadHistoryViewData);

    function updatePickerVisibility() {
        const type = rangeTypeSelect.value;
        pickerMonth.style.display = type === 'month' ? 'inline-block' : 'none';
        pickerWeek.style.display = type === 'week' ? 'inline-block' : 'none';
        pickerDay.style.display = type === 'day' ? 'inline-block' : 'none';
        pickerYear.style.display = type === 'year' ? 'inline-block' : 'none';
    }

    function updateHistoryPickerVisibility() {
        const type = hRangeType.value;
        hPickerMonth.style.display = type === 'month' ? 'inline-block' : 'none';
        hPickerWeek.style.display = type === 'week' ? 'inline-block' : 'none';
        hPickerDay.style.display = type === 'day' ? 'inline-block' : 'none';
        hPickerYear.style.display = type === 'year' ? 'inline-block' : 'none';
    }

    // Initialize visibility
    updatePickerVisibility();
    updateHistoryPickerVisibility();


    function getWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNo;
    }

    function getDateOfISOWeek(w, y) {
        var simple = new Date(y, 0, 1 + (w - 1) * 7);
        var dow = simple.getDay();
        var ISOweekStart = simple;
        if (dow <= 4)
            ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else
            ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
        return ISOweekStart;
    }

    // === Settings ===
    const apiBaseUrlInput = document.getElementById('api-url-input');
    const apiKeyInput = document.getElementById('api-key-input');
    const apiModelInput = document.getElementById('api-model-input');
    const saveBtn = document.getElementById('save-settings');
    const saveStatus = document.getElementById('save-status');

    chrome.storage.sync.get(['aiApiKey', 'aiBaseUrl', 'aiModel', 'geminiApiKey'], (result) => {
        if (result.aiApiKey) apiKeyInput.value = result.aiApiKey;
        else if (result.geminiApiKey) apiKeyInput.value = result.geminiApiKey;
        if (result.aiBaseUrl) apiBaseUrlInput.value = result.aiBaseUrl;
        if (result.aiModel) apiModelInput.value = result.aiModel;

        loadDashboardData();
        loadHistoryViewData(); // Init independent history
    });

    saveBtn.addEventListener('click', () => {
        const baseUrl = apiBaseUrlInput.value.trim();
        const key = apiKeyInput.value.trim();
        const model = apiModelInput.value.trim();
        if (key) {
            chrome.storage.sync.set({ aiBaseUrl: baseUrl, aiApiKey: key, aiModel: model }, () => {
                saveStatus.textContent = "设置已保存!";
                setTimeout(() => saveStatus.textContent = "", 2000);
            });
        }
    });

    // === Core Logic ===
    let currentStats = null;

    async function loadDashboardData() {
        const type = rangeTypeSelect.value;
        let startTime, endTime, label;
        const now = new Date();

        if (type === 'month') {
            if (!pickerMonth.value) return;
            const [y, m] = pickerMonth.value.split('-').map(Number);
            startTime = new Date(y, m - 1, 1).getTime();
            const nextMonth = new Date(y, m, 1);
            endTime = nextMonth.getTime() > now.getTime() ? now.getTime() : nextMonth.getTime();
            label = `${y}年${m}月`;
        } else if (type === 'week') {
            if (!pickerWeek.value) return;
            const [y, w] = pickerWeek.value.split('-W').map(Number);
            const startNode = getDateOfISOWeek(w, y);
            const endNode = new Date(startNode);
            endNode.setDate(endNode.getDate() + 7);
            startTime = startNode.getTime();
            endTime = endNode.getTime() > now.getTime() ? now.getTime() : endNode.getTime();
            label = `${y}年第${w}周`;
        } else if (type === 'day') {
            if (!pickerDay.value) return;
            // Ensure we cover the full day 00:00:00 to 23:59:59
            startTime = new Date(pickerDay.value).getTime(); // defaults to 00:00 UTC? Careful. 
            // valueAsDate returns UTC. value string is YYYY-MM-DD.
            // Let's treat it as local midnight.
            const [y, m, d] = pickerDay.value.split('-').map(Number);
            startTime = new Date(y, m - 1, d).getTime();
            const nextDay = new Date(startTime + 86400000);
            endTime = nextDay.getTime() > now.getTime() ? now.getTime() : nextDay.getTime();
            label = `${y}年${m}月${d}日`;
        } else if (type === 'year') {
            const y = parseInt(pickerYear.value);
            startTime = new Date(y, 0, 1).getTime();
            const nextYear = new Date(y + 1, 0, 1);
            endTime = nextYear.getTime() > now.getTime() ? now.getTime() : nextYear.getTime();
            label = `${y}年`;
        } else {
            startTime = new Date(now.getFullYear() - 10, 0, 1).getTime();
            endTime = now.getTime();
            label = "全部历史";
        }

        document.getElementById('report-meta--period').textContent = `分析周期: ${label}`;

        const stats = await getHistoryStats(startTime, endTime);

        currentStats = { ...stats, periodLabel: label };

        renderLocalStats(currentStats);

        // NOTE: We do NOT call renderHistoryTable here for the History View anymore.
        // History View has its own loader.
        // However, Top 10 lists are part of Overview, and top 100 history is not needed there.

        const settings = await chrome.storage.sync.get(['aiApiKey']);

        // Try to load cached report for this period
        const cachedKey = `ai_report_${label}`;
        const cachedData = await chrome.storage.local.get([cachedKey]);

        if (cachedData[cachedKey]) {
            renderAIReport(cachedData[cachedKey]);
        } else {
            // No cache, check API key
            if (settings.aiApiKey) {
                document.getElementById('ai-summary-content').innerHTML = `
                    <div style="text-align:center; padding: 20px;">
                        <p style="color: var(--text-secondary);">AI 深度分析已就绪</p>
                        <button class="btn-primary" id="btn-start-analysis" style="margin-top:10px;">✨ 生成本期报告</button>
                    </div>
                `;
                document.getElementById('btn-start-analysis').addEventListener('click', generateAIReport);
            } else {
                document.getElementById('ai-summary-content').innerHTML = `
                    <div style="text-align:center; padding: 20px;">
                        <p>尚未配置 API Key，无法进行 AI 深度分析。</p>
                        <button class="btn-primary" onclick="document.querySelector('[data-tab=settings]').click()">去设置</button>
                    </div>
                `;
            }
        }
    }

    function renderAIReport(result) {
        const aiContent = document.getElementById('ai-summary-content');

        // Simple Markdown formatter for basic bolding and lists
        let summaryHtml = result.summary
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        aiContent.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: var(--primary-color); font-size: 1.1em; text-shadow: 0 0 10px var(--primary-glow);">[ AI::INSIGHT (Cached) ]</div>
            ${summaryHtml}
        `;
        renderPieChart(result.categories);
        renderKeywords(result.keywords);
        renderProductivity(result.productivityScore, result.productivityComment);

        if (result.topSitesInsight) {
            const el = document.getElementById('top-sites-summary');
            el.textContent = "💡 " + result.topSitesInsight;
            el.style.display = 'block';
        }

        if (result.overallAdvice) {
            const adviceEl = document.getElementById('advice-content');
            const adviceSection = document.getElementById('section-advice');
            adviceEl.innerHTML = result.overallAdvice
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n\s*-\s/g, '<br>• ')
                .replace(/\n/g, '<br>');
            adviceSection.style.display = 'block';
        }
    }

    async function getDurationStats(start, end) {
        const keys = [];
        let current = new Date(start);
        const endDate = new Date(end);

        while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            keys.push(`stats_${dateStr}`);
            current.setDate(current.getDate() + 1);
        }

        return await chrome.storage.local.get(keys);
    }

    async function getHistoryStats(startTime, endTime, storageData) {
        return new Promise((resolve) => {
            chrome.history.search({ text: '', startTime: startTime, endTime: endTime, maxResults: 100000 }, (results) => {
                console.log('[getHistoryStats] Chrome API returned', results.length, 'history items');
                resolve(processHistoryItems(results, storageData));
            });
        });
    }


    function processHistoryItems(items, storageData) {
        // 1. Sort ALL items by time (ascending) to reconstruct the timeline
        items.sort((a, b) => a.lastVisitTime - b.lastVisitTime);

        const domainMap = {};
        const uniqueDays = new Set();
        const hours = new Array(24).fill(0);
        const weekDays = new Array(7).fill(0);

        // 2. Iterate to calculate duration based on gaps
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            try {
                if (!item.url) continue;
                const urlObj = new URL(item.url);
                const domain = urlObj.hostname;

                // Init stats if new domain
                if (!domainMap[domain]) {
                    domainMap[domain] = {
                        count: 0,
                        count: 0,
                        estimatedTime: 0, // Inferred Time
                        realTime: 0,      // Real Time from Storage
                        title: item.title,
                        icon: `https://www.google.com/s2/favicons?domain=${domain}`,
                        pages: {}
                    };
                }

                // Basic Stats
                domainMap[domain].count += 1;
                // Since items are sorted ascending, this will naturally end up being the latest time
                domainMap[domain].lastVisit = item.lastVisitTime;

                const date = new Date(item.lastVisitTime);
                uniqueDays.add(date.toDateString());
                hours[date.getHours()]++;
                weekDays[date.getDay()]++;

                // Track pages
                const pageKey = item.title || item.url;
                if (!domainMap[domain].pages[pageKey]) domainMap[domain].pages[pageKey] = 0;
                domainMap[domain].pages[pageKey]++;

                // --- ESTIMATION ALGORITHM ---
                // Calculate gap to the NEXT item in history.
                // NOTE: We track this separately as "estimatedTime". 
                // Later we will merge, but keeping it separate allows us to know if a domain has ANY real data.

                if (i < items.length - 1) {
                    const nextItem = items[i + 1];
                    let gap = nextItem.lastVisitTime - item.lastVisitTime;

                    const MAX_SESSION_GAP = 20 * 60 * 1000;
                    const DEFAULT_PAGE_TIME = 60 * 1000;

                    if (gap > MAX_SESSION_GAP) {
                        gap = DEFAULT_PAGE_TIME;
                    }
                    if (gap < 5000) gap = 5000;

                    // Only add to inferred time if we don't have real data for this specific day?
                    // Actually, the previous Hybrid logic was better: 
                    // "If we have Real Data for this Day, SKIP Inference for this Day".
                    // But here we're aggregating by Domain. 
                    // Let's re-implement the per-day check from Step 349 (which failed/was partial).
                    // Or simpler: Just accumulate all inferred time here.
                    // But WAIT, if we add inferred time for a day that ALSO has real time, we double count?
                    // NO, because we are effectively replacing the "Day's stats".
                    // Let's stick to the prompt's request: "Mark estimated time".
                    // So we accumulate inference here. *Ideally* we shouldn't add inference if Real Data exists for that day.

                    // To keep it clean and robust (and fix the previous partial failure):
                    // Let's check `hasRealData` helper again. I need to re-add that helper inside this function.

                    domainMap[domain].estimatedTime += gap;
                } else {
                    domainMap[domain].estimatedTime += (60 * 1000);
                }

            } catch (e) { }
        }

        // 3. Merge Real Data from Storage
        // We use the storageData passed in (which we need to make sure is available)
        // Note: processHistoryItems signature needs to accept storageData!

        if (storageData) {
            Object.keys(storageData).forEach(key => {
                const dayStats = storageData[key];
                if (!dayStats) return;

                Object.entries(dayStats).forEach(([domain, stats]) => {
                    if (!domainMap[domain]) {
                        const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}`;
                        domainMap[domain] = { count: 0, estimatedTime: 0, realTime: 0, title: domain, icon: iconUrl, pages: {}, lastVisit: stats.lastVisit || Date.now() };
                    }
                    if (stats.time) {
                        domainMap[domain].realTime += stats.time;
                    }
                });
            });
        }

        // 4. Convert and Sort
        // Total Duration = Real Time (if > 0) + Estimated Time (only for days without real data?)
        // The User's request is purely visual: "Mark estimated time. Real records don't need marking."
        // So for sorting, we should sum them?
        // Actually, if we use Hybrid Logic properly, we shouldn't have overlapping days.
        // Assuming no overlap for simplicity (Inference = Past, Real = Future).

        const sortedDomains = Object.entries(domainMap)
            .sort((a, b) => (b[1].realTime + b[1].estimatedTime) - (a[1].realTime + a[1].estimatedTime))
            .map(([domain, data]) => {
                const totalDuration = data.realTime + data.estimatedTime;
                // Mark as approximate if NO real time exists
                const isApprox = (data.realTime === 0);

                const sortedPages = Object.entries(data.pages)
                    .map(([title, count]) => ({ title, count }))
                    .sort((a, b) => b.count - a.count);

                return { domain, ...data, totalDuration, isApprox, pages: sortedPages };
            });

        return {
            totalVisits: items.length,
            activeDays: uniqueDays.size,
            topDomains: sortedDomains,
            hours,
            weekDays
        };
    }

    function formatDuration(ms) {
        if (!ms) return "0s";
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        let str = "";
        if (hours > 0) str += `${hours}h `;
        if (minutes > 0) str += `${minutes}m `;
        if (seconds > 0 || str === "") str += `${seconds}s`;
        return str;
    }

    function renderLocalStats(stats) {
        document.getElementById('total-visits').textContent = stats.totalVisits;
        document.getElementById('active-days').textContent = stats.activeDays;
        document.getElementById('top-domain').textContent = stats.topDomains.length > 0 ? stats.topDomains[0].domain : '-';

        const listContainer = document.getElementById('top-sites-list');
        listContainer.innerHTML = '';
        stats.topDomains.slice(0, 10).forEach((item, index) => {
            const card = document.createElement('div');
            card.id = `site-card-${index}`;
            card.className = "site-analysis-card"; // Logic to be added in CSS or inline
            card.style.cssText = `
                border: 1px solid var(--border-light);
                border-radius: 8px;
                padding: 15px;
                background: rgba(20, 20, 20, 0.6);
                backdrop-filter: blur(5px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                display: flex;
                flex-direction: column;
                gap: 10px;
                transition: transform 0.2s, box-shadow 0.2s;
                cursor: default;
                color: var(--text-primary);
            `;
            const durationStr = formatDuration(item.totalDuration);
            const timeLabel = item.isApprox ? `≈ ${durationStr}` : durationStr; // Conditional Label

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${item.icon}" style="width: 24px; height: 24px; border-radius: 4px; filter: grayscale(50%);" />
                        <div>
                            <div style="font-weight: 600; font-size: 16px; color: var(--text-primary); text-shadow: 0 0 5px rgba(255,255,255,0.2);">${item.domain}</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">
                                <span style="color: var(--primary-color); font-weight:bold;">${timeLabel}</span> • ${item.count} clicks
                            </div>
                        </div>
                        </div>
                    </div>
                    <div class="analysis-status" style="font-size: 11px; color: var(--primary-color); background: rgba(0, 243, 255, 0.1); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--primary-glow);">
                        待分析
                    </div>
                </div>
                <div class="analysis-content" style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                    <div style="margin-top: 5px; font-style: italic; color: var(--text-dim);">Scanning sectors...</div>
                </div>
                <div class="analysis-tags" style="display: flex; gap: 5px; flex-wrap: wrap;"></div>
            `;
            listContainer.appendChild(card);
        });

        renderChart(stats.hours, 'time-chart-placeholder', 'hour');
        renderChart(stats.weekDays, 'week-chart-placeholder', 'weekday');
    }

    // === History View Logic (Decoupled) ===
    async function loadHistoryViewData() {
        const type = hRangeType.value;
        let startTime, endTime;
        const now = new Date();

        if (type === 'month') {
            if (!hPickerMonth.value) return;
            const [y, m] = hPickerMonth.value.split('-').map(Number);
            startTime = new Date(y, m - 1, 1).getTime();
            const nextMonth = new Date(y, m, 1);
            endTime = nextMonth.getTime() > now.getTime() ? now.getTime() : nextMonth.getTime();
        } else if (type === 'week') {
            if (!hPickerWeek.value) return;
            const [y, w] = hPickerWeek.value.split('-W').map(Number);
            const startNode = getDateOfISOWeek(w, y);
            const endNode = new Date(startNode);
            endNode.setDate(endNode.getDate() + 7);
            startTime = startNode.getTime();
            endTime = endNode.getTime() > now.getTime() ? now.getTime() : endNode.getTime();
        } else if (type === 'day') {
            if (!hPickerDay.value) return;
            const [y, m, d] = hPickerDay.value.split('-').map(Number);
            startTime = new Date(y, m - 1, d).getTime();
            const nextDay = new Date(startTime + 86400000);
            endTime = nextDay.getTime() > now.getTime() ? now.getTime() : nextDay.getTime();
        } else if (type === 'year') {
            const y = parseInt(hPickerYear.value);
            startTime = new Date(y, 0, 1).getTime();
            const nextYear = new Date(y + 1, 0, 1);
            endTime = nextYear.getTime() > now.getTime() ? now.getTime() : nextYear.getTime();
        } else {
            startTime = new Date(now.getFullYear() - 10, 0, 1).getTime();
            endTime = now.getTime();
        }

        console.log('[History View Debug] Time range:', new Date(startTime).toLocaleString(), 'to', new Date(endTime).toLocaleString());

        // Fetch storage data for real-time tracking merge
        const storageData = await getDurationStats(startTime, endTime);
        console.log('[History View Debug] Storage data keys:', Object.keys(storageData).length);

        const stats = await getHistoryStats(startTime, endTime, storageData);

        console.log('[History View Debug] Raw history items:', stats.totalVisits);
        console.log('[History View Debug] Unique domains after processing:', stats.topDomains.length);
        console.log('[History View Debug] First 5 domains:', stats.topDomains.slice(0, 5).map(d => d.domain));

        currentHistoryPage = 1;
        renderHistoryTable(stats.topDomains);
    }

    // --- Pagination Logic ---
    let globalHistoryData = [];
    let currentHistoryPage = 1;
    let historyPageSize = 20;



    function renderHistoryTable(domains) {
        console.log('[renderHistoryTable] Called with domains:', domains ? domains.length : 'null');

        // Save raw data for paging
        if (domains) globalHistoryData = domains;

        console.log('[renderHistoryTable] globalHistoryData now has:', globalHistoryData.length, 'items');

        const tbody = document.getElementById('history-table-body');
        if (!tbody) {
            console.error('[renderHistoryTable] tbody element not found!');
            return;
        }
        tbody.innerHTML = '';

        const startIdx = (currentHistoryPage - 1) * historyPageSize;
        const endIdx = startIdx + historyPageSize;
        const pageItems = globalHistoryData.slice(startIdx, endIdx);

        console.log('[renderHistoryTable] Rendering page', currentHistoryPage, 'with', pageItems.length, 'items (from index', startIdx, 'to', endIdx, ')');

        // Update Info
        document.getElementById('page-info-start').textContent = globalHistoryData.length > 0 ? startIdx + 1 : 0;
        document.getElementById('page-info-end').textContent = Math.min(endIdx, globalHistoryData.length);
        document.getElementById('page-info-total').textContent = globalHistoryData.length;
        document.getElementById('page-number-display').textContent = currentHistoryPage;

        // Update Buttons
        document.getElementById('btn-prev-page').disabled = currentHistoryPage <= 1;
        document.getElementById('btn-next-page').disabled = endIdx >= globalHistoryData.length;

        console.log('[renderHistoryTable] Pagination info updated. Start:', startIdx + 1, 'End:', Math.min(endIdx, globalHistoryData.length), 'Total:', globalHistoryData.length);

        pageItems.forEach(item => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

            const durationStr = formatDuration(item.totalDuration);
            const timeLabel = item.isApprox ? `<span style="opacity:0.7">≈</span> ${durationStr}` : durationStr;
            const lastVisitDate = new Date(item.lastVisit ? item.lastVisit : Date.now());

            tr.innerHTML = `
                <td style="padding: 12px; display: flex; align-items: center; gap: 10px;">
                    <img src="${item.icon}" style="width: 16px; height: 16px; border-radius: 2px;">
                    <span style="color: var(--text-primary);">${item.domain}</span>
                </td>
                <td style="padding: 12px; color: var(--primary-color); font-weight: 500;">${timeLabel}</td>
                <td style="padding: 12px;">${item.count}</td>
                <td style="padding: 12px; font-size: 12px; color: var(--text-dim);">${lastVisitDate.toLocaleString()}</td> 
            `;
            tbody.appendChild(tr);
        });

        // CRITICAL FIX: Explicitly ensure pagination controls are visible
        const paginationControls = document.querySelector('.pagination-controls');
        if (paginationControls) {
            paginationControls.style.display = 'flex';
            paginationControls.style.visibility = 'visible';
            console.log('[renderHistoryTable] Forced pagination controls to be visible');
        } else {
            console.error('[renderHistoryTable] ERROR: Cannot find.pagination-controls element!');
        }
    }

    // Pagination Event Listeners
    document.getElementById('btn-prev-page').addEventListener('click', () => {
        console.log('[Prev Button] Clicked. Current page:', currentHistoryPage, 'globalHistoryData length:', globalHistoryData.length);
        if (currentHistoryPage > 1) {
            currentHistoryPage--;
            console.log('[Prev Button] Going to page:', currentHistoryPage);
            renderHistoryTable(null); // re-render using global data
        }
    });

    document.getElementById('btn-next-page').addEventListener('click', () => {
        console.log('[Next Button] Clicked. Current page:', currentHistoryPage, 'globalHistoryData length:', globalHistoryData.length);
        if ((currentHistoryPage * historyPageSize) < globalHistoryData.length) {
            currentHistoryPage++;
            console.log('[Next Button] Going to page:', currentHistoryPage);
            renderHistoryTable(null);
        }
    });

    document.getElementById('page-size-select').addEventListener('change', (e) => {
        historyPageSize = parseInt(e.target.value);
        currentHistoryPage = 1;
        renderHistoryTable(null);
    });

    document.getElementById('regenerate-btn').addEventListener('click', generateAIReport);

    async function generateAIReport() {
        if (!currentStats) return;
        const aiContent = document.getElementById('ai-summary-content');
        aiContent.innerHTML = '<span class="ai-typing">AI 正在分析您的数据，绘制 5维画像... ✨</span>';

        try {
            const { aiApiKey, aiBaseUrl, aiModel } = await chrome.storage.sync.get(['aiApiKey', 'aiBaseUrl', 'aiModel']);
            if (!aiApiKey) return;

            const config = { apiKey: aiApiKey, baseUrl: aiBaseUrl, model: aiModel };
            const result = await window.aiService.generateSummary(config, currentStats);

            // Save to Cache
            if (currentStats && currentStats.periodLabel) {
                const cacheKey = `ai_report_${currentStats.periodLabel}`;
                await chrome.storage.local.set({ [cacheKey]: result });
            }

            // Simple Markdown formatter for basic bolding and lists
            let summaryHtml = result.summary
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');

            aiContent.innerHTML = `
                <div style="margin-bottom: 10px; font-weight: bold; color: var(--primary-color); font-size: 1.1em; text-shadow: 0 0 10px var(--primary-glow);">[ AI::INSIGHT ]</div>
                ${summaryHtml}
            `;
            renderPieChart(result.categories);
            renderKeywords(result.keywords);

            renderProductivity(result.productivityScore, result.productivityComment);

            if (result.topSitesInsight) {
                const el = document.getElementById('top-sites-summary');
                el.textContent = "💡 " + result.topSitesInsight;
                el.style.display = 'block';
            }

            if (result.overallAdvice) {
                const adviceEl = document.getElementById('advice-content');
                const adviceSection = document.getElementById('section-advice');
                // Simple formatter
                adviceEl.innerHTML = result.overallAdvice
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n\s*-\s/g, '<br>• ') // Lists
                    .replace(/\n/g, '<br>');
                adviceSection.style.display = 'block';
            }

            // Start detailed analysis for top sites
            document.getElementById('top-sites-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
            await analyzeTopSites(currentStats.topDomains.slice(0, 10), config);

        } catch (e) {
            console.error(e);
            aiContent.innerHTML = `<span style="color:red">分析失败: ${e.message}</span>`;
        }
    }



    async function analyzeTopSites(topDomains, config) {
        for (let i = 0; i < topDomains.length; i++) {
            const domainData = topDomains[i];
            const cardId = `site-card-${i}`;
            const card = document.getElementById(cardId);
            if (!card) continue;

            const statusEl = card.querySelector('.analysis-status');
            const contentEl = card.querySelector('.analysis-content');
            const tagsEl = card.querySelector('.analysis-tags');

            // Set loading state
            statusEl.textContent = "分析中...";
            statusEl.style.color = "#409EFF";
            statusEl.style.background = "#ecf5ff";

            // Call AI Service
            // Intentionally sequential to avoid rate limits and show progress
            const analysis = await window.aiService.analyzeDomain(config, domainData.domain, domainData.pages);

            // Update UI with result
            if (analysis.contentType && analysis.contentType !== "Error") {
                statusEl.textContent = "DONE";
                statusEl.style.color = "var(--accent-color)";
                statusEl.style.background = "rgba(0, 255, 157, 0.1)";
                statusEl.style.border = "1px solid var(--accent-color)";

                contentEl.innerHTML = `
                    <div style="font-weight: 500; margin-bottom: 4px; color: var(--primary-color); font-family: monospace;">[${analysis.contentType}]</div>
                    <div style="color: #ddd;">${analysis.summary}</div>
                    <div style="margin-top: 8px; display: flex; gap: 10px; align-items: center;">
                         <span style="color: #ffff00; font-weight: bold; text-shadow: 0 0 5px #ffff00;">${"★".repeat(analysis.rating)}${"☆".repeat(5 - analysis.rating)}</span>
                         <span style="font-size: 10px; color: #666; text-transform:uppercase; letter-spacing:1px;">Valuation</span>
                    </div>
                `;

                tagsEl.innerHTML = '';
                (analysis.keywords || []).forEach(kw => {
                    const tag = document.createElement('span');
                    tag.textContent = '#' + kw;
                    tag.style.cssText = `
                        font-size: 11px; 
                        padding: 2px 6px; 
                        border-radius: 2px; 
                        background: rgba(255,255,255,0.05); 
                        color: #aaa;
                        border: 1px solid #333;
                    `;
                    tagsEl.appendChild(tag);
                });

            } else {
                statusEl.textContent = "FAIL";
                statusEl.style.color = "#ff0055";
                statusEl.style.background = "rgba(255, 0, 85, 0.1)";
                contentEl.textContent = "无法获取详细分析数据。";
            }

            // Small delay to be nice to the API
            await new Promise(r => setTimeout(r, 500));
        }
    }

    // === Chart Renderers (SVG) ===
    function renderChart(data, elementId, type) {
        const container = document.getElementById(elementId);
        container.innerHTML = '';

        // Use container dimensions for viewBox
        // Fallback to reasonable defaults only if 0 (e.g. hidden)
        const width = container.clientWidth || 300;
        const height = container.clientHeight || 200;

        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");

        // Critical: Set width/height 100% to fill container
        // Use preserveAspectRatio="none" to stretch bars to fill the box exactly
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.setAttribute("preserveAspectRatio", "none");

        const padding = { top: 20, right: 10, bottom: 30, left: 30 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        const maxVal = Math.max(...data, 1);

        // Axes
        const xAxis = document.createElementNS(ns, "line");
        xAxis.setAttribute("x1", padding.left); xAxis.setAttribute("y1", height - padding.bottom);
        xAxis.setAttribute("x2", width - padding.right); xAxis.setAttribute("y2", height - padding.bottom);
        xAxis.setAttribute("stroke", "#333"); svg.appendChild(xAxis);


        const barWidth = (chartWidth / data.length) * 0.6;
        const step = chartWidth / data.length;
        const weekLabels = ["日", "一", "二", "三", "四", "五", "六"];

        data.forEach((val, i) => {
            const h = (val / maxVal) * chartHeight;
            const x = padding.left + (i * step) + (step - barWidth) / 2;
            const y = height - padding.bottom - h;

            const rect = document.createElementNS(ns, "rect");
            rect.setAttribute("x", x); rect.setAttribute("y", y); rect.setAttribute("width", barWidth); rect.setAttribute("height", Math.max(h, 2));
            rect.setAttribute("fill", "#00f3ff"); // Neon Cyan
            rect.setAttribute("rx", "2");
            rect.setAttribute("filter", "drop-shadow(0 0 4px rgba(0,243,255,0.5))");
            rect.innerHTML = `<title>${i}: ${val}</title>`;
            svg.appendChild(rect);


            if (type === 'weekday' || (type === 'hour' && i % 4 === 0)) {
                const text = document.createElementNS(ns, "text");
                // Text positioning logic needs to account for stretched coords if aspect ratio is weird,
                // but since we draw in pixel coords matching the container, it should be fine.
                text.setAttribute("x", x + barWidth / 2); text.setAttribute("y", height - padding.bottom + 14);
                text.setAttribute("text-anchor", "middle"); text.setAttribute("fill", "#aaaaaa"); text.setAttribute("font-size", "12");
                text.textContent = type === 'weekday' ? weekLabels[i] : i;
                svg.appendChild(text);
            }
        });
        container.appendChild(svg);
    }

    function renderPieChart(categories) {
        const container = document.getElementById('chart-pie');
        container.innerHTML = '';
        container.style.display = "flex";
        container.style.justifyContent = "center";
        container.style.alignItems = "center";

        if (!categories) return;

        const size = 200;
        const radius = 80;
        const cx = size / 2;
        const cy = size / 2;

        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet"); // Pie chart should stay round

        const total = categories.reduce((s, c) => s + c.value, 0);
        const colors = ["#00f3ff", "#bc13fe", "#00ff9d", "#ff0055", "#ffff00", "#ffffff"];

        let startAngle = 0;
        categories.forEach((cat, i) => {
            const sliceAngle = (cat.value / total) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;

            const x1 = cx + radius * Math.cos(startAngle);
            const y1 = cy + radius * Math.sin(startAngle);
            const x2 = cx + radius * Math.cos(endAngle);
            const y2 = cy + radius * Math.sin(endAngle);

            const largeArc = sliceAngle > Math.PI ? 1 : 0;

            let d = "";
            if (total === 0 || Math.abs(sliceAngle - 2 * Math.PI) < 0.001) {
                d = `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius}`;
            } else {
                d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            }

            const path = document.createElementNS(ns, "path");
            path.setAttribute("d", d);
            path.setAttribute("fill", colors[i % colors.length]);
            path.innerHTML = `<title>${cat.name}: ${Math.round(cat.value / total * 100)}%</title>`;
            svg.appendChild(path);

            startAngle = endAngle;
        });
        container.appendChild(svg);
    }

    function renderKeywords(keywords) {
        const container = document.getElementById('chart-cloud');
        container.innerHTML = '';
        container.style.height = "100%";
        if (!keywords) return;

        const colors = ["#00f3ff", "#bc13fe", "#00ff9d", "#ff0055", "#ffff00"];
        keywords.forEach((kw, i) => {
            const span = document.createElement('span');
            span.textContent = kw;
            span.style.padding = '4px 12px';
            span.style.borderRadius = '20px';
            span.style.backgroundColor = 'rgba(255,255,255,0.05)';
            span.style.border = `1px solid ${colors[i % colors.length]}`;
            span.style.color = colors[i % colors.length];
            span.style.boxShadow = `0 0 5px ${colors[i % colors.length]}44`;
            span.style.fontSize = Math.max(12, 18 - i) + 'px';
            span.style.fontFamily = 'monospace';
            container.appendChild(span);
        });
    }

    function renderProductivity(score, comment) {
        const el = document.getElementById('prod-score');
        el.textContent = score;
        const color = score > 80 ? '#00ff9d' : (score > 60 ? '#ffff00' : '#ff0055');
        el.style.color = color;

        let commentEl = document.getElementById('prod-comment');
        if (!commentEl) {
            commentEl = document.createElement('div');
            commentEl.id = 'prod-comment';
            commentEl.style.fontSize = '12px'; commentEl.style.color = 'var(--text-secondary)';
            commentEl.style.marginTop = '10px'; commentEl.style.textAlign = 'center';
            el.parentNode.appendChild(commentEl);
        }
        commentEl.textContent = comment;
    }
});
