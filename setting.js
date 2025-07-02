document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 元素获取 ---
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    const clearWhitelistBtn = document.getElementById('clearWhitelistBtn');
    const clearPassesBtn = document.getElementById('clearPassesBtn');

    // --- 初始化 ---
    const initialize = async () => {
        const data = await chrome.storage.local.get('api_key');
        if (data.api_key) {
            apiKeyInput.placeholder = "API 密钥已设定，可在此更新";
        }
    };

    // --- 事件处理函数 ---

    // 保存 API 密钥
    const handleSaveApiKey = () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.local.set({ api_key: apiKey }, () => {
                apiKeyInput.value = "";
                apiKeyInput.placeholder = "新密钥已保存！";
                alert("API 密钥已成功保存。");
            });
        } else {
            alert("请输入有效的 API 密钥！");
        }
    };

    // 导出规则
    const handleExport = async () => {
        const data = await chrome.storage.local.get('groups');
        if (!data.groups || data.groups.length === 0) {
            alert("没有可导出的锁定规则。");
            return;
        }
        const jsonString = JSON.stringify(data.groups, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `path-blocker-rules-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 导入规则
    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedGroups = JSON.parse(e.target.result);
                if (Array.isArray(importedGroups)) {
                    // 这里可以添加更复杂的合并逻辑，例如合并现有规则
                    // 为了简单起见，我们直接覆盖
                    if(confirm("导入将覆盖所有现有规则，确定吗？")) {
                        chrome.storage.local.set({ groups: importedGroups }, () => {
                            alert("规则已成功导入！");
                        });
                    }
                } else {
                    throw new Error("文件格式不正确。");
                }
            } catch (error) {
                alert(`导入失败：${error.message}`);
            }
        };
        reader.readAsText(file);
    };
    
    // 清空永久白名单
    const handleClearWhitelist = () => {
        if(confirm("确定要清空所有永久信任的网站吗？此操作不可撤销。")) {
            chrome.storage.local.set({ ai_permanent_whitelist: [] }, () => {
                alert("永久白名单已清空。");
            });
        }
    };
    
    // 清除临时通行证
    const handleClearPasses = () => {
        if(confirm("确定要清除所有网站的临时通行证吗？")) {
            chrome.storage.local.set({ ai_temporary_pass: {} }, () => {
                alert("所有临时通行证已被清除。");
            });
        }
    };


    // --- 事件监听器绑定 ---
    saveApiKeyBtn.addEventListener('click', handleSaveApiKey);
    apiKeyInput.addEventListener('keydown', e => {
        if(e.key === 'Enter') handleSaveApiKey();
    });

    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', handleImport);

    clearWhitelistBtn.addEventListener('click', handleClearWhitelist);
    clearPassesBtn.addEventListener('click', handleClearPasses);

    // --- 启动 ---
    initialize();
});