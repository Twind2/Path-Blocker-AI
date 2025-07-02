/**
 * 根据用户的AI设置，判断内容是否符合意图并获取相关度评分。
 * @param {string} title - 网页的标题。
 * @param {object} settings - 从storage获取的完整设置对象。
 * @returns {Promise<{isAllowed: boolean, score: number}>} - 返回包含布尔值和评分的对象。
 */
export async function isContentAllowedByAI(title, settings) {
    const { ai_provider = 'gemini', ai_intent } = settings;
    console.log(`AI [${ai_provider.toUpperCase()}] 正在分析标题: "${title}"`);

    // 默认返回值，在出错时使用
    const fallbackResult = { isAllowed: true, score: -1 };

    if (!ai_intent) {
        console.log("AI意图未设定，不进行AI分析。");
        return fallbackResult;
    }

    try {
        if (ai_provider === 'openai') {
            return await callOpenAI(title, ai_intent, settings);
        } else {
            return await callGemini(title, ai_intent, settings);
        }
    } catch (error) {
        console.error(`调用 ${ai_provider.toUpperCase()} API 时发生顶层错误:`, error);
        return fallbackResult;
    }
}

// --- Gemini API 调用逻辑 ---
async function callGemini(title, intent, settings) {
    const { api_key: apiKey } = settings;
    if (!apiKey) {
        console.warn("Gemini API密钥未设置。默认放行。");
        return { isAllowed: true, score: -1 };
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const prompt = getPrompt(intent, title);

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            // 要求Gemini返回JSON格式
            generationConfig: { response_mime_type: "application/json", maxOutputTokens: 100 }
        })
    });

    if (!response.ok) {
        console.error("Gemini API 响应失败:", response.status, await response.text());
        return { isAllowed: true, score: -1 };
    }

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    return parseAIResponse(rawText);
}

// --- OpenAI API 调用逻辑 ---
async function callOpenAI(title, intent, settings) {
    const { openai_api_url: baseUrl, openai_api_key: apiKey, openai_model: model } = settings;
    if (!baseUrl || !apiKey || !model) {
        console.warn("OpenAI 配置不完整。默认放行。");
        return { isAllowed: true, score: -1 };
    }
    const apiUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    const prompt = getPrompt(intent, title);

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt }],
            // 要求OpenAI返回JSON格式
            response_format: { type: "json_object" },
            max_tokens: 100,
            temperature: 0.0
        })
    });

    if (!response.ok) {
        console.error("OpenAI API 响应失败:", response.status, await response.text());
        return { isAllowed: true, score: -1 };
    }
    
    const data = await response.json();
    const rawText = data.choices[0].message.content;
    return parseAIResponse(rawText);
}

/**
 * 解析AI返回的JSON字符串。
 * @param {string} rawText - AI返回的原始文本。
 * @returns {{isAllowed: boolean, score: number}}
 */
function parseAIResponse(rawText) {
    try {
        console.log("AI 原始回答:", rawText);
        const result = JSON.parse(rawText);
        const decision = result.decision || '否';
        const score = result.score !== undefined ? parseInt(result.score, 10) : 0;
        
        const finalResult = {
            isAllowed: decision.includes('是'),
            score: Math.max(0, Math.min(100, score)) // 确保分数在0-100之间
        };
        console.log("解析后的结果:", finalResult);
        return finalResult;
    } catch (error) {
        console.error("解析AI JSON响应时出错:", error);
        // 如果解析失败，采取最严格的措施：拦截
        return { isAllowed: false, score: 0 };
    }
}


// --- 新的、统一的 Prompt 生成函数 ---
function getPrompt(intent, title) {
    // 新的Prompt，要求返回JSON对象
    return `你是一个顶级的“首席专注官”，负责评估网页与用户意图的匹配度。

            **规则:**
            1.  你的回答**必须**是一个JSON对象。
            2.  JSON对象必须包含两个键: "decision" 和 "score"。
            3.  **"decision"**: 它的值必须是字符串 "是" (如果网页内容与意图相关) 或 "否" (如果不相关)。
            4.  **"score"**: 它的值必须是一个整数，代表网页标题内容与用户意图的“相关度评分”，范围从0到100。100分表示完全相关，0分表示毫不相关。
            5.  **豁免规则**:
                * **信息检索豁免**: 如果标题来自搜索引擎（Google, Bing, 百度等）或专业问答社区（Stack Overflow, 知乎, Quora, CSDN, GitHub），则判定为相关，给予高分（例如95分）。
                * **生产力工具豁免**: 如果标题来自公认的在线工具（Google Docs, Notion, Figma, Trello等），则判定为相关，给予高分（例如95分）。
                * **通用页面善意推定**: 对于“首页”、“登录”等通用页面，除非含有明确的娱乐词汇，否则应给予一个中等偏上的分数（例如75分），并判定为相关。

                ---
                **任务:**
                根据以下信息进行评估。

                * **用户核心意图:** "${intent}"
                * **网页标题:** "${title}"

                请严格按照上述规则，输出你的JSON格式的评估结果。`;
}

