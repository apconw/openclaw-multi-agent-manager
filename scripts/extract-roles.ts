/**
 * Extract role definitions from agency-agents project and generate
 * a typed role library file at shared/role-library.ts.
 *
 * Usage: npx tsx scripts/extract-roles.ts [path-to-agency-agents]
 */
import * as fs from 'fs';
import * as path from 'path';

const AGENCY_AGENTS_DEFAULT = path.resolve(__dirname, '../../agency-agents');

const CATEGORY_DIRS = [
  'academic',
  'design',
  'engineering',
  'game-development',
  'marketing',
  'paid-media',
  'product',
  'project-management',
  'sales',
  'spatial-computing',
  'specialized',
  'support',
  'testing',
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  academic: '学术研究',
  design: '设计创意',
  engineering: '工程开发',
  'game-development': '游戏开发',
  marketing: '市场营销',
  'paid-media': '付费推广',
  product: '产品管理',
  'project-management': '项目管理',
  sales: '销售商务',
  'spatial-computing': '空间计算',
  specialized: '专业领域',
  support: '运营支持',
  testing: '测试质量',
};

const NAME_ZH: Record<string, string> = {
  'Anthropologist': '人类学家',
  'Geographer': '地理学家',
  'Historian': '历史学家',
  'Narratologist': '叙事学家',
  'Psychologist': '心理学家',
  'Brand Guardian': '品牌守护者',
  'Image Prompt Engineer': '图像提示词工程师',
  'Inclusive Visuals Specialist': '包容性视觉专家',
  'UI Designer': 'UI 设计师',
  'UX Architect': 'UX 架构师',
  'UX Researcher': 'UX 研究员',
  'Visual Storyteller': '视觉叙事师',
  'Whimsy Injector': '趣味体验设计师',
  'AI Data Remediation Engineer': 'AI 数据修复工程师',
  'AI Engineer': 'AI 工程师',
  'Autonomous Optimization Architect': '自治优化架构师',
  'Backend Architect': '后端架构师',
  'Code Reviewer': '代码审查员',
  'Data Engineer': '数据工程师',
  'Database Optimizer': '数据库优化专家',
  'DevOps Automator': 'DevOps 自动化工程师',
  'Embedded Firmware Engineer': '嵌入式固件工程师',
  'Feishu Integration Developer': '飞书集成开发者',
  'Frontend Developer': '前端开发工程师',
  'Git Workflow Master': 'Git 工作流专家',
  'Incident Response Commander': '事件响应指挥官',
  'Mobile App Builder': '移动应用开发者',
  'Rapid Prototyper': '快速原型开发者',
  'Security Engineer': '安全工程师',
  'Senior Developer': '高级开发工程师',
  'Software Architect': '软件架构师',
  'Solidity Smart Contract Engineer': 'Solidity 智能合约工程师',
  'SRE (Site Reliability Engineer)': 'SRE 站点可靠性工程师',
  'Technical Writer': '技术文档工程师',
  'Threat Detection Engineer': '威胁检测工程师',
  'WeChat Mini Program Developer': '微信小程序开发者',
  'Game Audio Engineer': '游戏音频工程师',
  'Game Designer': '游戏设计师',
  'Level Designer': '关卡设计师',
  'Narrative Designer': '叙事设计师',
  'Technical Artist': '技术美术师',
  'Blender Add-on Engineer': 'Blender 插件工程师',
  'Godot Gameplay Scripter': 'Godot 游戏脚本开发者',
  'Godot Multiplayer Engineer': 'Godot 多人联机工程师',
  'Godot Shader Developer': 'Godot 着色器开发者',
  'Roblox Avatar & Accessories Creator': 'Roblox 角色与配饰创作者',
  'Roblox Experience Designer': 'Roblox 体验设计师',
  'Roblox Systems Scripter': 'Roblox 系统脚本开发者',
  'Unity Architect': 'Unity 架构师',
  'Unity Editor Tool Developer': 'Unity 编辑器工具开发者',
  'Unity Multiplayer Engineer': 'Unity 多人联机工程师',
  'Unity Shader Graph Artist': 'Unity Shader Graph 美术师',
  'Unreal Engine Multiplayer Architect': '虚幻引擎多人联机架构师',
  'Unreal Engine Systems Engineer': '虚幻引擎系统工程师',
  'Unreal Engine Technical Artist': '虚幻引擎技术美术师',
  'Unreal Engine World Builder': '虚幻引擎世界构建师',
  'AI Citation Strategist': 'AI 引用优化策略师',
  'App Store Optimizer': '应用商店优化专家',
  'Baidu SEO Specialist': '百度 SEO 专家',
  'Bilibili Content Strategist': 'B站内容策略师',
  'Book Co-Author': '图书联合作者',
  'Carousel Growth Engine': '轮播增长引擎',
  'China E-Commerce Operator': '中国电商运营专家',
  'Content Creator': '内容创作者',
  'Cross-Border E-Commerce Specialist': '跨境电商专家',
  'Douyin Strategist': '抖音策略师',
  'Growth Hacker': '增长黑客',
  'Instagram Curator': 'Instagram 策展人',
  'Kuaishou Strategist': '快手策略师',
  'LinkedIn Content Creator': 'LinkedIn 内容创作者',
  'Livestream Commerce Coach': '直播电商教练',
  'Podcast Strategist': '播客策略师',
  'Private Domain Operator': '私域运营专家',
  'Reddit Community Builder': 'Reddit 社区运营师',
  'SEO Specialist': 'SEO 优化专家',
  'Short-Video Editing Coach': '短视频剪辑教练',
  'Social Media Strategist': '社交媒体策略师',
  'TikTok Strategist': 'TikTok 策略师',
  'Twitter Engager': 'Twitter 互动运营师',
  'WeChat Official Account Manager': '微信公众号运营专家',
  'Weibo Strategist': '微博策略师',
  'Xiaohongshu Specialist': '小红书运营专家',
  'Zhihu Strategist': '知乎策略师',
  'Ad Creative Strategist': '广告创意策略师',
  'Paid Media Auditor': '付费媒体审计师',
  'Paid Social Strategist': '付费社交广告策略师',
  'PPC Campaign Strategist': 'PPC 竞价广告策略师',
  'Programmatic & Display Buyer': '程序化展示广告买手',
  'Search Query Analyst': '搜索查询分析师',
  'Tracking & Measurement Specialist': '追踪与效果评估专家',
  'Behavioral Nudge Engine': '行为引导引擎',
  'Feedback Synthesizer': '反馈综合分析师',
  'Product Manager': '产品经理',
  'Sprint Prioritizer': '迭代优先级规划师',
  'Trend Researcher': '趋势研究员',
  'Experiment Tracker': '实验追踪专家',
  'Jira Workflow Steward': 'Jira 工作流管理师',
  'Project Shepherd': '项目领航员',
  'Senior Project Manager': '高级项目经理',
  'Studio Operations': '工作室运营总监',
  'Studio Producer': '工作室制片人',
  'Account Strategist': '客户策略师',
  'Deal Strategist': '交易策略师',
  'Discovery Coach': '需求发掘教练',
  'Outbound Strategist': '外向型销售策略师',
  'Pipeline Analyst': '销售管线分析师',
  'Proposal Strategist': '提案策略师',
  'Sales Coach': '销售教练',
  'Sales Engineer': '售前工程师',
  'macOS Spatial/Metal Engineer': 'macOS 空间/Metal 工程师',
  'Terminal Integration Specialist': '终端集成专家',
  'visionOS Spatial Engineer': 'visionOS 空间工程师',
  'XR Cockpit Interaction Specialist': 'XR 座舱交互专家',
  'XR Immersive Developer': 'XR 沉浸式开发者',
  'XR Interface Architect': 'XR 界面架构师',
  'Accounts Payable Agent': '应付账款代理',
  'Agentic Identity & Trust Architect': '智能体身份与信任架构师',
  'Agents Orchestrator': '智能体编排师',
  'Automation Governance Architect': '自动化治理架构师',
  'Blockchain Security Auditor': '区块链安全审计师',
  'Compliance Auditor': '合规审计师',
  'Corporate Training Designer': '企业培训设计师',
  'Cultural Intelligence Strategist': '文化智能策略师',
  'Data Consolidation Agent': '数据整合代理',
  'Developer Advocate': '开发者布道师',
  'Document Generator': '文档生成器',
  'French Consulting Market Navigator': '法国咨询市场导航师',
  'Government Digital Presales Consultant': '政府数字化售前顾问',
  'Healthcare Marketing Compliance Specialist': '医疗营销合规专家',
  'Identity Graph Operator': '身份图谱管理员',
  'Korean Business Navigator': '韩国商务导航师',
  'LSP/Index Engineer': 'LSP/索引工程师',
  'MCP Builder': 'MCP 构建器',
  'Model QA Specialist': '模型质量检测专家',
  'Recruitment Specialist': '招聘专家',
  'Report Distribution Agent': '报告分发代理',
  'Sales Data Extraction Agent': '销售数据提取代理',
  'Salesforce Architect': 'Salesforce 架构师',
  'Study Abroad Advisor': '留学规划顾问',
  'Supply Chain Strategist': '供应链策略师',
  'Workflow Architect': '工作流架构师',
  'ZK Steward': '知识库管理员',
  'Analytics Reporter': '数据分析报告师',
  'Executive Summary Generator': '高管摘要生成器',
  'Finance Tracker': '财务追踪专家',
  'Infrastructure Maintainer': '基础设施运维工程师',
  'Legal Compliance Checker': '法律合规检查员',
  'Support Responder': '客户支持专员',
  'Accessibility Auditor': '无障碍审计师',
  'API Tester': 'API 测试专家',
  'Evidence Collector': '证据收集专家',
  'Performance Benchmarker': '性能基准测试专家',
  'Reality Checker': '现实检验师',
  'Test Results Analyzer': '测试结果分析师',
  'Tool Evaluator': '工具评估专家',
  'Workflow Optimizer': '工作流优化专家',
};

const DESC_ZH: Record<string, string> = {
  'Anthropologist': '文化系统、仪式、亲属关系、信仰体系和民族志研究专家',
  'Geographer': '自然与人文地理学、气候系统、制图学和空间分析专家',
  'Historian': '历史分析、分期研究、物质文化和史学方法论专家',
  'Narratologist': '叙事理论、故事结构、角色弧线和文学分析专家',
  'Psychologist': '人类行为、人格理论、动机和认知模式研究专家',
  'Brand Guardian': '品牌策略和品牌守护专家，专注于品牌识别开发、一致性维护和战略定位',
  'Image Prompt Engineer': '专业摄影提示词工程师，擅长为 AI 图像生成工具编写精准、富有表现力的提示词',
  'Inclusive Visuals Specialist': '视觉表现力专家，消除系统性 AI 偏见，生成文化准确、积极正面的图像和视频',
  'UI Designer': 'UI 设计专家，专注于视觉设计系统、组件库和像素级界面创作',
  'UX Architect': '技术架构与 UX 专家，为开发者提供坚实的技术基础、CSS 体系和实施指导',
  'UX Researcher': '用户体验研究专家，专注于用户行为分析、可用性测试和数据驱动的设计洞察',
  'Visual Storyteller': '视觉传达专家，擅长创作引人入胜的视觉叙事、多媒体内容和品牌故事',
  'Whimsy Injector': '创意体验专家，为品牌注入个性、愉悦感和趣味元素',
  'AI Data Remediation Engineer': '自愈数据管道专家，使用本地 SLM 和语义聚类自动检测、分类和修复数据异常',
  'AI Engineer': 'AI/ML 工程专家，专注于机器学习模型开发、部署和生产集成',
  'Autonomous Optimization Architect': '智能系统管理者，持续影子测试 API 性能，强制执行财务和安全护栏',
  'Backend Architect': '高级后端架构师，专注于可扩展系统设计、数据库架构、API 开发和云基础设施',
  'Code Reviewer': '代码审查专家，提供建设性、可操作的反馈，关注正确性、可维护性、安全性和性能',
  'Data Engineer': '数据工程专家，构建可靠的数据管道、湖仓架构和可扩展数据基础设施',
  'Database Optimizer': '数据库专家，专注于模式设计、查询优化、索引策略和性能调优',
  'DevOps Automator': 'DevOps 工程专家，专注于基础设施自动化、CI/CD 管道和云运维',
  'Embedded Firmware Engineer': '裸机和 RTOS 固件专家，精通 ESP32、Arduino、ARM Cortex-M、STM32、FreeRTOS、Zephyr',
  'Feishu Integration Developer': '飞书开放平台全栈集成专家，精通飞书机器人、小程序、审批流、多维表格、消息卡片等',
  'Frontend Developer': '前端开发专家，精通 React/Vue/Angular 等现代 Web 技术、UI 实现和性能优化',
  'Git Workflow Master': 'Git 工作流专家，精通分支策略、Conventional Commits、变基、工作树和 CI 分支管理',
  'Incident Response Commander': '事件指挥专家，专注于生产事件管理、结构化响应协调和复盘',
  'Mobile App Builder': '移动应用开发专家，精通原生 iOS/Android 和跨平台框架开发',
  'Rapid Prototyper': '快速原型开发专家，专注于概念验证和 MVP 快速搭建',
  'Security Engineer': '应用安全工程专家，专注于威胁建模、漏洞评估、安全代码审查和安全架构设计',
  'Senior Developer': '高级实施专家，精通 Laravel/Livewire/FluxUI、高级 CSS、Three.js 集成',
  'Software Architect': '软件架构专家，专注于系统设计、领域驱动设计、架构模式和技术决策',
  'Solidity Smart Contract Engineer': 'Solidity 开发专家，专注于 EVM 智能合约架构、Gas 优化、可升级代理模式和 DeFi 协议',
  'SRE (Site Reliability Engineer)': '站点可靠性工程专家，专注于 SLO、错误预算、可观测性、混沌工程和减少 Toil',
  'Technical Writer': '技术写作专家，擅长开发者文档、API 参考、README 和教程编写',
  'Threat Detection Engineer': '威胁检测专家，专注于 SIEM 规则开发、MITRE ATT&CK 覆盖映射和威胁狩猎',
  'WeChat Mini Program Developer': '微信小程序开发专家，精通 WXML/WXSS/WXS、微信 API、支付和订阅消息',
  'Game Audio Engineer': '游戏交互音频专家，精通 FMOD/Wwise 集成、自适应音乐系统和空间音频',
  'Game Designer': '游戏系统与机制架构师，精通 GDD、玩家心理、经济平衡和游戏循环设计',
  'Level Designer': '空间叙事与流程专家，精通布局理论、节奏架构和环境叙事',
  'Narrative Designer': '叙事系统与对话架构师，精通分支对话、世界观构建和环境叙事',
  'Technical Artist': '美术到引擎管线专家，精通着色器、特效系统、LOD 管线和跨引擎资产优化',
  'Blender Add-on Engineer': 'Blender 插件开发专家',
  'Godot Gameplay Scripter': 'Godot 引擎游戏脚本开发专家',
  'Godot Multiplayer Engineer': 'Godot 引擎多人联机开发专家',
  'Godot Shader Developer': 'Godot 引擎着色器开发专家',
  'Roblox Avatar & Accessories Creator': 'Roblox 虚拟形象与配饰创作专家',
  'Roblox Experience Designer': 'Roblox 游戏体验设计专家',
  'Roblox Systems Scripter': 'Roblox 系统脚本开发专家',
  'Unity Architect': 'Unity 引擎架构专家',
  'Unity Editor Tool Developer': 'Unity 编辑器工具开发专家',
  'Unity Multiplayer Engineer': 'Unity 多人联机开发专家',
  'Unity Shader Graph Artist': 'Unity Shader Graph 视觉特效专家',
  'Unreal Engine Multiplayer Architect': '虚幻引擎多人联机架构专家',
  'Unreal Engine Systems Engineer': '虚幻引擎系统工程专家',
  'Unreal Engine Technical Artist': '虚幻引擎技术美术专家',
  'Unreal Engine World Builder': '虚幻引擎开放世界构建专家',
  'AI Citation Strategist': 'AI 引用优化专家，确保品牌在 AI 生成内容中获得准确引用和推荐',
  'App Store Optimizer': '应用商店优化专家，提升 App 在 iOS/Android 商店的排名和下载量',
  'Baidu SEO Specialist': '百度搜索引擎优化专家，精通百度算法、内容优化和排名提升策略',
  'Bilibili Content Strategist': 'B站内容策略专家，精通视频内容运营、UP主合作和社区互动',
  'Book Co-Author': '图书联合写作专家，协助完成从选题到出版的全流程',
  'Carousel Growth Engine': '轮播内容增长专家，设计高转化率的多图轮播内容策略',
  'China E-Commerce Operator': '中国电商运营专家，精通天猫、京东、拼多多等平台运营',
  'Content Creator': '内容创作专家，擅长多平台内容策划、文案撰写和创意输出',
  'Cross-Border E-Commerce Specialist': '跨境电商专家，精通亚马逊、Shopify 等海外电商平台运营',
  'Douyin Strategist': '抖音运营策略专家，精通短视频内容策划、算法优化和流量增长',
  'Growth Hacker': '增长黑客，专注于用户获取、激活、留存和病毒式传播策略',
  'Instagram Curator': 'Instagram 运营专家，精通视觉内容策展和社区互动',
  'Kuaishou Strategist': '快手运营策略专家，精通快手平台内容创作和用户增长',
  'LinkedIn Content Creator': 'LinkedIn 内容创作专家，专注于职业社交内容和品牌建设',
  'Livestream Commerce Coach': '直播电商教练，精通直播带货策略、选品和转化优化',
  'Podcast Strategist': '播客策略专家，精通播客内容策划、制作和推广',
  'Private Domain Operator': '私域运营专家，精通企业微信、社群运营和用户生命周期管理',
  'Reddit Community Builder': 'Reddit 社区运营专家，精通社区建设和内容传播策略',
  'SEO Specialist': '搜索引擎优化专家，精通技术 SEO、内容优化和排名提升策略',
  'Short-Video Editing Coach': '短视频剪辑教练，指导高效短视频剪辑和内容创作',
  'Social Media Strategist': '社交媒体策略专家，精通多平台社媒运营和品牌传播',
  'TikTok Strategist': 'TikTok 运营策略专家，精通国际短视频内容策划和增长',
  'Twitter Engager': 'Twitter/X 互动运营专家，精通话题营销和社区互动',
  'WeChat Official Account Manager': '微信公众号运营专家，精通内容策划、粉丝运营和变现策略',
  'Weibo Strategist': '微博运营策略专家，精通热搜营销和品牌传播',
  'Xiaohongshu Specialist': '小红书运营专家，精通生活方式内容创作和社区营销',
  'Zhihu Strategist': '知乎运营策略专家，精通知识内容营销和品牌建设',
  'Ad Creative Strategist': '广告创意策略专家，设计高转化广告创意和文案',
  'Paid Media Auditor': '付费媒体审计专家，评估广告投放效果和预算优化',
  'Paid Social Strategist': '付费社交广告策略专家，精通社交平台广告投放和优化',
  'PPC Campaign Strategist': 'PPC 竞价广告策略专家，精通搜索引擎竞价广告管理和优化',
  'Programmatic & Display Buyer': '程序化展示广告采购专家，精通 DSP 平台和展示广告策略',
  'Search Query Analyst': '搜索查询分析专家，挖掘搜索意图和关键词优化机会',
  'Tracking & Measurement Specialist': '追踪与效果评估专家，精通广告归因和数据分析',
  'Behavioral Nudge Engine': '行为助推引擎，运用行为经济学原理优化用户决策路径',
  'Feedback Synthesizer': '反馈综合分析师，整合多渠道用户反馈形成可执行洞察',
  'Product Manager': '产品经理，负责产品全生命周期管理，从发现到策略、路线图、上市和效果评估',
  'Sprint Prioritizer': '迭代优先级规划师，基于价值和成本优化迭代任务排序',
  'Trend Researcher': '趋势研究员，追踪行业趋势和市场动态，提供前瞻性洞察',
  'Experiment Tracker': '实验追踪专家，管理 A/B 测试和产品实验的全流程',
  'Jira Workflow Steward': 'Jira 工作流管理专家，优化项目管理流程和工具配置',
  'Project Shepherd': '项目领航员，引导项目从启动到交付的全过程',
  'Senior Project Manager': '高级项目经理，管理复杂项目组合和跨团队协调',
  'Studio Operations': '工作室运营总监，管理日常运营、资源调配和流程优化',
  'Studio Producer': '工作室制片人，协调创意团队和项目交付',
  'Account Strategist': '客户策略师，制定客户关系管理和增长策略',
  'Deal Strategist': '交易策略师，设计交易方案和谈判策略',
  'Discovery Coach': '需求发掘教练，指导销售团队深入挖掘客户需求',
  'Outbound Strategist': '外向型销售策略师，设计主动获客和外呼策略',
  'Pipeline Analyst': '销售管线分析师，分析销售漏斗和预测收入',
  'Proposal Strategist': '提案策略师，打造高转化率的商业提案',
  'Sales Coach': '销售教练，提升销售团队技能和业绩',
  'Sales Engineer': '售前工程师，提供技术解决方案支持和产品演示',
  'macOS Spatial/Metal Engineer': 'macOS 空间计算和 Metal 图形工程专家',
  'Terminal Integration Specialist': '终端集成专家，构建跨应用终端交互系统',
  'visionOS Spatial Engineer': 'visionOS 空间计算开发专家',
  'XR Cockpit Interaction Specialist': 'XR 座舱交互设计专家',
  'XR Immersive Developer': 'XR 沉浸式体验开发专家',
  'XR Interface Architect': 'XR 界面架构专家，设计跨平台空间计算交互体系',
  'Accounts Payable Agent': '应付账款处理代理，自动化发票匹配和付款流程',
  'Agentic Identity & Trust Architect': '智能体身份与信任架构师，设计多智能体系统的认证和信任机制',
  'Agents Orchestrator': '智能体编排师，协调多智能体系统的任务分配和协作',
  'Automation Governance Architect': '自动化治理架构师，设计自动化系统的治理框架和合规机制',
  'Blockchain Security Auditor': '区块链安全审计师，审计 DeFi 协议和智能合约安全',
  'Compliance Auditor': '合规审计师，专注于 SOC 2、ISO 27001、HIPAA 等合规认证',
  'Corporate Training Designer': '企业培训设计师，设计培训体系和课程开发',
  'Cultural Intelligence Strategist': '文化智能策略师，确保软件产品跨文化适配和包容性',
  'Data Consolidation Agent': '数据整合代理，将提取的数据汇总到实时报表看板',
  'Developer Advocate': '开发者布道师，构建开发者社区和推动平台采纳',
  'Document Generator': '文档生成专家，生成 PDF、PPTX、DOCX、XLSX 等格式专业文档',
  'French Consulting Market Navigator': '法国咨询市场导航师，熟悉法国 ESN/SI 自由职业生态',
  'Government Digital Presales Consultant': '政府数字化售前顾问，精通等保、密评、信创等合规要求',
  'Healthcare Marketing Compliance Specialist': '医疗营销合规专家，精通广告法和医疗相关法规',
  'Identity Graph Operator': '身份图谱管理员，维护多智能体共享身份图谱',
  'Korean Business Navigator': '韩国商务导航师，精通韩国商务文化和职场礼仪',
  'LSP/Index Engineer': 'LSP 协议和代码索引工程专家',
  'MCP Builder': 'MCP 协议开发专家，构建扩展 AI 智能体能力的 MCP 服务器',
  'Model QA Specialist': '模型质量检测专家，端到端审计 ML 和统计模型',
  'Recruitment Specialist': '招聘专家，精通人才获取、评估和雇主品牌建设',
  'Report Distribution Agent': '报告分发代理，自动化分发销售报告',
  'Sales Data Extraction Agent': '销售数据提取代理，监控 Excel 并提取关键销售指标',
  'Salesforce Architect': 'Salesforce 平台架构专家，设计多云架构和集成方案',
  'Study Abroad Advisor': '留学规划顾问，覆盖美英加澳欧港新全方位留学规划',
  'Supply Chain Strategist': '供应链策略师，精通供应商开发、战略采购和质量管控',
  'Workflow Architect': '工作流架构师，设计完整的工作流树和构建规范',
  'ZK Steward': '知识库管理员，遵循卢曼卡片盒方法管理原子笔记和知识网络',
  'Analytics Reporter': '数据分析报告师，将原始数据转化为可执行的商业洞察',
  'Executive Summary Generator': '高管摘要生成器，将复杂商业信息转化为精炼的执行摘要',
  'Finance Tracker': '财务追踪专家，专注于财务规划、预算管理和经营分析',
  'Infrastructure Maintainer': '基础设施运维专家，确保系统可靠性、性能优化和安全',
  'Legal Compliance Checker': '法律合规检查员，确保业务运营符合各项法律法规',
  'Support Responder': '客户支持专员，提供卓越的客户服务和问题解决',
  'Accessibility Auditor': '无障碍审计师，按 WCAG 标准审计界面并确保包容性设计',
  'API Tester': 'API 测试专家，专注于全面的 API 验证、性能测试和质量保证',
  'Evidence Collector': '证据收集专家，以截图为依据的 QA 专家，要求视觉证据',
  'Performance Benchmarker': '性能基准测试专家，测量、分析和改进系统性能',
  'Reality Checker': '现实检验师，基于证据的认证评审，默认要求改进',
  'Test Results Analyzer': '测试结果分析师，综合评估测试数据并生成可执行洞察',
  'Tool Evaluator': '工具评估专家，评估、测试和推荐技术工具和平台',
  'Workflow Optimizer': '工作流优化专家，分析、优化和自动化业务流程',
};

interface Frontmatter {
  name: string;
  description: string;
  emoji: string;
  color: string;
}

function parseFrontmatter(content: string): Frontmatter | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const yaml = match[1];
  const get = (key: string): string => {
    const m = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    if (!m) return '';
    let val = m[1].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    return val;
  };

  const name = get('name');
  const description = get('description');
  if (!name) return null;

  return {
    name,
    description,
    emoji: get('emoji') || '🤖',
    color: get('color') || 'gray',
  };
}

/**
 * Extract a markdown section by heading keyword.
 * Matches ## headings containing the keyword (with optional emoji prefix / suffix text).
 * Returns the body text between this heading and the next ## heading, trimmed.
 */
function extractSection(content: string, keyword: string): string {
  const pattern = new RegExp(
    `^##\\s+(?:[^\\n]*?)?${keyword}(?:[^\\n]*)?$\\n([\\s\\S]*?)(?=^##\\s|$(?!\\n))`,
    'm'
  );
  const m = content.match(pattern);
  if (!m) return '';
  return m[1].trim();
}

/**
 * Translate a markdown section from English to Chinese.
 * Translates common structural patterns (headings, list items) while
 * preserving markdown formatting. Falls back to the original text for
 * untranslated lines.
 */
function translateSection(section: string): string {
  if (!section) return '';

  const TERM_MAP: Record<string, string> = {
    'Create': '创建', 'Build': '构建', 'Develop': '开发', 'Design': '设计',
    'Implement': '实现', 'Optimize': '优化', 'Manage': '管理', 'Monitor': '监控',
    'Analyze': '分析', 'Review': '审查', 'Test': '测试', 'Deploy': '部署',
    'Maintain': '维护', 'Configure': '配置', 'Automate': '自动化',
    'Ensure': '确保', 'Provide': '提供', 'Track': '追踪', 'Write': '编写',
    'Generate': '生成', 'Evaluate': '评估', 'Transform': '转化',
    'Performance': '性能', 'Security': '安全', 'Quality': '质量',
    'Accessibility': '可访问性', 'Scalability': '可扩展性',
    'User Experience': '用户体验', 'Code Quality': '代码质量',
    'Best Practices': '最佳实践', 'Architecture': '架构',
  };

  return section.replace(/###\s+(.+)/g, (_match, heading: string) => {
    let translated = heading;
    for (const [en, zh] of Object.entries(TERM_MAP)) {
      translated = translated.replace(new RegExp(`\\b${en}\\b`, 'gi'), zh);
    }
    return `### ${translated}`;
  });
}

function nameToId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function main() {
  const agencyRoot = process.argv[2] || AGENCY_AGENTS_DEFAULT;

  if (!fs.existsSync(agencyRoot)) {
    console.error(`agency-agents directory not found: ${agencyRoot}`);
    process.exit(1);
  }

  const categories: Array<{
    id: string;
    label: string;
    items: Array<{
      id: string;
      name: string;
      nameEn: string;
      emoji: string;
      description: string;
      descriptionEn: string;
      coreMission: string;
      criticalRules: string;
    }>;
  }> = [];

  let totalCount = 0;

  for (const dir of CATEGORY_DIRS) {
    const dirPath = path.join(agencyRoot, dir);
    if (!fs.existsSync(dirPath)) {
      console.warn(`Skipping missing directory: ${dir}`);
      continue;
    }

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));

    const subDirs = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const sub of subDirs) {
      const subPath = path.join(dirPath, sub);
      const subFiles = fs.readdirSync(subPath).filter(f => f.endsWith('.md'));
      files.push(...subFiles.map(f => path.join(sub, f)));
    }

    const items: typeof categories[number]['items'] = [];

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      if (!fs.statSync(filePath).isFile()) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      const fm = parseFrontmatter(content);
      if (!fm) {
        console.warn(`No frontmatter in ${filePath}`);
        continue;
      }

      const id = nameToId(fm.name);
      const nameZh = NAME_ZH[fm.name] || fm.name;
      const descZh = DESC_ZH[fm.name] || fm.description;

      const coreMissionEn = extractSection(content, 'Core Mission')
        || extractSection(content, 'Core Capabilities')
        || extractSection(content, 'Development Philosophy')
        || extractSection(content, 'Role Definition');
      const criticalRulesEn = extractSection(content, 'Critical Rules')
        || extractSection(content, 'Decision Framework');

      const coreMission = translateSection(coreMissionEn);
      const criticalRules = translateSection(criticalRulesEn);

      items.push({
        id,
        name: nameZh,
        nameEn: fm.name,
        emoji: fm.emoji,
        description: descZh,
        descriptionEn: fm.description,
        coreMission,
        criticalRules,
      });
    }

    items.sort((a, b) => a.id.localeCompare(b.id));
    totalCount += items.length;

    categories.push({
      id: dir,
      label: CATEGORY_LABELS[dir] || dir,
      items,
    });
  }

  const outPath = path.resolve(__dirname, '../shared/role-library.ts');

  let code = `/**
 * Role library extracted from agency-agents.
 * Auto-generated by scripts/extract-roles.ts — DO NOT EDIT MANUALLY.
 *
 * Total: ${totalCount} roles across ${categories.length} categories.
 * Generated: ${new Date().toISOString().slice(0, 10)}
 */
import type { RoleLibraryItem, RoleCategory } from './types';

export const ROLE_LIBRARY: RoleCategory[] = [\n`;

  for (const cat of categories) {
    code += `  {\n`;
    code += `    id: '${escapeString(cat.id)}',\n`;
    code += `    label: '${escapeString(cat.label)}',\n`;
    code += `    items: [\n`;
    for (const item of cat.items) {
      code += `      {\n`;
      code += `        id: '${escapeString(item.id)}',\n`;
      code += `        name: '${escapeString(item.name)}',\n`;
      code += `        nameEn: '${escapeString(item.nameEn)}',\n`;
      code += `        emoji: '${escapeString(item.emoji)}',\n`;
      code += `        description: '${escapeString(item.description)}',\n`;
      code += `        descriptionEn: '${escapeString(item.descriptionEn)}',\n`;
      code += `        coreMission: '${escapeString(item.coreMission)}',\n`;
      code += `        criticalRules: '${escapeString(item.criticalRules)}',\n`;
      code += `      },\n`;
    }
    code += `    ],\n`;
    code += `  },\n`;
  }

  code += `];\n`;

  fs.writeFileSync(outPath, code, 'utf-8');
  console.log(`Generated ${outPath}`);
  console.log(`  ${totalCount} roles in ${categories.length} categories`);
}

main();
