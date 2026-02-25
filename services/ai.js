class AIService {
    constructor() { }

    async generateSummary(config, stats) {
        // Legacy text summary (kept for compatibility or specific text block)
        // We will use analyzeDeeply for the charts
        return this.analyzeDeeply(config, stats);
    }

    async analyzeDeeply(config, stats) {
        const { apiKey, baseUrl, model } = config;
        if (!apiKey) throw new Error("API Key is missing");

        const effectiveBaseUrl = (baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
        const effectiveModel = model || "gpt-3.5-turbo";

        const topDomainsList = stats.topDomains.slice(0, 50).map(d => `${d.domain} (${d.count})`).join(', ');

        const systemPrompt = `你是一个高级数据分析引擎。请分析用户的浏览器历史Top域名，输出严格的JSON格式数据。`;

        const userPrompt = `
Top Domains: [${topDomainsList}]
Period: ${stats.periodLabel || '本月'}

请分析并返回以下 JSON 结构:
        {
            "summary": "一段详细的用户浏览行为分析（Markdown格式）。请包含：1. 主要兴趣领域的深度解读；2. 浏览习惯的规律（如工作/娱乐平衡）；3. 潜在的改进建议。请使用加粗、列表等Markdown语法增强可读性，字数控制在300字左右。",
                "categories": [
                    { "name": "技术/开发", "value": 30 },
                    { "name": "娱乐/媒体", "value": 20 },
                    { "name": "购物/消费", "value": 10 },
                    { "name": "社交/通讯", "value": 10 },
                    { "name": "资讯/阅读", "value": 10 },
                    { "name": "其他", "value": 20 }
                ],
                    "keywords": ["React", "AI", "新闻", "GitHub", "设计"],
                        "productivityScore": 85,
                            "productivityComment": "简短评价",
                                "topSitesInsight": "一段专门针对下方Top10热门网站列表的综合点评",
                                "overallAdvice": "一段最终的总结与建议，针对用户的上网习惯给出健康、效率方面的行动建议（Markdown格式，3-5条）"
        }

        注意：
        1. categories 的 value 总和不必非要是100，代表权重即可，尽量根据 domain list 估算。
        2. keywords 提取 5 - 8 个核心关键词。
        3. productivityScore 范围 0 - 100。
        `;

        const url = `${effectiveBaseUrl}/chat/completions`;
        const payload = {
            model: effectiveModel,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey} `
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || `API Request failed: ${response.status} ${response.statusText} `);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            try {
                return JSON.parse(content);
            } catch (e) {
                // Fallback if parsing fails (sometimes AI adds ticks)
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) return JSON.parse(jsonMatch[0]);
                throw new Error("Invalid JSON format from AI");
            }

        } catch (e) {
            console.error("AI Generation Error", e);
            throw e;
        }
    }
    async analyzeDomain(config, domain, pages) {
        const { apiKey, baseUrl, model } = config;
        // Basic limits
        const effectiveBaseUrl = (baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
        const effectiveModel = model || "gpt-3.5-turbo";

        // Construct prompt
        const visitedPages = pages.slice(0, 20).map(p => `- ${p.title} (${p.count} visits)`).join('\n');

        const systemPrompt = `你是一个网站内容分析师。请根据用户访问该网站的页面标题列表，分析用户的兴趣点和该网站对用户的价值。
        请严格输出JSON格式。`;

        const userPrompt = `
        Domain: ${domain}
Visited Pages:
${visitedPages}

请分析并返回以下 JSON 结构:
        {
            "contentType": "网站类型 (如: 视频社区, 技术博客, 开发工具)",
                "keywords": ["关键词1", "关键词2", "关键词3"],
                    "summary": "一句话总结用户在这个网站上主要看了什么内容",
                        "rating": 4, // 1-5, 5代表高价值/高生产力
                            "sentiment": "正面/中性/负面"
        }
        `;

        const url = `${effectiveBaseUrl}/chat/completions`;
        const payload = {
            model: effectiveModel,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey} `
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // Return a graceful fallback instead of throwing, so one failure doesn't stop others
                return {
                    contentType: "Analysis Failed",
                    keywords: [],
                    summary: "无法分析该网站",
                    rating: 0
                };
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            // JSON parsing helper
            try {
                return JSON.parse(content);
            } catch (e) {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) return JSON.parse(jsonMatch[0]);
                return { contentType: "Parse Error", keywords: [], summary: "解析结果失败", rating: 0 };
            }

        } catch (e) {
            console.error(`Analysis failed for ${domain}`, e);
            return { contentType: "Error", keywords: [], summary: "分析过程出错", rating: 0 };
        }
    }
}

window.aiService = new AIService();
