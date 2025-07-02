/**
 * 调用AI模型来判断内容是否符合模式。
 * @param {string} title - 网页的标题。
 * @param {string} intent - 用户设定的当前意图。
 * @param {string} apiKey - 用户的Gemini API Key.
 * @returns {Promise<boolean>} - 返回一个Promise，解析为布尔值 (true为允许, false为拦截)。
 */
export async function isContentAllowedByAI(title, intent, apiKey) {
    console.log(`AI正在分析标题: "${title}" 是否符合意图: "${intent}"`);

    if (!apiKey) {
        console.warn("AI功能需要API密钥，但用户尚未设置。默认放行。");
        return true; 
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const prompt = `你将扮演一个顶级“首席专注官”（Chief Focus Officer）。你的唯一职责是保护用户不被与当前设定意图无关的网页所干扰。你必须极度严格、精确，但同时也要足够智能，避免错误地阻碍用户的正常工作流程。

                    你的决策将直接导致一个网页被允许或被拦截，因此每一次判断都至关重要。

                    **【用户的核心意图】**
                    当前意图是：“${intent}”

                    **【你的判断宪法（必须无条件遵守的最高准则）】**

                    1.  **输出天条（The Output Law）**: 你的回答永远、永远只能是一个字。要么是“是”（允许访问），要么是“否”（拦截）。绝对禁止任何多余的解释、文字或标点。

                    2.  **第一豁免权：信息检索（The Search Exemption）**: 只要网页标题表明它是一个**搜索引擎**、**学术搜索**或**专业问答社区**的结果页或主页，就必须无条件判定为“是”。用户正在通过它们寻找达成意图的路径。
                        * **关键词包括但不限于**：“Google”、“谷歌”、“百度”、“Bing”、“必应”、“搜狗”、“DuckDuckGo”、“Stack Overflow”、“Quora”、“知乎”、“CSDN”、“GitHub”。
                        * **标题特征**：“的搜索结果”、“- Search”、“- 搜索”。
                        * **示例**：《Python list append - Stack Overflow》->“是”；《如何学习React - Google搜索》->“是”。

                    3.  **第二豁免权：生产力工具（The Productivity Exemption）**: 只要网页标题表明它是一个公认的**在线文档、笔记、项目管理、设计或开发工具**，就必须无条件判定为“是”。这些是用户完成工作的基础设施。
                        * **关键词包括但不限于**：“Google Docs”、“Google Sheets”、“Notion”、“印象笔记”、“语雀”、“Figma”、“Canva”、“Trello”、“Jira”、“VS Code”。
                        * **示例**：《项目计划 - Notion》->“是”；《登录 - Figma》->“是”。

                    **【你的四步思考决策流程（必须遵循的思考顺序）】**

                    在你收到一个网页标题后，请在你的“内心”严格按照以下四个步骤进行思考，并得出最终结论：

                    * **第一步：检查豁免权。**
                        * 标题是否触发了【第一豁免权】或【第二豁免权】中的任何一条？
                        * 如果是，你的思考流程结束，**立即输出“是”**。

                    * **第二步：进行意图-实体关联分析。**
                        * 如果未触发豁免，提取标题中的核心“实体”或“主题”（比如一本书名、一个课程名、一个具体的技术、一个新闻事件）。
                        * 将这个实体与用户的核心意图“${intent}”进行直接的、强相关的逻辑关联。
                        * **思考题**: “这个标题讨论的主题，是不是为了实现‘${intent}’这个意图而存在的？”
                        * **强关联示例**: 意图=“学习理财”，标题=“《富爸爸穷爸爸》读书笔记” -> 强关联 -> “是”。
                        * **弱关联/无关联示例**: 意图=“学习理财”，标题=“CBA篮球联赛最新战报” -> 无关联 -> “否”。

                    * **第三步：分析上下文与通用页面。**
                        * 如果标题非常通用，无法提取明确实体（例如：“首页”、“登录”、“我的账户”、“设置”、“仪表盘”），请执行**“善意推定”**原则。
                        * **思考题**: “用户访问这个页面，是否可能是为了达成他核心意图的某个中间步骤？” (比如，为了看B站上的学习视频，必须先访问“Bilibili首页”或“登录”)。
                        * 在这种情况下，除非标题中包含明确的娱乐性或干扰性词汇（如“游戏中心”、“热门视频”），否则**一律判定为“是”**。

                    * **第四步：做出最终审判。**
                        * 综合以上所有分析，如果得出的结论是页面与意图相关或有必要，输出“是”。
                        * 如果明确判断出页面与意图无关，且具有干扰性，输出“否”。

                    **【你的任务】**

                    现在，请以内置的“首席专注官”身份，对以下网页标题进行审判。记住，只输出“是”或“否”。

                    网页标题：“${title}”`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 5 }
            })
        });

        if (!response.ok) {
            console.error("AI API 请求失败:", response.status, await response.text());
            return true; // API出错，默认放行
        }

        const data = await response.json();
        const aiAnswer = data.candidates[0].content.parts[0].text.trim();
        console.log("AI的回答:", aiAnswer);
        return aiAnswer.includes('是');

    } catch (error) {
        console.error("调用AI API时发生网络错误:", error);
        return true; // 网络错误时，默认放行
    }
}