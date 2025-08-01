document.addEventListener('DOMContentLoaded', function() {
    // --- 自定义对话框逻辑 ---
    const showCustomDialog = ({ title, message, showInput = false, placeholder = '', showSelect = false, groups = [] }) => {
        return new Promise((resolve) => {
            const overlay = document.getElementById('customDialogOverlay');
            const titleEl = document.getElementById('dialogTitle');
            const messageEl = document.getElementById('dialogMessage');
            const inputEl = document.getElementById('dialogInput');
            const selectEl = document.getElementById('dialogGroupSelect');
            const confirmBtn = document.getElementById('dialogConfirmBtn');
            const cancelBtn = document.getElementById('dialogCancelBtn');

            titleEl.textContent = title;
            messageEl.textContent = message;

            // 根据参数显示或隐藏输入框和选择框
            inputEl.style.display = showInput ? 'block' : 'none';
            selectEl.style.display = showSelect ? 'block' : 'none';
            
            // 如果两个都应该显示，调整一下布局
            if (showInput && showSelect) {
                 inputEl.style.display = 'none'; // 默认先隐藏输入框
                 inputEl.style.marginTop = '10px';
            } else {
                 inputEl.style.marginTop = '0';
            }

            if (showInput) {
                inputEl.value = '';
                inputEl.placeholder = placeholder;
                if(!showSelect) setTimeout(() => inputEl.focus(), 50);
            }

            if (showSelect) {
                selectEl.innerHTML = ''; // 清空旧选项
                groups.forEach(groupName => {
                    if (groupName !== '未分类') {
                        selectEl.add(new Option(groupName, groupName));
                    }
                });
                selectEl.add(new Option('[ 新建分组... ]', '__newgroup__'));
                // 自动选择第一个可用分组，或新建
                const firstGroup = groups.find(g => g !== '未分类');
                selectEl.value = firstGroup ? firstGroup : '__newgroup__';
            }

            overlay.classList.remove('hidden');

            const closeDialog = (value) => {
                overlay.classList.add('hidden');
                // 解绑所有事件
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;
                inputEl.onkeydown = null;
                selectEl.onchange = null;
                resolve(value);
            };

            confirmBtn.onclick = () => {
                let result;
                if (showSelect) {
                    if(selectEl.value === '__newgroup__'){
                       result = inputEl.value.trim();
                    } else {
                       result = selectEl.value;
                    }
                } else {
                    result = showInput ? inputEl.value.trim() : true;
                }
                closeDialog(result);
            };
            
            cancelBtn.onclick = () => closeDialog(null);

            if (showInput) {
                inputEl.onkeydown = (e) => { if (e.key === 'Enter') confirmBtn.click(); };
            }
            
            if (showSelect) {
                const handleSelectChange = () => {
                    if (selectEl.value === '__newgroup__') {
                        inputEl.style.display = 'block';
                        inputEl.placeholder = '请输入新分组名称';
                        setTimeout(() => inputEl.focus(), 50);
                    } else {
                        inputEl.style.display = 'none';
                    }
                };
                selectEl.onchange = handleSelectChange;
                handleSelectChange(); // 初始触发一次
            }
        });
    };

    // --- 获取所有需要的DOM元素 ---
    const focusScoreEl = document.getElementById('focusScore');
    const modeHardcoreBtn = document.getElementById('modeHardcore');
    const modeHybridBtn = document.getElementById('modeHybrid');
    const modeAiBtn = document.getElementById('modeAi');
    const aiControlArea = document.querySelector('.ai-control-area');
    const aiIntentInput = document.getElementById('aiIntentInput');
    const setIntentBtn = document.getElementById('setIntentBtn');
    const nameInput = document.getElementById('nameInput');
    const pathInput = document.getElementById('pathInput');
    const groupSelect = document.getElementById('groupSelect');
    const addBtn = document.getElementById('addBtn');
    const addCurrentPageBtn = document.getElementById('addCurrentPageBtn');
    const groupsContainer = document.getElementById('groupsContainer');
    const apiStatusContainer = document.getElementById('apiStatusContainer');
    const apiStatusText = document.getElementById('apiStatusText');
    const refreshApiBtn = document.getElementById('refreshApiBtn');

    // --- 全局变量 ---
    let groups = [];
    let currentMode = 'hybrid';

    // 更新API状态UI的函数
    const updateApiStatusUI = (status, provider, apiKeyExists) => {
        const isAiMode = currentMode === 'ai' || currentMode === 'hybrid';
        if (!isAiMode) {
            if(apiStatusContainer) apiStatusContainer.style.display = 'none';
            return;
        }
        if(apiStatusContainer) apiStatusContainer.style.display = 'flex';

        let text, className;
        if (!apiKeyExists) {
            text = 'API 未配置';
            className = 'error';
        } else if (status && status.checking) {
            text = 'API检查中...';
            className = 'checking';
        } else if (status && status.success) {
            text = `${provider.toUpperCase()} 状态正常`;
            className = 'success';
        } else if (status && !status.success) {
            text = `API 错误`;
            className = 'error';
        } else {
            text = `API 待验证`;
            className = 'checking';
        }
        
        if(apiStatusText) apiStatusText.textContent = text;
        if(apiStatusContainer) apiStatusContainer.className = 'api-status-popup ' + className;
    };
    
    // 手动刷新API状态的函数
    const handleRefreshApiStatus = () => {
        refreshApiBtn.classList.add('loading');
        chrome.storage.local.get(['ai_provider', 'api_key', 'openai_api_key'], data => {
            const provider = data.ai_provider || 'gemini';
            const apiKeyExists = provider === 'gemini' ? !!data.api_key : !!data.openai_api_key;
            if (!apiKeyExists) {
                updateApiStatusUI(null, provider, false);
                refreshApiBtn.classList.remove('loading');
                return;
            }
            updateApiStatusUI({ checking: true }, provider, true);
            chrome.runtime.sendMessage({ action: 'refresh_api_status' }, (result) => {
                updateApiStatusUI(result, provider, true);
                refreshApiBtn.classList.remove('loading');
            });
        });
    };

    // 初始化函数
    const initialize = async () => {
        const data = await chrome.storage.local.get([
            'groups', 'current_mode', 'ai_intent', 'focus_scores_history', 'ai_provider', 'api_key', 'openai_api_key'
        ]);
        
        groups = data.groups || [];
        currentMode = data.current_mode || 'hybrid';
        
        if (data.ai_intent) aiIntentInput.value = data.ai_intent;
        
        const scoresHistory = data.focus_scores_history || [];
        focusScoreEl.textContent = scoresHistory.length > 0 ? Math.round(scoresHistory.reduce((a, b) => a + b, 0) / scoresHistory.length) : '--';

        updateModeUI(currentMode);
        renderGroups();
        populateGroupSelect();

        modeHardcoreBtn.addEventListener('click', () => switchMode('hardcore'));
        modeHybridBtn.addEventListener('click', () => switchMode('hybrid'));
        modeAiBtn.addEventListener('click', () => switchMode('ai'));
        setIntentBtn.addEventListener('click', handleSetIntent);
        aiIntentInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSetIntent(); });
        addBtn.addEventListener('click', handleAdd);
        addCurrentPageBtn.addEventListener('click', handleAddCurrentPage);
        groupSelect.addEventListener('change', handleGroupSelectChange);
        groupsContainer.addEventListener('click', handleReclassifyClick);
        refreshApiBtn.addEventListener('click', handleRefreshApiStatus);
    };
    
    // 更新模式UI的函数
    const updateModeUI = (mode) => {
        currentMode = mode;
        modeHardcoreBtn.classList.toggle('active', mode === 'hardcore');
        modeHybridBtn.classList.toggle('active', mode === 'hybrid');
        modeAiBtn.classList.toggle('active', mode === 'ai');
        const isAiDisabled = (mode === 'hardcore');
        aiControlArea.style.opacity = isAiDisabled ? '0.5' : '1';
        aiIntentInput.disabled = isAiDisabled;
        setIntentBtn.disabled = isAiDisabled;

        chrome.storage.local.get(['ai_provider', 'api_key', 'openai_api_key'], data => {
            const provider = data.ai_provider || 'gemini';
            const apiKeyExists = provider === 'gemini' ? !!data.api_key : !!data.openai_api_key;
             chrome.storage.local.get(`api_status_${provider}`, statusData => {
                updateApiStatusUI(statusData[`api_status_${provider}`], provider, apiKeyExists);
            });
        });
    };

    const renderGroups = () => {
        groupsContainer.innerHTML = '';
        if (groups.length === 0) {
            groupsContainer.innerHTML = '<div class="empty-list">无锁定规则</div>';
            return;
        }
        groups.sort((a, b) => a.groupName.localeCompare(b.groupName));
        groups.forEach(group => {
            const groupContainer = document.createElement('div');
            groupContainer.className = 'group-container';
            const header = document.createElement('div');
            header.className = 'group-header collapsed';
            header.innerHTML = `<span class="group-name">${group.groupName}</span><i class="fas fa-chevron-down toggle-icon"></i>`;
            const sitesList = document.createElement('ul');
            sitesList.className = 'sites-list';
            group.sites.sort((a, b) => a.name.localeCompare(b.name));
            group.sites.forEach(site => {
                const li = document.createElement('li');
                li.className = 'locked-item';
                const reclassifyButtonHTML = group.groupName === '未分类' ? `<button class="reclassify-btn" data-path="${site.path}" title="重新分类"><i class="fas fa-folder-plus"></i></button>` : '';
                li.innerHTML = `<div class="site-info"><span class="site-name" title="${site.name}">${site.name}</span><span class="site-domain" title="${site.path}">${site.path}</span></div><div class="item-actions"><i class="fas fa-lock lock-icon" title="此规则已永久锁定"></i>${reclassifyButtonHTML}</div>`;
                sitesList.appendChild(li);
            });
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
                sitesList.classList.toggle('expanded');
            });
            groupContainer.appendChild(header);
            groupContainer.appendChild(sitesList);
            groupsContainer.appendChild(groupContainer);
        });
    };

    const populateGroupSelect = () => {
        const currentSelection = groupSelect.value;
        groupSelect.innerHTML = `<option value="__nogroup__">暂不分组</option><option value="__newgroup__" style="font-weight: bold; color: #007aff;">[ 新建分组... ]</option>`;
        groups.forEach(group => {
            if (group.groupName !== '未分类') {
                const option = document.createElement('option');
                option.value = group.groupName;
                option.textContent = group.groupName;
                groupSelect.appendChild(option);
            }
        });
        if (groupSelect.querySelector(`option[value="${currentSelection}"]`)) {
            groupSelect.value = currentSelection;
        }
    };

    const switchMode = (newMode) => {
        chrome.storage.local.set({ current_mode: newMode }, () => {
            updateModeUI(newMode);
        });
    };
    
    const handleSetIntent = () => {
        const intent = aiIntentInput.value.trim();
        if (intent) {
            chrome.storage.local.set({ ai_intent: intent }, () => {
                setIntentBtn.textContent = '已设定!';
                setTimeout(() => { setIntentBtn.textContent = '设定'; }, 1500);
            });
        }
    };
    
    const handleAdd = async () => {
        const customName = nameInput.value.trim();
        let path = pathInput.value.trim();
        if (!customName || !path) {
            alert('规则名称和URL路径都不能为空！'); return;
        }
        if (!path.includes('.') || /\s/.test(path)) {
            alert('URL路径格式无效！'); return;
        }
        path = path.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
        if (groups.some(g => g.sites.some(s => s.path === path))) {
            alert("这个精确路径已在锁定列表中！"); return;
        }
        
        const confirmed = await showCustomDialog({
            title: '永久锁定确认',
            message: `确定要永久锁定规则 "${customName}" 吗？此操作一旦确认将无法撤销。`,
        });

        if (confirmed) {
            const selectedGroup = groupSelect.value;
            const groupName = selectedGroup === '__nogroup__' || selectedGroup === '__newgroup__' ? '未分类' : selectedGroup;
            const newRule = { name: customName, path: path };
            let group = groups.find(g => g.groupName === groupName);
            if (group) group.sites.push(newRule);
            else groups.push({ groupName: groupName, sites: [newRule] });
            await chrome.storage.local.set({ groups: groups });
            nameInput.value = ''; pathInput.value = ''; groupSelect.value = '__nogroup__';
            renderGroups(); populateGroupSelect();
        }
    };

    const handleGroupSelectChange = async () => {
        if (groupSelect.value === '__newgroup__') {
            const newGroupName = await showCustomDialog({
                title: '新建分组',
                message: '请输入新分组的名称：',
                showInput: true,
                placeholder: '例如：工作、学习'
            });

            if (newGroupName) {
                if (!groups.some(g => g.groupName.toLowerCase() === newGroupName.toLowerCase())) {
                    const option = new Option(newGroupName, newGroupName, false, true);
                    groupSelect.add(option);
                } else {
                    alert('该分组已存在！');
                    groupSelect.value = newGroupName;
                }
            } else {
                groupSelect.value = '__nogroup__';
            }
        }
    };
    
    const handleAddCurrentPage = async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url && !tab.url.startsWith('chrome://')) {
                nameInput.value = tab.title || '当前页面';
                pathInput.value = tab.url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
                nameInput.focus();
            } else {
                alert('无法获取当前页面的信息。');
            }
        } catch (error) {
            alert('获取当前页面信息失败。');
        }
    };

    const handleReclassifyClick = async (event) => {
        const target = event.target.closest('.reclassify-btn');
        if (!target) return;
        
        const path_to_move = target.dataset.path;
        
        const newGroupName = await showCustomDialog({
            title: '重新分类',
            message: `请为 "${path_to_move}" 选择或创建一个新的分组：`,
            showSelect: true,
            showInput: true, // 也显示输入框，但由select控制
            groups: groups.map(g => g.groupName)
        });

        if (!newGroupName) return; // 用户取消或输入为空
        
        const trimmedGroupName = newGroupName.trim();
        if (trimmedGroupName === '未分类') return;

        const unclassifiedGroup = groups.find(g => g.groupName === '未分类');
        if (!unclassifiedGroup) return;
        
        const siteIndex = unclassifiedGroup.sites.findIndex(s => s.path === path_to_move);
        if (siteIndex === -1) return;
        
        const [siteToMove] = unclassifiedGroup.sites.splice(siteIndex, 1);
        if (unclassifiedGroup.sites.length === 0) {
            groups = groups.filter(g => g.groupName !== '未分类');
        }
        
        let targetGroup = groups.find(g => g.groupName.toLowerCase() === trimmedGroupName.toLowerCase());
        if (targetGroup) {
            targetGroup.sites.push(siteToMove);
        } else {
            groups.push({ groupName: trimmedGroupName, sites: [siteToMove] });
        }
        
        await chrome.storage.local.set({ groups: groups });
        renderGroups();
        populateGroupSelect();
    };

    initialize();
});