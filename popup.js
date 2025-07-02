document.addEventListener('DOMContentLoaded', function() {
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
    
    // --- 全局变量 ---
    let groups = [];
    let currentMode = 'hybrid';

    // --- 主函数：程序入口 ---
    const initialize = async () => {
        // 并行获取所有需要的设置和数据
        const data = await chrome.storage.local.get([
            'groups',
            'current_mode',
            'ai_intent',
            'focus_scores_history' // 获取全局评分历史
        ]);
        
        // --- 更新专注度评分UI (逻辑已修改) ---
        const scoresHistory = data.focus_scores_history || [];
        if (scoresHistory.length > 0) {
            // 计算平均分
            const sum = scoresHistory.reduce((total, score) => total + score, 0);
            const average = Math.round(sum / scoresHistory.length);
            focusScoreEl.textContent = average;
        } else {
            focusScoreEl.textContent = '--'; // 如果没有历史记录，则显示默认值
        }

        // --- 加载其他设置 ---
        groups = data.groups || [];
        currentMode = data.current_mode || 'hybrid';
        if (data.ai_intent) {
            aiIntentInput.value = data.ai_intent;
        }

        updateModeUI(currentMode);
        renderGroups();
        populateGroupSelect();

        // --- 绑定事件监听器 ---
        modeHardcoreBtn.addEventListener('click', () => switchMode('hardcore'));
        modeHybridBtn.addEventListener('click', () => switchMode('hybrid'));
        modeAiBtn.addEventListener('click', () => switchMode('ai'));
        setIntentBtn.addEventListener('click', handleSetIntent);
        aiIntentInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSetIntent(); });
        addBtn.addEventListener('click', handleAdd);
        addCurrentPageBtn.addEventListener('click', handleAddCurrentPage);
        groupSelect.addEventListener('change', handleGroupSelectChange);
        groupsContainer.addEventListener('click', handleReclassifyClick);
    };

    // --- UI渲染与更新函数 (无修改) ---
    const updateModeUI = (mode) => {
        modeHardcoreBtn.classList.toggle('active', mode === 'hardcore');
        modeHybridBtn.classList.toggle('active', mode === 'hybrid');
        modeAiBtn.classList.toggle('active', mode === 'ai');
        const isAiDisabled = (mode === 'hardcore');
        aiControlArea.style.opacity = isAiDisabled ? '0.5' : '1';
        aiIntentInput.disabled = isAiDisabled;
        setIntentBtn.disabled = isAiDisabled;
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
                const reclassifyButtonHTML = group.groupName === '未分类' ?
                    `<button class="reclassify-btn" data-path="${site.path}" title="重新分类"><i class="fas fa-folder-plus"></i></button>` : '';
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

    // --- 事件处理函数 (无修改) ---
    const switchMode = (newMode) => {
        currentMode = newMode;
        chrome.storage.local.set({ current_mode: newMode });
        updateModeUI(newMode);
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
        const selectedGroup = groupSelect.value;
        if (!customName || !path) { alert('规则名称和URL路径都不能为空！'); return; }
        if (!isValidPath(path)) { alert('URL路径格式无效！请输入类似 "example.com/path" 的格式。'); return; }
        path = cleanPath(path);
        const groupName = selectedGroup === '__nogroup__' || selectedGroup === '__newgroup__' ? '未分类' : selectedGroup;
        if (groups.some(g => g.sites.some(s => s.path === path))) { alert("这个精确路径已在锁定列表中！"); return; }
        if (window.confirm(`确定要永久锁定规则 "${customName}" 吗？\n\n一旦确认将无法撤销。`)) {
            const newRule = { name: customName, path: path };
            let group = groups.find(g => g.groupName === groupName);
            if (group) group.sites.push(newRule);
            else groups.push({ groupName: groupName, sites: [newRule] });
            await saveAndApply();
            nameInput.value = ''; pathInput.value = ''; groupSelect.value = '__nogroup__';
            renderGroups(); populateGroupSelect();
        }
    };

    const handleGroupSelectChange = () => {
        if (groupSelect.value === '__newgroup__') {
            const newGroupName = prompt('请输入新分组的名称：');
            if (newGroupName && newGroupName.trim()) {
                const trimmedName = newGroupName.trim();
                if (!groups.some(g => g.groupName.toLowerCase() === trimmedName.toLowerCase())) {
                    const option = new Option(trimmedName, trimmedName);
                    groupSelect.appendChild(option);
                    option.selected = true;
                } else {
                    alert('该分组已存在！'); groupSelect.value = trimmedName;
                }
            } else { groupSelect.value = '__nogroup__'; }
        }
    };
    
    const handleAddCurrentPage = async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url && !tab.url.startsWith('chrome://')) {
                nameInput.value = tab.title || '当前页面';
                pathInput.value = cleanPath(tab.url);
                nameInput.focus();
            } else { alert('无法获取当前页面的信息。'); }
        } catch (error) { alert('获取当前页面信息失败。'); }
    };

    const handleReclassifyClick = async (event) => {
        const target = event.target.closest('.reclassify-btn');
        if (!target) return;
        const path_to_move = target.dataset.path;
        const newGroupName = prompt('请输入新的分组名称：');
        if (!newGroupName || !newGroupName.trim() || newGroupName.trim() === '未分类') return;
        const trimmedGroupName = newGroupName.trim();
        const unclassifiedGroup = groups.find(g => g.groupName === '未分类');
        if (!unclassifiedGroup) return;
        const siteIndex = unclassifiedGroup.sites.findIndex(s => s.path === path_to_move);
        if (siteIndex === -1) return;
        const [siteToMove] = unclassifiedGroup.sites.splice(siteIndex, 1);
        if (unclassifiedGroup.sites.length === 0) groups = groups.filter(g => g.groupName !== '未分类');
        let targetGroup = groups.find(g => g.groupName === trimmedGroupName);
        if (targetGroup) targetGroup.sites.push(siteToMove);
        else groups.push({ groupName: trimmedGroupName, sites: [siteToMove] });
        await saveAndApply(); renderGroups(); populateGroupSelect();
    };

    // --- 辅助函数 ---
    const isValidPath = (path) => path.includes('.') && !/\s/.test(path);
    const cleanPath = (path) => path.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    const saveAndApply = async () => await chrome.storage.local.set({ groups: groups });

    // --- 启动程序 ---
    initialize();
});