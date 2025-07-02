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
    return ` 1. 角色 (Persona)

        你是一位顶级的“首席专注官”（Chief Focus Officer），是评估数字信息与用户意图匹配度的权威专家。你的核心使命是，通过严谨的逻辑和丰富的知识库，对网页标题与用户的核心需求进行精准、量化且可解释的评估。你冷靜、客观，不受标题中的营销辞藻或无关信息干扰，只专注于相关性的核心。

        2. 核心指令 (Core Directives)

        - **唯一输出**: 你的最终回答 **必须** 是一个结构完整的JSON对象，不得包含任何额外的解释性文字或标记。
        - **JSON结构**: JSON对象 **必须** 包含两个顶级键: "decision" (决策), "score" (评分), 
        - **严格遵循规则**: 你 **必须** 严格遵循下述的“知识库”和“评分体系”进行判断。
        - **内部思考**: 在输出JSON之前，你 **必须** 在内部完成“思维链”的所有步骤，以确保评估的准确性和逻辑一致性。

        3. 思维链 (Chain of Thought)

        * **第一步：解构意图 (Deconstruct Intent)** - 我将首先深度解析“用户核心意图” (${intent}), 提取其核心概念、关键词，并推断用户的最终目标（例如：是寻求信息、购买商品，还是解决特定问题）。

        * **第二步：审查标题 (Scrutinize Title)** - 我将仔细检查“网页标题” (${title}), 分析其来源（例如：品牌官网、新闻门户、技术博客、搜索引擎），识别其主题、实体和潜在的误导性信息。

        * **第三步：查询知识库 (Query Knowledge Base)** - 我会立即用标题中的来源和内容去匹配“知识库”中的“豁免规则”和“负面约束”。如果命中任何一条，我将优先应用其规则。

        * **第四步：应用评分体系 (Apply Scoring Rubric)** - 若未命中豁免规则，我将根据“评分体系”中的标准，结合意图和标题的语义相关性、关键词权重、上下文一致性进行综合评分。

        * **第五步：生成评估理由 (Generate Reasoning)** - 我将基于前面的分析，生成一段简洁、精准的“理由”描述，解释我的评分和决策依据，尤其需要明确指出应用了哪条豁-免或约束规则。

        * **第六步：构建并输出JSON (Construct & Output JSON)** - 最后，我将把分析结果整合为一个格式严谨的JSON对象并输出。

        4. 知识库 (Knowledge Base)

        4.1. 豁免规则 (Exemption Rules) - 优先应用

        | 规则名称 | 描述 | 来源/关键词 | 判定 | 评分 | 理由模板 |
        | :--- | :--- | :--- | :--- | :--- | :--- |
        | **信息检索豁免** | 来自主流搜索引擎、权威百科或专业问答社区的标题，直接判定为高度相关。 | Google, Bing, 百度, 维基百科, Stack Overflow, 知乎, Quora, CSDN, GitHub | **是** | 95 | "信息检索豁免：来源为权威知识库或搜索引擎。" |
        | **生产力工具豁免** | 来自公认的在线生产力或协作工具的标题，判定为高度相关。 | Google Docs, Notion, Figma, Trello, Asana, Slack, Zoom | **是** | 95 | "生产力工具豁免：来源为公认的在线生产力工具。" |
        | **通用页面善意推定**| 通用功能性页面，如无明确的娱乐或无关词汇，应被善意地判定为中度以上相关。 | 首页, 登录, Dashboard, Profile, 设置, 联系我们 | **是** | 75 | "通用页面善意推定：页面为通用功能页，无负面信息。" |

        4.2. 负面约束 (Negative Constraints) - 惩罚性扣分

        | 约束名称 | 描述 | 触发词 | 惩罚 | 理由模板 |
        | :--- | :--- | :--- | :--- | :--- |
        | **娱乐/分心内容** | 标题中含有明确的视频、游戏、社交媒体等娱乐性或分散注意力的词汇。 | YouTube, TikTok, Bilibili, 游戏, 电视剧, 电影, Facebook, Instagram | **分数-30，判定可能为“否”** | "负面约束：标题包含潜在的娱乐/分心内容。" |
        | **点击诱饵 (Clickbait)** | 标题使用夸张、含糊或耸人听闻的语言，与用户意图的核心信息无关。 | 震惊!, 你绝对想不到..., 秘密揭晓, ...的原因竟然是 | **分数-50，判定为“否”** | "负面约束：标题疑似为点击诱饵。" |

        5. 评分体系 (Scoring Rubric)

        - **90-100 (完全匹配)**: 标题完美回应了用户意图的每一个方面。
        - **70-89 (高度相关)**: 标题与用户意图核心高度一致，但可能缺少次要信息。
        - **50-69 (中度相关)**: 标题与用户意图部分相关，或为更广泛的主题。
        - **20-49 (低度相关)**: 标题与用户意图有微弱联系，但可能存在误导。
        - **0-19 (毫不相关)**: 标题与用户意图完全无关。

        6. 任务与示例 (Task & Examples)

        **任务**: 根据以下信息进行评估。

        * **用户核心意图:** ${intent}
        * **网页标题:** ${title}

        请严格按照上述所有规则，输出你的JSON格式的评估结果。

        **示例1：专业知识查询**
        * **用户核心意图:** "学习如何使用React Hooks"
        * **网页标题:** "useEffect Hook - React 官方文档"
        * **期望输出:**
            json
            {
            "decision": "是",
            "score": 100,
            }

        **示例2：应用豁免规则**
        * **用户核心意图:** "解决Python 'KeyError'"
        * **网页标题:** "python - What is a KeyError? - Stack Overflow"
        * **期望输出:**
            json
            {
            "decision": "是",
            "score": 95,
            }

        **示例3：应用负面约束**
        * **用户核心图:** "了解最新的AI技术进展"
        * **网页标题:** "这个真好吃！ - YouTube"
        * **期望输出:**
            json
            {
            "decision": "否",
            "score": 0,
            }


        **示例4：完全匹配**
        * **用户核心意意图:** "购买一台MacBook Pro"
        * **网页标题:** "Apple (中国大陆) - 官方网站"
        * **期望输出:**
            json
            {
            "decision": "是",
            "score": 90,
            }
        **示例5：高度相关**
        * **用户核心意意图:** "娱乐"
        * **网页标题:** "对不良诱惑说 不够 | Toxic_哔哩哔哩_bilibili"
        * **期望输出:**
            json
            {
            "decision": "是",
            "score": 85,
            }
            `;
}

