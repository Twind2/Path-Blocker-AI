/**
 * 检查给定URL是否在用户的永久锁定列表中。
 * @param {string} url - 要检查的URL。
 * @param {Array} groups - 从chrome.storage中获取的所有规则组。
 * @returns {boolean} - 如果URL匹配任何锁定规则，则返回true。
 */
export function isHardcoreBlocked(url, groups) {
    if (!groups || groups.length === 0) {
        return false;
    }
    // 将所有分组内的站点规则扁平化为一个数组，然后进行检查
    const allSites = groups.flatMap(group => group.sites);
    return allSites.some(site => url.includes(site.path));
}