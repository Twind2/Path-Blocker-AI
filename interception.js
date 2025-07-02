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
    const passDurationSelect = document.getElementById('pass-duration-select');
    const grantAccessBtn = document.getElementById('grant-access-btn');
    const goBackBtn = document.getElementById('go-back-btn');

    if (reason === 'hardcore') {
        reasonTitle.textContent = '硬核规则拦截';
        reasonMessage.textContent = '此页面匹配了您的永久锁定列表中的一条规则。';
        if (aiActionGroup) aiActionGroup.style.display = 'none';
    } else if (reason && reason.startsWith('ai')) {
        const intent = urlParams.get('intent');
        const title = urlParams.get('title');
        reasonTitle.textContent = 'AI 守护模式拦截';
        reasonMessage.textContent = 'AI 认为此页面与您当前的意图不符。';
        document.getElementById('intent').textContent = intent || '未设定';
        document.getElementById('title').textContent = title || '无法获取';
        aiDetails.style.display = 'block';
    }
    
    // “确认放行”按钮事件
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

    // “返回”按钮事件 (已修改)
    if (goBackBtn) {
        goBackBtn.addEventListener('click', () => {
            // 通过发送消息给background.js来处理返回操作，这比window.history.back()更可靠
            if (tabId) {
                chrome.runtime.sendMessage({ action: 'go_back', tabId: tabId });
            } else {
                // 如果没有tabId作为备用方案，则尝试关闭窗口
                window.close();
            }
        });
    }
});