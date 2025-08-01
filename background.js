// background.js

import { getSettings, addToPermanentWhitelist, addToTemporaryPass, addToTodayPass } from './modules/storage.js';
import { isContentAllowedByAI } from './modules/ai.js';
import { isHardcoreBlocked } from './modules/utils.js';

// --- 全局变量 ---
const checkDebouncers = {};
const DEBOUNCE_DELAY = 750;
const MAX_SCORE_HISTORY = 100;
const lastAITriggerTime = {}; // 防止AI重复调用的时间锁

// --- 核心拦截逻辑 ---

// [规则模式] 监听器: 即时URL拦截
chrome.webNavigation.onCommitted.addListener(async (details) => {
    if (details.frameId !== 0 || !details.url.startsWith('http') || details.url.includes('interception.html')) {
        return;
    }
    const settings = await getSettings();
    const mode = settings.current_mode || 'hybrid';
    if ((mode === 'hardcore' || mode === 'hybrid') && isHardcoreBlocked(details.url, settings.groups)) {
        console.log(`[Path Blocker] 规则拦截 (即时): ${details.url}`);
        redirectToInterception(details.tabId, details.url, 'hardcore');
    }
});

const debouncedAICheck = async (tabId) => {
    try {
        const tab = await chrome.tabs.get(tabId);
        if (!tab || !tab.url || !tab.url.startsWith('http') || !tab.title) {
            return;
        }
        console.log(`[Path Blocker] AI开始分析: "${tab.title}"`);
        await performAIChecks(tab.id, tab.url, tab.title);
    } catch (error) {
        console.log(`[Path Blocker] AI无法获取标签页 ${tabId} 的信息。`);
    }
};

const triggerAICheck = (tabId) => {
    const now = Date.now();
    if (lastAITriggerTime[tabId] && (now - lastAITriggerTime[tabId] < 1000)) {
        return;
    }
    lastAITriggerTime[tabId] = now;
    if (checkDebouncers[tabId]) {
        clearTimeout(checkDebouncers[tabId]);
    }
    checkDebouncers[tabId] = setTimeout(() => debouncedAICheck(tabId), DEBOUNCE_DELAY);
};

const setupAIListeners = () => {
    const handleAICheckTrigger = async (tabId) => {
        const settings = await getSettings();
        const mode = settings.current_mode || 'hybrid';
        if (mode === 'ai' || mode === 'hybrid') {
            triggerAICheck(tabId);
        }
    };
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (tab.url && !tab.url.includes('interception.html') && (changeInfo.status === 'complete' || changeInfo.title)) {
            handleAICheckTrigger(tabId);
        }
    });
    chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
        if (details.frameId === 0 && details.url && !details.url.includes('interception.html')) {
            handleAICheckTrigger(details.tabId);
        }
    });
};
setupAIListeners();

chrome.tabs.onRemoved.addListener((tabId) => {
    if (checkDebouncers[tabId]) delete checkDebouncers[tabId];
    if (lastAITriggerTime[tabId]) delete lastAITriggerTime[tabId];
});

async function performAIChecks(tabId, url, title) {
    const oneTimePassKey = `oneTimePass_tab_${tabId}`;
    const sessionData = await chrome.storage.session.get(oneTimePassKey);
    const passUrl = sessionData[oneTimePassKey];
    if (passUrl && url === passUrl) {
        await chrome.storage.session.remove(oneTimePassKey);
        return;
    }
    const settings = await getSettings();
    const domain = new URL(url).hostname;
    if (settings.ai_permanent_whitelist?.includes(domain) || (settings.ai_temporary_pass?.[url] && Date.now() < settings.ai_temporary_pass[url])) {
        await updateFocusScore(100);
        return;
    }
    const aiResult = await isContentAllowedByAI(title, settings);
    if (aiResult.score !== -1) await updateFocusScore(aiResult.score);
    if (!aiResult.isAllowed) {
        const reason = `ai&intent=${encodeURIComponent(settings.ai_intent || '')}&title=${encodeURIComponent(title || '未知标题')}`;
        redirectToInterception(tabId, url, reason);
    }
}

async function updateFocusScore(score) {
    const { focus_scores_history: scores = [] } = await chrome.storage.local.get('focus_scores_history');
    scores.push(score);
    if (scores.length > MAX_SCORE_HISTORY) scores.shift();
    await chrome.storage.local.set({ focus_scores_history: scores });
}

function redirectToInterception(tabId, originalUrl, reason) {
    const interceptionUrl = chrome.runtime.getURL('interception.html');
    const targetUrl = `${interceptionUrl}?url=${encodeURIComponent(originalUrl)}&reason=${reason}&tabId=${tabId}`;
    // 使用您的方案，不修改历史记录
    chrome.tabs.update(tabId, { url: targetUrl });
}

async function testApiKey(provider, settings) {
    if (provider === 'gemini') {
        const { api_key: apiKey } = settings;
        if (!apiKey) return { success: false, error: 'API密钥未设置' };
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
            });
            if (response.ok) return { success: true };
            const errorData = await response.json();
            return { success: false, error: `API请求失败: ${errorData.error.message}` };
        } catch (e) {
            return { success: false, error: `网络错误: ${e.message}` };
        }
    } else if (provider === 'openai') {
        const { openai_api_url: baseUrl, openai_api_key: apiKey } = settings;
        if (!baseUrl || !apiKey) return { success: false, error: 'OpenAI配置不完整' };
        const apiUrl = `${baseUrl.replace(/\/$/, '')}/models`;
        try {
            const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${apiKey}` } });
            if (response.ok) return { success: true };
            const errorData = await response.json();
            return { success: false, error: `API请求失败: ${errorData.error.message}` };
        } catch (e) {
            return { success: false, error: `网络错误: ${e.message}` };
        }
    }
    return { success: false, error: '未知的AI提供商' };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'go_back' && request.tabId) {
        chrome.tabs.goBack(request.tabId, () => {
            chrome.tabs.goBack(request.tabId, () => {
                if (chrome.runtime.lastError) chrome.tabs.remove(request.tabId);
            });
        });
        return true;
    }
    if (request.action === 'grant_pass') {
        const { url, tabId, duration } = request;
        if (!url) return true;
        (async () => {
            const targetTabId = tabId || sender.tab.id;
            switch (duration) {
                case 'once': await chrome.storage.session.set({ [`oneTimePass_tab_${targetTabId}`]: url }); break;
                case 'hour': await addToTemporaryPass(url); break;
                case 'today': await addToTodayPass(url); break;
                case 'permanent': await addToPermanentWhitelist(new URL(url).hostname); break;
            }
            chrome.tabs.update(targetTabId, { url: url });
        })();
        return true;
    }
    if (request.action === 'validate_api') {
        testApiKey(request.provider, request.settings).then(result => {
            chrome.storage.local.set({ [`api_status_${request.provider}`]: result });
            sendResponse(result);
        });
        return true;
    }
    if (request.action === 'refresh_api_status') {
        getSettings().then(settings => {
            const provider = settings.ai_provider || 'gemini';
            testApiKey(provider, settings).then(result => {
                chrome.storage.local.set({ [`api_status_${provider}`]: result });
                sendResponse(result);
            });
        });
        return true;
    }
    return false;
});