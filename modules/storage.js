/**
 * 获取所有扩展所需的核心设置。
 * @returns {Promise<object>}
 */
export async function getSettings() {
    return await chrome.storage.local.get([
        'current_mode',
        'ai_intent',
        'groups',
        'api_key',
        'ai_permanent_whitelist',
        'ai_temporary_pass'
    ]);
}

/**
 * 将URL添加到永久白名单。
 * @param {string} url - 要添加的URL。
 */
export async function addToPermanentWhitelist(url) {
    const { ai_permanent_whitelist = [] } = await chrome.storage.local.get('ai_permanent_whitelist');
    if (!ai_permanent_whitelist.includes(url)) {
        ai_permanent_whitelist.push(url);
        await chrome.storage.local.set({ ai_permanent_whitelist });
        console.log(`已将 ${url} 添加到永久白名单`);
    }
}

/**
 * 为URL添加临时通行证（有效期1小时）。
 * @param {string} url - 要添加的URL。
 */
export async function addToTemporaryPass(url) {
    const { ai_temporary_pass = {} } = await chrome.storage.local.get('ai_temporary_pass');
    // 设置通行证的过期时间为当前时间的1小时后
    ai_temporary_pass[url] = Date.now() + 60 * 60 * 1000; 
    await chrome.storage.local.set({ ai_temporary_pass });
    console.log(`已为 ${url} 添加临时通行证`);
}

/**
 * 新增：为URL添加临时通行证（有效期至当天午夜）。
 * @param {string} url - 要添加的URL。
 */
export async function addToTodayPass(url) {
    const { ai_temporary_pass = {} } = await chrome.storage.local.get('ai_temporary_pass');
    
    // 计算今天午夜的时间戳
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    // 设置通行证的过期时间
    ai_temporary_pass[url] = endOfToday.getTime(); 
    await chrome.storage.local.set({ ai_temporary_pass });
    console.log(`已为 ${url} 添加临时通行证，有效期至今日结束`);
}