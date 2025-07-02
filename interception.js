document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const originalUrl = urlParams.get('url');
    const reason = urlParams.get('reason');
    const tabId = parseInt(urlParams.get('tabId'), 10);

    const urlElement = document.getElementById('original-url');
    if (originalUrl) {
        urlElement.textContent = originalUrl;
    }

    const reasonTitle = document.getElementById('reason-title');
    const reasonMessage = document.getElementById('reason-message');
    const aiDetails = document.getElementById('ai-details');
    const aiActionGroup = document.getElementById('ai-action-group');

    // 获取新的UI元素
    const passDurationSelect = document.getElementById('pass-duration-select');
    const grantAccessBtn = document.getElementById('grant-access-btn');

    if (reason === 'hardcore') {
        reasonTitle.textContent = '硬核规则拦截';
        reasonMessage.textContent = '此页面匹配了您的永久锁定列表中的一条规则。';
        // 在硬核模式下隐藏AI放行选项
        if(aiActionGroup) aiActionGroup.style.display = 'none';
    } else if (reason.startsWith('ai')) {
        const intent = urlParams.get('intent');
        const title = urlParams.get('title');
        reasonTitle.textContent = 'AI 守护模式拦截';
        reasonMessage.textContent = 'AI 认为此页面与您当前的意图不符。';
        document.getElementById('intent').textContent = intent || '未设定';
        document.getElementById('title').textContent = title || '无法获取';
        aiDetails.style.display = 'block';
    }
    
    // 为新的“确认放行”按钮绑定事件
    if (grantAccessBtn) {
        grantAccessBtn.addEventListener('click', () => {
            const selectedDuration = passDurationSelect.value;
            if (!originalUrl || !selectedDuration) return;

            chrome.runtime.sendMessage({ 
                action: 'grant_pass', 
                url: originalUrl, 
                tabId: tabId,
                duration: selectedDuration 
            });
        });
    }

    document.getElementById('go-back-btn').addEventListener('click', () => {
        window.history.length > 1 ? window.history.back() : window.close();
    });
});