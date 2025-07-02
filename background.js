// background.js

import { getSettings, addToPermanentWhitelist, addToTemporaryPass, addToTodayPass } from './modules/storage.js';
import { isContentAllowedByAI } from './modules/ai.js';
import { isHardcoreBlocked } from './modules/utils.js';

const MAX_SCORE_HISTORY = 100; // 存储最近100条评分用于计算平均值

// --- 核心监听器：当标签页更新时触发 ---
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (!changeInfo.status) return;

    const { url, title } = tab;
    if (!url || !url.startsWith('http')) return;

    const oneTimePassKey = `oneTimePass_tab_${tabId}`;
    const sessionData = await chrome.storage.session.get(oneTimePassKey);
    const passUrl = sessionData[oneTimePassKey];

    if (passUrl) {
        if (url === passUrl) {
            if (changeInfo.status === 'complete') await chrome.storage.session.remove(oneTimePassKey);
            return; 
        } else {
            await chrome.storage.session.remove(oneTimePassKey);
        }
    }

    if (changeInfo.status === 'complete') {
        const settings = await getSettings();
        const mode = settings.current_mode || 'hybrid';

        if (mode === 'hardcore') {
            if (isHardcoreBlocked(url, settings.groups)) {
                redirectToInterception(tabId, url, 'hardcore');
            }
            return;
        }

        if (mode === 'ai' || mode === 'hybrid') {
            // --- 核心修复逻辑 ---
            // 检查白名单或临时通行证
            if (settings.ai_permanent_whitelist?.includes(url) || (settings.ai_temporary_pass?.[url] && Date.now() < settings.ai_temporary_pass[url])) {
                console.log(`[通行证] 检查通过，为 ${url} 记录满分100`);
                
                // 为受信任的网站手动记录100分
                const data = await chrome.storage.local.get('focus_scores_history');
                let scores = data.focus_scores_history || [];
                scores.push(100); // 添加满分
                if (scores.length > MAX_SCORE_HISTORY) scores.shift(); // 维持数组长度
                await chrome.storage.local.set({ 'focus_scores_history': scores });

                // 记录分数后，即可安全返回，不再执行后续AI调用
                return;
            }

            // [混合模式] 检查硬核规则
            if (mode === 'hybrid' && isHardcoreBlocked(url, settings.groups)) {
                redirectToInterception(tabId, url, 'hardcore');
                return;
            }

            // AI调用与评分逻辑
            const aiResult = await isContentAllowedByAI(title, settings);
            
            if (aiResult.score !== -1) {
                const data = await chrome.storage.local.get('focus_scores_history');
                let scores = data.focus_scores_history || [];
                scores.push(aiResult.score);
                if (scores.length > MAX_SCORE_HISTORY) scores.shift();
                await chrome.storage.local.set({ 'focus_scores_history': scores });
                console.log(`全局专注度评分历史已更新。当前记录数: ${scores.length}`);
            }

            // 根据决策进行拦截
            if (!aiResult.isAllowed) {
                console.log(`[AI模式] AI判断为拦截: ${title}`);
                const reason = `ai&intent=${encodeURIComponent(settings.ai_intent)}&title=${encodeURIComponent(title || '未知标题')}`;
                redirectToInterception(tabId, url, reason);
            } else {
                console.log(`[AI模式] AI判断为放行: ${title}`);
            }
        }
    }
});

// --- 消息监听器 (无需修改) ---
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'go_back') {
        chrome.tabs.goBack(request.tabId, () => {
            if (chrome.runtime.lastError) {
                chrome.tabs.remove(request.tabId);
            }
        });
        return;
    }

    if (request.action === 'grant_pass') {
        const { url, tabId, duration } = request;
        if (!url) return;
        const targetTabId = tabId || sender.tab.id;
        switch (duration) {
            case 'once':
                await chrome.storage.session.set({ [`oneTimePass_tab_${targetTabId}`]: url });
                break;
            case 'hour': await addToTemporaryPass(url); break;
            case 'today': await addToTodayPass(url); break;
            case 'permanent': await addToPermanentWhitelist(url); break;
        }
        chrome.tabs.update(targetTabId, { url: url });
    }
});

// --- 辅助函数 (无需修改) ---
function redirectToInterception(tabId, originalUrl, reason) {
    const interceptionUrl = chrome.runtime.getURL('interception.html');
    const targetUrl = `${interceptionUrl}?url=${encodeURIComponent(originalUrl)}&reason=${reason}&tabId=${tabId}`;
    chrome.tabs.update(tabId, { url: targetUrl });
}