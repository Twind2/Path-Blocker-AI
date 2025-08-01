document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 元素获取 ---
    const aiProviderSelect = document.getElementById('aiProviderSelect');
    const geminiSettings = document.getElementById('gemini-settings');
    const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
    const saveGeminiApiKeyBtn = document.getElementById('saveGeminiApiKeyBtn');
    const geminiStatusEl = document.getElementById('gemini-status');
    const openaiSettings = document.getElementById('openai-settings');
    const openaiApiUrlInput = document.getElementById('openaiApiUrlInput');
    const openaiApiKeyInput = document.getElementById('openaiApiKeyInput');
    const openaiModelSelect = document.getElementById('openaiModelSelect');
    const fetchModelsBtn = document.getElementById('fetchModelsBtn');
    const saveOpenaiSettingsBtn = document.getElementById('saveOpenaiSettingsBtn');
    const openaiStatusEl = document.getElementById('openai-status');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    const clearWhitelistBtn = document.getElementById('clearWhitelistBtn');
    const clearPassesBtn = document.getElementById('clearPassesBtn');

    // (已修改) 更新状态UI的函数
    const updateStatusUI = (element, result, providerName) => {
        if (!element) return;
        
        element.style.display = 'block'; // 总是显示
        let text, className;

        if (!result) { // 对应未设置的情况
            text = `${providerName} API 密钥未配置`;
            className = 'error';
        } else if (result.checking) {
            text = `验证中...`;
            className = 'checking';
        } else if (result.success) {
            text = `${providerName} API 配置有效，已保存！`;
            className = 'success';
        } else {
            text = `验证失败: ${result.error}`;
            className = 'error';
        }
        
        element.textContent = text;
        element.className = 'api-status-indicator ' + className;
    };

    const updateVisibleSettings = (provider) => {
        geminiSettings.style.display = (provider === 'gemini') ? 'block' : 'none';
        openaiSettings.style.display = (provider === 'openai') ? 'block' : 'none';
    };

    const handleProviderChange = () => {
        const provider = aiProviderSelect.value;
        chrome.storage.local.set({ ai_provider: provider }, () => {
            updateVisibleSettings(provider);
        });
    };

    const handleSaveGeminiApiKey = () => {
        const apiKey = geminiApiKeyInput.value.trim();
        if (!apiKey) {
            alert("请输入有效的 Gemini API 密钥！");
            return;
        }
        updateStatusUI(geminiStatusEl, { checking: true }, 'Gemini');
        const settings = { api_key: apiKey };
        chrome.runtime.sendMessage({ action: 'validate_api', provider: 'gemini', settings }, (result) => {
            if (result.success) {
                chrome.storage.local.set({ api_key: apiKey });
                geminiApiKeyInput.value = "";
                geminiApiKeyInput.placeholder = "新 Gemini 密钥已保存！";
            }
            updateStatusUI(geminiStatusEl, result, 'Gemini');
        });
    };

    const handleFetchOpenAIModels = async () => {
        const baseUrl = openaiApiUrlInput.value.trim();
        const apiKey = openaiApiKeyInput.value.trim() || openaiApiKeyInput.placeholder;
        if (!baseUrl || !apiKey || apiKey.includes("已设定")) {
            alert("请先输入 OpenAI API 基础地址和有效的密钥。");
            return;
        }
        fetchModelsBtn.textContent = '获取中...';
        fetchModelsBtn.disabled = true;
        try {
            const response = await fetch(`${baseUrl}/models`, { headers: { 'Authorization': `Bearer ${apiKey}` } });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`(${response.status}) ${errorData.error.message}`);
            }
            const { data } = await response.json();
            const models = data.filter(m => m.id.includes('gpt')).map(m => m.id).sort();
            openaiModelSelect.innerHTML = '<option value="">-- 请选择一个模型 --</option>';
            models.forEach(modelId => {
                const option = new Option(modelId, modelId);
                openaiModelSelect.appendChild(option);
            });
            openaiModelSelect.disabled = false;
            saveOpenaiSettingsBtn.disabled = false;
            alert(`成功获取 ${models.length} 个模型！请选择并保存。`);
        } catch (error) {
            alert(`获取模型失败：${error.message}`);
        } finally {
            fetchModelsBtn.textContent = '获取模型';
            fetchModelsBtn.disabled = false;
        }
    };

    const handleSaveOpenaiSettings = () => {
        const settingsToSave = {
            openai_api_url: openaiApiUrlInput.value.trim(),
            openai_model: openaiModelSelect.value,
            openai_api_key: openaiApiKeyInput.value.trim()
        };
        chrome.storage.local.get('openai_api_key', async (storedData) => {
            if (!settingsToSave.openai_api_key && storedData.openai_api_key) {
                settingsToSave.openai_api_key = storedData.openai_api_key;
            }
            if (!settingsToSave.openai_api_url || !settingsToSave.openai_model || !settingsToSave.openai_api_key) {
                alert("API基础地址、密钥和模型均不能为空！"); return;
            }
            updateStatusUI(openaiStatusEl, { checking: true }, 'OpenAI');
            chrome.runtime.sendMessage({ action: 'validate_api', provider: 'openai', settings: settingsToSave }, (result) => {
                if (result.success) {
                    let finalSettings = { openai_api_url: settingsToSave.openai_api_url, openai_model: settingsToSave.openai_model };
                    if(openaiApiKeyInput.value.trim()) finalSettings.openai_api_key = openaiApiKeyInput.value.trim();
                    chrome.storage.local.set(finalSettings, () => {
                        if (openaiApiKeyInput.value.trim()) {
                            openaiApiKeyInput.value = "";
                            openaiApiKeyInput.placeholder = "新 OpenAI 密钥已保存！";
                        }
                    });
                }
                updateStatusUI(openaiStatusEl, result, 'OpenAI');
            });
        });
    };

    const handleExport = async () => {
        const { groups } = await chrome.storage.local.get('groups');
        if (!groups || groups.length === 0) { alert("没有可导出的锁定规则。"); return; }
        const blob = new Blob([JSON.stringify(groups, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `path-blocker-rules-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedGroups = JSON.parse(e.target.result);
                if (Array.isArray(importedGroups) && confirm("导入将覆盖所有现有规则，确定吗？")) {
                    chrome.storage.local.set({ groups: importedGroups }, () => alert("规则已成功导入！"));
                } else { throw new Error("文件格式不正确或操作已取消。"); }
            } catch (error) { alert(`导入失败：${error.message}`); }
        };
        reader.readAsText(file);
    };

    const handleClearWhitelist = () => {
        if (confirm("确定要清空所有永久信任的网站吗？此操作不可撤销。")) {
            chrome.storage.local.set({ ai_permanent_whitelist: [] }, () => alert("永久白名单已清空。"));
        }
    };

    const handleClearPasses = () => {
        if (confirm("确定要清除所有网站的临时通行证吗？")) {
            chrome.storage.local.set({ ai_temporary_pass: {} }, () => alert("所有临时通行证已被清除。"));
        }
    };

    // (已修改) 初始化函数
    const initialize = async () => {
        const data = await chrome.storage.local.get([
            'ai_provider', 'api_key', 'openai_api_url', 'openai_api_key', 'openai_model',
            'api_status_gemini', 'api_status_openai'
        ]);
        
        aiProviderSelect.value = data.ai_provider || 'gemini';
        updateVisibleSettings(aiProviderSelect.value);

        if (data.api_key) {
            geminiApiKeyInput.placeholder = "Gemini API 密钥已设定";
            updateStatusUI(geminiStatusEl, data.api_status_gemini || { success: true }, 'Gemini');
        } else {
            updateStatusUI(geminiStatusEl, null, 'Gemini');
        }

        if (data.openai_api_url) openaiApiUrlInput.value = data.openai_api_url;

        if (data.openai_api_key) {
            openaiApiKeyInput.placeholder = "OpenAI API 密钥已设定";
            updateStatusUI(openaiStatusEl, data.api_status_openai || { success: true }, 'OpenAI');
        } else {
            updateStatusUI(openaiStatusEl, null, 'OpenAI');
        }

        if (data.openai_model) {
            const option = new Option(data.openai_model, data.openai_model, true, true);
            openaiModelSelect.appendChild(option);
            openaiModelSelect.disabled = false;
            saveOpenaiSettingsBtn.disabled = false;
        }

        aiProviderSelect.addEventListener('change', handleProviderChange);
        saveGeminiApiKeyBtn.addEventListener('click', handleSaveGeminiApiKey);
        geminiApiKeyInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSaveGeminiApiKey(); });
        fetchModelsBtn.addEventListener('click', handleFetchOpenAIModels);
        saveOpenaiSettingsBtn.addEventListener('click', handleSaveOpenaiSettings);
        exportBtn.addEventListener('click', handleExport);
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', handleImport);
        clearWhitelistBtn.addEventListener('click', handleClearWhitelist);
        clearPassesBtn.addEventListener('click', handleClearPasses);
    };

    initialize();
});