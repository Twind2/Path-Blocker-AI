# Path Blocker (AI Edition) - README

[English](#en) | [简体中文](#zh-cn)

---

## <a name="en"></a>Path Blocker (AI Edition)

**Path Blocker (AI Edition)** is a hardcore website blocker designed for ultimate focus. It combines a permanent, unremovable blocklist with a smart AI guardian to protect you from distractions.

### Core Features

* **Permanent Blocking**: Once a site is added to the "Hardcore" list, it's locked forever. There's no turning back. This is for sites that you know are a complete waste of your time.
* **AI Guardian Mode**: Set your current intention (e.g., "learning Python," "writing a report"), and the AI will analyze the pages you visit. If a page's content doesn't align with your stated goal, it will be blocked. This is perfect for preventing mindless Browse and staying on task.
* **Hybrid Mode**: The perfect blend of both worlds. It gives top priority to your permanent blocklist while also using the AI Guardian to keep you focused on your current task.
* **Flexible Whitelisting**: The AI isn't perfect. If it blocks a site you need, you can grant temporary (one-hour) or permanent access with a single click.
* **Easy to Use**: A clean and intuitive interface makes it simple to manage your blocklists, set your AI's intention, and switch between modes.

### How It Works

1.  **Choose Your Mode**:
    * **Hardcore**: Only the permanent blocklist is active. Use this for maximum security against your worst digital habits.
    * **AI Mode**: Only the AI Guardian is active. Set your intent and let the AI protect your focus.
    * **Hybrid Mode**: Both the permanent list and the AI Guardian are active. This is the recommended default mode.
2.  **Set Your Intention**: In AI or Hybrid mode, tell the AI what you're working on. This context is crucial for it to make smart blocking decisions. You'll need to provide your own Gemini API key for this feature.
3.  **Build Your Permanent Blocklist**:
    * **One-Click Add**: Instantly add the current website to your permanent blocklist.
    * **Manual Add**: Manually enter a website's name and URL path to add it to the list. You can also organize your blocked sites into groups.
4.  **Stay Focused**: When you try to visit a blocked site, Path Blocker will intercept the request and show you a page explaining why it was blocked.

### Files in This Repository

* `manifest.json`: The extension's configuration file, defining its permissions and core components.
* `background.js`: The service worker that runs in the background, containing all the core logic for blocking sites and communicating with the AI.
* `popup.html` / `popup.css` / `popup.js`: The user interface for the extension's popup, where you manage settings and blocklists.
* `interception.html` / `interception.css` / `interception.js`: The page that is displayed when a website is blocked.
* `icons/`: Application icons.

---

## <a name="zh-cn"></a>Path Blocker (AI 版)

**Path Blocker (AI 版)** 是一款为终极专注而生的硬核网站拦截器。它结合了永久、不可移除的黑名单与智能 AI 守护，保护您免受干扰。

### 核心功能

* **永久锁定**：一旦将网站添加到“硬核”列表，它将被永远锁定。没有回头路。这适用于那些您确信完全是浪费时间的网站。
* **AI 守护模式**：设定您当前的意图（例如“学习 Python”、“撰写报告”），AI 将分析您访问的页面。如果页面内容与您设定的目标不符，它将被拦截。这对于防止无意识的浏览和保持任务专注非常有效。
* **混合模式**：两全其美的完美结合。它优先处理您的永久锁定列表，同时利用 AI 守护确保您专注于当前任务。
* **灵活的白名单**：AI 并非完美。如果它拦截了您需要的网站，您只需一键即可授予临时（一小时）或永久访问权限。
* **简单易用**：简洁直观的界面让您轻松管理锁定列表、设定 AI 意图以及切换模式。

### 工作原理

1.  **选择您的模式**：
    * **硬核模式**：仅激活永久锁定列表。用于最大程度地防范您最糟糕的数字恶习。
    * **AI 模式**：仅激活 AI 守护。设定您的意图，让 AI 保护您的专注力。
    * **混合模式**：永久列表和 AI 守护同时激活。这是推荐的默认模式。
2.  **设定您的意图**：在 AI 或混合模式下，告诉 AI 您正在做什么。这个上下文对于它做出智能的拦截决策至关重要。您需要提供自己的 Gemini API 密钥才能使用此功能。
3.  **建立您的永久锁定列表**：
    * **一键添加**：立即将当前网站添加到您的永久锁定列表。
    * **手动添加**：手动输入网站名称和 URL 路径，将其添加到列表。您还可以将锁定的网站分组管理。
4.  **保持专注**：当您尝试访问被拦截的网站时，Path Blocker 会拦截请求，并向您显示一个页面，解释其被拦截的原因。

### 仓库文件说明

* `manifest.json`：扩展程序的配置文件，定义其权限和核心组件。
* `background.js`：在后台运行的服务工作线程，包含所有拦截网站和与 AI 通信的核心逻辑。
* `popup.html` / `popup.css` / `popup.js`：扩展程序弹窗的用户界面，您可以在此管理设置和锁定列表。
* `interception.html` / `interception.css` / `interception.js`：当网站被拦截时显示的页面。
* `icons/`：应用程序图标。