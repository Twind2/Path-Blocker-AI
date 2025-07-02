// background.js

// 从新模块中导入所需的功能
import { getSettings, addToPermanentWhitelist, addToTemporaryPass, addToTodayPass } from './modules/storage.js';
import { isContentAllowedByAI } from './modules/ai.js';
import { isHardcoreBlocked } from './modules/utils.js';

// --- 核心监听器：当标签页更新时触发 ---
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // 仅在页面状态发生变化时（特别是URL变化）或加载完成时执行，过滤掉无关的更新
    if (!changeInfo.status) {
        return;
    }

    const { url, title } = tab;
    // 过滤掉无效URL或浏览器内部页面
    if (!url || !url.startsWith('http')) {
        return;
    }

    const oneTimePassKey = `oneTimePass_tab_${tabId}`;
    const sessionData = await chrome.storage.session.get(oneTimePassKey);
    const passUrl = sessionData[oneTimePassKey];

    // [第1步：处理单次通行证]
    if (passUrl) {
        // 如果当前页面的URL与通行证记录的URL匹配
        if (url === passUrl) {
            console.log(`[单次放行] 通行证有效，放行: ${url} (状态: ${changeInfo.status})`);
            // **关键修复1**：只有当页面完全加载完成时，才消费掉这个通行证
            if (changeInfo.status === 'complete') {
                await chrome.storage.session.remove(oneTimePassKey);
                console.log(`[单次放行] 页面加载完成，已消费通行证。`);
            }
            // 只要通行证有效，就立即停止所有后续的拦截检查
            return; 
        } else {
            // 如果用户在持有通行证的情况下导航到了一个全新的URL，说明旧的通行证已经无用，立即移除
            console.log(`[单次放行] 检测到导航到新页面，移除旧的通行证: ${passUrl}`);
            await chrome.storage.session.remove(oneTimePassKey);
        }
    }

    // [第2步：执行拦截逻辑 - 仅在页面加载完成后执行]
    // **关键修复2**：将所有拦截逻辑（包括昂贵的AI调用）都放在 status === 'complete' 的判断下
    // 这样可以确保只在最合适的时机执行一次检查，避免了重复调用API
    if (changeInfo.status === 'complete') {
        console.log(`[拦截分析] 页面加载完成，开始分析: ${url}`);
        
        const settings = await getSettings();
        const mode = settings.current_mode || 'hybrid';

        // 硬核模式
        if (mode === 'hardcore') {
            if (isHardcoreBlocked(url, settings.groups)) {
                console.log(`[硬核模式] 拦截: ${url}`);
                redirectToInterception(tabId, url, 'hardcore');
            }
            return;
        }

        // 混合模式与AI模式
        if (mode === 'ai' || mode === 'hybrid') {
            // 检查永久白名单和临时通行证
            if (settings.ai_permanent_whitelist?.includes(url) || (settings.ai_temporary_pass?.[url] && Date.now() < settings.ai_temporary_pass[url])) {
                console.log(`[通行证] 检查通过，放行: ${url}`);
                return;
            }

            // 检查硬核规则（混合模式下）
            if (mode === 'hybrid' && isHardcoreBlocked(url, settings.groups)) {
                console.log(`[混合模式-硬核] 拦截: ${url}`);
                redirectToInterception(tabId, url, 'hardcore');
                return;
            }

            // 检查AI意图
            if (!settings.ai_intent) {
                console.log("AI意图未设定，不进行AI检查。");
                return;
            }

            // **最终的AI调用**
            const isAllowed = await isContentAllowedByAI(title, settings.ai_intent, settings.api_key);
            if (!isAllowed) {
                console.log(`[AI模式] AI最终判断为拦截: ${title}`);
                const reason = `ai&intent=${encodeURIComponent(settings.ai_intent)}&title=${encodeURIComponent(title || '未知标题')}`;
                redirectToInterception(tabId, url, reason);
            } else {
                console.log(`[AI模式] AI最终判断为放行: ${title}`);
            }
        }
    }
});


// --- 消息监听器：处理来自拦截页面的指令 (此部分无需修改) ---
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    const { action, url, tabId, duration } = request;
    if (action !== 'grant_pass' || !url) return;

    const targetTabId = tabId || sender.tab.id;

    switch (duration) {
        case 'once':
            const oneTimePassKey = `oneTimePass_tab_${targetTabId}`;
            await chrome.storage.session.set({ [oneTimePassKey]: url });
            console.log(`[单次放行] 授权通行证: ${url} (Tab ID: ${targetTabId})`);
            break;
        case 'hour':
            await addToTemporaryPass(url);
            break;
        case 'today':
            await addToTodayPass(url);
            break;
        case 'permanent':
            await addToPermanentWhitelist(url);
            break;
    }
    // 放行后，重新加载页面
    chrome.tabs.update(targetTabId, { url: url });
});

/**
 * 辅助函数：将标签页重定向到拦截页面。(此部分无需修改)
 * @param {number} tabId - 目标标签页的ID。
 * @param {string} originalUrl - 被拦截的原始URL。
 * @param {string} reason - 拦截原因。
 */
function redirectToInterception(tabId, originalUrl, reason) {
    const interceptionUrl = chrome.runtime.getURL('interception.html');
    const targetUrl = `${interceptionUrl}?url=${encodeURIComponent(originalUrl)}&reason=${reason}&tabId=${tabId}`;
    chrome.tabs.update(tabId, { url: targetUrl });
}