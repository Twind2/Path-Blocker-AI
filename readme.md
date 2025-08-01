# Path Blocker (AI版) - 您的终极数字专注力守护者

[![Stunning UI](https://img.shields.io/badge/UI-%E7%B2%BE%E7%BE%8E%E7%95%8C%E9%9D%A2-blueviolet)](setting.html)
[![Intelligent AI](https://img.shields.io/badge/AI-%E6%99%BA%E8%83%BD%E5%AE%88%E6%8A%A4-orange)](modules/ai.js)
[![Hardcore Mode](https://img.shields.io/badge/%E6%A8%A1%E5%BC%8F-%E7%A1%AC%E6%A0%B8%E9%94%81%E5%AE%9A-red)](background.js)

**Path Blocker (AI版)** 是一款为追求极致专注而生的浏览器扩展程序。它不再是一个简单的网站拦截器，而是您个性化的、由AI驱动的数字纪律助理，旨在保护您最宝贵的资源——注意力。

[English](#en) | [简体中文](#zh-cn)

---

## <a name="zh-cn"></a>核心功能

* **永久锁定模式 (Hardcore Mode)**: 您可以将那些“时间黑洞”网站（如社交媒体、新闻聚合站）添加到永久锁定列表。一旦添加，**规则无法删除或修改**，为您提供最强大的防干扰屏障。

* **AI守护模式 (AI Guardian Mode)**: 这才是本扩展的灵魂所在。
    * **设定意图**: 您可以设定当前的工作或学习目标，例如“学习React”或“撰写季度报告”。
    * **智能分析**: AI守护者会实时分析您访问的每一个页面的**标题**，并根据其内容与您设定意图的相关度进行评分。
    * **精准拦截**: 如果AI认为页面内容与您的意图无关（例如，在学习编程时打开了娱乐新闻），它将自动拦截该页面，并向您解释原因。

* **混合模式 (Hybrid Mode)**: 两全其美的最佳选择。它会优先执行您的永久锁定规则，在此基础上，再由AI守护您的浏览行为，确保最大化的专注力。

* **灵活的白名单与通行证**: AI并非完美。如果它误拦了您需要的网站，您只需轻轻一点，即可授予**临时通行证**（如仅本次、一小时或当天有效）或将其域名**永久加入白名单**。

* **精美的用户界面与交互**:
    * **实时API状态**: 在弹窗和设置页，您可以直观地看到当前AI服务的连接状态，并能**手动刷新**以获取最新状态。
    * **美观的对话框**: 所有的确认、输入操作都由**精心设计的自定义对话框**完成，告别浏览器原生弹窗的糟糕体验。
    * **智能分组管理**: 您可以轻松地将锁定的规则分组管理。在为规则重新分类时，系统会提供**包含现有分组的下拉菜单**，让您的操作更高效。

---

## 工作原理

1.  **选择您的模式**:
    * **规则模式**: 仅激活您的永久锁定列表，执行最严格的URL路径匹配拦截。
    * **AI模式**: 仅由AI守护。设定您的意图，让AI保护您的专注力。
    * **混合模式 (推荐)**: 优先匹配规则列表，然后由AI进行二次守护。

2.  **设定您的意图**: 在AI或混合模式下，告诉AI您当前的任务。这个上下文是AI做出智能拦截决策的**关键**。

3.  **配置您的AI服务**:
    * **支持多种模型**: 您可以在`设置`页面选择使用 **Google Gemini** 或 **OpenAI GPT** 作为您的AI分析引擎。
    * **API密钥配置**: 您需要提供自己选择的AI服务的API密钥。设置页面提供了**实时API有效性验证**功能，确保您的配置准确无误。

4.  **建立您的规则库**:
    * **一键锁定**: 在弹窗中，可以一键将当前页面添加到锁定列表。
    * **手动添加**: 手动输入规则名称和URL路径，并将其归入特定分组。

---

## <a name="en"></a>Core Features (English)

* **Hardcore Mode**: Add distracting websites to a permanent blocklist. Once a rule is added, it **cannot be deleted or modified**, providing the strongest protection.

* **AI Guardian Mode**: The soul of this extension.
    * **Set Your Intention**: Define your current work or study goal, such as "Learning React" or "Writing a quarterly report".
    * **Intelligent Analysis**: The AI guardian analyzes the **title** of every page you visit in real-time, scoring its relevance to your set intention.
    * **Precise Interception**: If the AI deems the content irrelevant to your goal (e.g., opening entertainment news while studying programming), it will automatically block the page and explain why.

* **Hybrid Mode**: The best of both worlds. It prioritizes your permanent blocklist and then uses the AI Guardian to keep you focused.

* **Flexible Whitelisting & Passes**: The AI isn't perfect. If it blocks a site you need, you can grant a **temporary pass** (e.g., for this instance, one hour, or until the end of the day) or **permanently whitelist** the domain with a single click.

* **Refined UI & UX**:
    * **Real-time API Status**: Both the popup and settings page display the live status of your AI service connection, complete with a **manual refresh button**.
    * **Beautiful Custom Dialogs**: All confirmation and input actions are handled by **well-designed custom dialogs**, replacing the clunky native browser popups.
    * **Smart Group Management**: Easily organize your locked rules into groups. When reclassifying a rule, the system provides a **dropdown menu of existing groups** for efficient organization.

---

[![Star History Chart](https://api.star-history.com/svg?repos=Twind2/Path-Blocker-AI&type=Date)](https://star-history.com/#repos=Twind2/Path-Blocker-AI&Date)
