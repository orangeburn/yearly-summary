// Background service worker
chrome.runtime.onInstalled.addListener(() => {
    console.log('AI Browsing Insight extension installed');
    chrome.storage.local.set({ extensionInstalledDate: new Date().getTime() });
});

let activeTabId = null;
let startTime = null;
let currentUrl = null;

// Debug flag - set to false to disable logging
const DEBUG_TRACKING = true;
function debugLog(...args) {
    if (DEBUG_TRACKING) console.log('[Time Tracking]', new Date().toLocaleTimeString(), ...args);
}

// --- Core Tracking Logic ---

async function updateTime() {
    if (activeTabId === null || startTime === null || !currentUrl) return;

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (duration > 1000) { // Look strictly for > 1s to avoid noise
        try {
            const urlObj = new URL(currentUrl);
            const domain = urlObj.hostname;
            // Ignore chrome:// and empty pages
            if (domain && !currentUrl.startsWith('chrome://') && !currentUrl.startsWith('edge://')) {
                debugLog('Recording', Math.round(duration / 1000) + 's', 'for', domain);
                await saveDuration(domain, duration);
            }
        } catch (e) {
            // Invalid URL, ignore
        }
    }

    // Reset timer
    startTime = Date.now();
}

async function saveDuration(domain, durationMs) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `stats_${today}`;

    // Optimization: Get only the specific key to minimize overhead
    const data = await chrome.storage.local.get([key]);
    const dailyStats = data[key] || {};

    if (!dailyStats[domain]) {
        dailyStats[domain] = { time: 0, visits: 0, lastVisit: 0, icon: `https://www.google.com/s2/favicons?domain=${domain}` };
    }

    dailyStats[domain].time += durationMs;
    dailyStats[domain].lastVisit = Date.now();

    // We do NOT increment visits here to avoid double counting with History API.
    // We only use this for TIME tracking.

    await chrome.storage.local.set({ [key]: dailyStats });

    debugLog('Saved! Total time for', domain, 'today:', Math.round(dailyStats[domain].time / 1000) + 's');
}

// --- Event Listeners ---

// 1. Tab Activated (Switching tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    await updateTime();

    activeTabId = activeInfo.tabId;
    startTime = Date.now();

    try {
        const tab = await chrome.tabs.get(activeTabId);
        currentUrl = tab.url;
        debugLog('Tab activated:', currentUrl);
    } catch (e) {
        currentUrl = null;
    }
});

// 2. Tab Updated (Navigating in same tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId === activeTabId && changeInfo.status === 'complete') {
        updateTime();
        startTime = Date.now();
        currentUrl = tab.url;
    }
});

// 3. Window Focus Changed (Minimize/Alt-Tab)
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // Browser lost focus
        await updateTime();
        activeTabId = null;
        startTime = null;
    } else {
        // Regained focus
        const query = await chrome.tabs.query({ active: true, windowId });
        if (query && query.length > 0) {
            activeTabId = query[0].id;
            currentUrl = query[0].url;
            startTime = Date.now();
        }
    }
});

// 4. Tab Removed
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === activeTabId) {
        updateTime();
        activeTabId = null;
        startTime = null;
    }
});

// 5. Heartbeat - Auto-save every 30 seconds to prevent data loss
setInterval(() => {
    if (activeTabId && startTime && currentUrl) {
        debugLog('Heartbeat: Auto-saving current session');
        updateTime();
        // Reset timer after save
        startTime = Date.now();
    }
}, 30000); // 30 seconds

// 6. Browser Shutdown - Save before extension unloads
chrome.runtime.onSuspend.addListener(() => {
    debugLog('Extension suspending, saving current session');
    updateTime();
});
