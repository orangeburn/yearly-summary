# AI Browsing Insight - 您的年度浏览总结

一款基于 chrome 浏览历史的 AI 智能分析插件。它不仅能统计您的访问次数，还能深度分析您的浏览习惯、兴趣领域，并为您生成个性化的年度/月度总结报告。

![Cyberspace UI Preview](./screenshot_preview.png)
*(注: 实际截图需自行添加)*

## ✨ 核心特性

- **🧠 AI 深度洞察**: 利用大语言模型（OpenAI / Gemini）生成关于您浏览习惯的幽默、深刻的文字报告。
- **⏱️ 智能时长推算**: 告别单纯的“点击次数”。本插件采用 **History Inference Algorithm**，通过分析点击时间轴的间隙，自动推算您在每个网站的真实停留时长。
- **🌃 Cyberspace 视觉风格**: 沉浸式暗黑模式，搭配 #00f3ff (青) 与 #bc13fe (紫) 的霓虹光效，以及 Glassmorphism 毛玻璃质感卡片。
- **📊 多维数据可视化**:
  - **时间分布**: 24小时热力图。
  - **周浏览习惯**: 工作日 vs 周末对比。
  - **兴趣雷达**: 技术、娱乐、新闻等分类占比。
  - **关键词云**: 提取您最关注的话题。

## 🚀 安装与使用

1. **加载扩展**:
   - 打开 Chrome 扩展管理页 (`chrome://extensions/`)。
   - 开启右上角的 "开发者模式"。
   - 点击 "加载已解压的扩展程序"，选择本项目文件夹。

2. **配置 API Key**:
   - 点击插件图标打开弹窗，进入 Dashboard。
   - 切换到 **"设置"** 标签页。
   - 输入您的 OpenAI API Key (或兼容接口，如 DeepSeek/Gemini)。
   - 点击保存。

3. **生成报告**:
   - 在 Dashboard 首页选择时间范围（上个月 / 2024年 / 全部）。
   - 点击 **"重新生成报告"**。
   - 等待 AI 分析完成（约 10-20 秒）。

## 🛠️ 技术细节

- **Manifest V3**: 符合最新的 Chrome 扩展标准。
- **Vanilla JS**: 纯原生 JavaScript 开发，无庞大依赖，轻量极速。
- **Privacy First**: 所有历史记录仅在本地处理，除发送给您配置的 LLM API 外，不上传任何服务器。
- **Time Estimation Algorithm**:
  - `Duration = NextVisitTime - CurrentVisitTime`
  - 自动过滤超过 30 分钟的闲置时间。
  - 针对单次点击赋予 5 分钟的基础阅读时间。

## 🎨 视觉主题
- **背景**: 深灰网格 (`#0a0a0f`)
- **主色**: Neon Cyan (`#00f3ff`)
- **副色**: Neon Purple (`#bc13fe`)
- **字体**: 'Segoe UI', 'Roboto', sans-serif

---
*Created by VibeCode Team*
