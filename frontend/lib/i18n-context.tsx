"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "zh";

type Translations = {
    [key in Language]: {
        [key: string]: string;
    };
};

const translations: Translations = {
    en: {
        "app.title": "AI Higress",
        "app.subtitle": "A Cloud-Native AI Gateway with Ink Wash Aesthetics",
        "hero.welcome": "Welcome to AI Higress, a powerful API gateway designed for the AI era. This project demonstrates a unique \"Ink Wash\" (Shui-mo) design language, blending traditional Chinese aesthetics with modern web technology.",
        "hero.explore": "Explore our dashboard to see the style in action, managing AI providers and metrics with elegance.",
        "btn.enter_dashboard": "Enter Dashboard",
        "btn.view_source": "View Source",
        "footer.design": "Designed with Shadcn UI & Tailwind CSS",
        "dashboard.title": "AI Higress",
        "dashboard.subtitle": "Ink Wash Control Center",
        "dashboard.settings": "Settings",
        "dashboard.connect": "Connect",
        "dashboard.active_providers": "Active Providers",
        "dashboard.metrics": "Performance Metrics",
        "dashboard.system_status": "System Status",
        "dashboard.quick_actions": "Quick Actions",
        "dashboard.add_provider": "Add New Provider",
        "dashboard.gen_key": "Generate API Key",
        "dashboard.view_logs": "View Access Logs",
        "status.online": "Online",
        "status.connected": "Connected",
        "status.active": "Active",
        "status.operational": "Operational",
        "table.model": "Model",
        "table.success_rate": "Success Rate",
        "table.avg_latency": "Avg Latency",
        "table.total_requests": "Total Requests",
        "label.type": "Type",
        "label.models": "Models",
        "label.available": "available",
        // Navigation
        "nav.overview": "Overview",
        "nav.providers": "Providers",
        "nav.logical_models": "Logical Models",
        "nav.api_keys": "API Keys",
        "nav.routing": "Routing",
        "nav.metrics": "Metrics",
        "nav.admin": "Admin",
        "nav.system": "System",
        "nav.users": "Users",
        "nav.my_profile": "My Profile",
        // Overview dashboard page
        "overview.title": "Dashboard Overview",
        "overview.subtitle": "Welcome back, here’s what’s happening today.",
        "overview.total_requests": "Total Requests",
        "overview.active_providers": "Active Providers",
        "overview.cache_hit_rate": "Cache Hit Rate",
        "overview.from_last_month": "from last month",
        "overview.view_all": "View All",
        "overview.status_healthy": "Healthy",
        "overview.status_degraded": "Degraded",
        "overview.recent_activity": "Recent Activity",
        "overview.recent_activity_placeholder": "Activity Chart Placeholder",
        // Additional table labels
        "table.latency": "Latency",
        // Providers page
        "providers.title": "Providers",
        "providers.subtitle": "Manage your AI model providers",
        "providers.add_provider": "Add Provider",
        "providers.dialog_title": "Add New Provider",
        "providers.dialog_description": "Configure a new AI model provider",
        "providers.advanced_settings": "Advanced settings (optional)",
        "providers.btn_cancel": "Cancel",
        "providers.btn_create": "Create Provider",
        "providers.btn_save": "Save",
        "providers.table_all_providers": "All Providers",
        "providers.table_all_providers_description": "A list of all configured AI providers",
        "providers.table_column_id": "ID",
        "providers.table_column_name": "Name",
        "providers.table_column_vendor": "Vendor",
        "providers.table_column_type": "Provider Type",
        "providers.table_column_status": "Status",
        "providers.table_column_models": "Models",
        "providers.table_column_last_sync": "Last Sync",
        "providers.table_column_actions": "Actions",
        "providers.status_active": "Active",
        "providers.status_inactive": "Inactive",
        "providers.action_edit": "Edit",
        "providers.action_delete": "Delete",
        "providers.action_disable": "Disable",
        "providers.action_enable": "Enable",
        "providers.action_delete_confirm": "Are you sure you want to delete this provider? This action cannot be undone.",
        "providers.action_view_models": "View models",
        "providers.models_dialog_title": "Models for this provider",
        "providers.models_dialog_description": "This is a preview list of models configured for the selected provider. In the future this will be loaded from the gateway API.",
        // Top navigation
        "topnav.admin_user_name": "Admin User",
        "topnav.admin_role": "Administrator",
        // Auth / Login
        "auth.login.subtitle": "Sign in to your account",
        "auth.email_label": "Email",
        "auth.email_placeholder": "name@example.com",
        "auth.password_label": "Password",
        "auth.password_placeholder": "Enter your password",
        "auth.remember_me": "Remember me",
        "auth.forgot_password": "Forgot password?",
        "auth.login_button": "Sign In",
        "auth.no_account": "Don't have an account?",
        "auth.signup_link": "Sign up",
        "auth.register.subtitle": "Create a new account",
        "auth.register_button": "Sign Up",
        "auth.name_label": "Name",
        "auth.name_placeholder": "Your name",
        "auth.confirm_password_label": "Confirm Password",
        "auth.confirm_password_placeholder": "Confirm your password",
        "auth.have_account": "Already have an account?",
        "auth.signin_link": "Sign in",
        // Home / Landing
        "home.tagline": "Cloud-Native AI Gateway · Smart Routing · Unified Management",
        "home.description": "Provide a unified API gateway for AI applications with multi-model smart routing, load balancing, and failover to make AI service calls simpler and more reliable.",
        "home.btn_enter_console": "Enter Console",
        "home.btn_get_started": "Get Started",
        "home.features_title": "Core Features",
        "home.features_subtitle": "Powerful capabilities with a minimalist design",
        "home.feature.smart_routing.title": "Smart Routing",
        "home.feature.smart_routing.description": "Supports round-robin, weighted, failover, and other routing strategies to automatically choose the best model.",
        "home.feature.multi_model.title": "Multi-Model Management",
        "home.feature.multi_model.description": "Manage models from OpenAI, Anthropic, Google, and more in a unified way.",
        "home.feature.high_performance.title": "High Performance",
        "home.feature.high_performance.description": "Low latency and high concurrency with request caching and load balancing.",
        "home.feature.secure_reliable.title": "Secure and Reliable",
        "home.feature.secure_reliable.description": "API key management, access control, and rate limiting to keep your system safe.",
        "home.feature.real_time_monitoring.title": "Real-Time Monitoring",
        "home.feature.real_time_monitoring.description": "Comprehensive metrics, request logs, and visual monitoring dashboards.",
        "home.feature.unified_interface.title": "Unified Interface",
        "home.feature.unified_interface.description": "One API key to access all models, simplifying integration.",
        "home.use_cases_title": "Use Cases",
        "home.use_case.enterprise.title": "Enterprise AI Applications",
        "home.use_case.enterprise.item1": "• Unified management of multiple AI model providers",
        "home.use_case.enterprise.item2": "• Smart routing to choose the best model",
        "home.use_case.enterprise.item3": "• Cost optimization and performance monitoring",
        "home.use_case.enterprise.item4": "• Access control and security management",
        "home.use_case.developer.title": "Developer Platforms",
        "home.use_case.developer.item1": "• One API key for all models",
        "home.use_case.developer.item2": "• Automatic failover and load balancing",
        "home.use_case.developer.item3": "• Detailed request logs and analytics",
        "home.use_case.developer.item4": "• Simplified AI service integration",
        "home.cta_title": "Start Now",
        "home.cta_description": "Experience the convenience and efficiency of AI Higress and make AI service calls easier.",
        "home.btn_view_demo": "View Demo",
        "home.btn_view_docs": "View Docs",
        "home.footer_copyright": "© 2024 AI Higress. Built with a minimalist design philosophy.",
        "home.footer_console": "Console",
        "home.footer_docs": "Docs",
        "home.footer_github": "GitHub",
        // Common
        "common.toggle_theme": "Toggle theme",
        "common.switch_language": "Switch language",
    },
    zh: {
        "app.title": "AI Higress",
        "app.subtitle": "云原生 AI 网关 - 水墨雅韵",
        "hero.welcome": "欢迎使用 AI Higress，专为 AI 时代打造的强大 API 网关。本项目展示了独特的“水墨”设计语言，将中国传统美学与现代 Web 技术完美融合。",
        "hero.explore": "探索我们的仪表盘，体验优雅地管理 AI 提供商和指标。",
        "btn.enter_dashboard": "进入仪表盘",
        "btn.view_source": "查看源码",
        "footer.design": "基于 Shadcn UI & Tailwind CSS 设计",
        "dashboard.title": "AI Higress",
        "dashboard.subtitle": "水墨控制中心",
        "dashboard.settings": "设置",
        "dashboard.connect": "连接",
        "dashboard.active_providers": "活跃提供商",
        "dashboard.metrics": "性能指标",
        "dashboard.system_status": "系统状态",
        "dashboard.quick_actions": "快捷操作",
        "dashboard.add_provider": "添加新提供商",
        "dashboard.gen_key": "生成 API 密钥",
        "dashboard.view_logs": "查看访问日志",
        "status.online": "在线",
        "status.connected": "已连接",
        "status.active": "运行中",
        "status.operational": "正常运行",
        "table.model": "模型",
        "table.success_rate": "成功率",
        "table.avg_latency": "平均延迟",
        "table.total_requests": "总请求数",
        "label.type": "类型",
        "label.models": "模型",
        "label.available": "可用",
        // Navigation
        "nav.overview": "概览",
        "nav.providers": "提供商",
        "nav.logical_models": "逻辑模型",
        "nav.api_keys": "API 密钥",
        "nav.routing": "路由",
        "nav.metrics": "监控指标",
        "nav.admin": "管理",
        "nav.system": "系统配置",
        "nav.users": "用户管理",
        "nav.my_profile": "我的资料",
        // Overview dashboard page
        "overview.title": "仪表盘概览",
        "overview.subtitle": "欢迎回来，以下是今天的整体运行情况。",
        "overview.total_requests": "总请求数",
        "overview.active_providers": "活跃提供商",
        "overview.cache_hit_rate": "缓存命中率",
        "overview.from_last_month": "相比上个月",
        "overview.view_all": "查看全部",
        "overview.status_healthy": "健康",
        "overview.status_degraded": "性能下降",
        "overview.recent_activity": "近期活动",
        "overview.recent_activity_placeholder": "活动图表占位",
        // Additional table labels
        "table.latency": "延迟",
        // Providers page
        "providers.title": "提供商",
        "providers.subtitle": "管理你的 AI 模型提供商",
        "providers.add_provider": "添加提供商",
        "providers.dialog_title": "添加新提供商",
        "providers.dialog_description": "配置一个新的 AI 模型提供商",
        "providers.advanced_settings": "高级设置（可选）",
        "providers.btn_cancel": "取消",
        "providers.btn_create": "创建提供商",
        "providers.btn_save": "保存",
        "providers.table_all_providers": "全部提供商",
        "providers.table_all_providers_description": "当前已配置的所有 AI 提供商列表",
        "providers.table_column_id": "ID",
        "providers.table_column_name": "名称",
        "providers.table_column_vendor": "厂商",
        "providers.table_column_type": "提供商类型",
        "providers.table_column_status": "状态",
        "providers.table_column_models": "模型数",
        "providers.table_column_last_sync": "最后同步",
        "providers.table_column_actions": "操作",
        "providers.status_active": "运行中",
        "providers.status_inactive": "未启用",
        "providers.action_edit": "编辑",
        "providers.action_delete": "删除",
        "providers.action_disable": "禁用",
        "providers.action_enable": "启用",
        "providers.action_delete_confirm": "确定要删除该提供商吗？此操作无法撤销。",
        "providers.action_view_models": "查看模型列表",
        "providers.models_dialog_title": "该提供商的模型列表",
        "providers.models_dialog_description": "下面是当前为该提供商展示的模型示例，后续将通过网关接口实时获取模型列表。",
        // Top navigation
        "topnav.admin_user_name": "管理员",
        "topnav.admin_role": "系统管理员",
        // Auth / Login
        "auth.login.subtitle": "登录到你的账户",
        "auth.email_label": "邮箱",
        "auth.email_placeholder": "name@example.com",
        "auth.password_label": "密码",
        "auth.password_placeholder": "请输入密码",
        "auth.remember_me": "记住我",
        "auth.forgot_password": "忘记密码？",
        "auth.login_button": "登录",
        "auth.no_account": "还没有账号？",
        "auth.signup_link": "立即注册",
        "auth.register.subtitle": "创建一个新账户",
        "auth.register_button": "注册",
        "auth.name_label": "姓名",
        "auth.name_placeholder": "请输入姓名",
        "auth.confirm_password_label": "确认密码",
        "auth.confirm_password_placeholder": "请再次输入密码",
        "auth.have_account": "已经有账号？",
        "auth.signin_link": "去登录",
        // Home / Landing
        "home.tagline": "云原生 AI 网关 · 智能路由 · 统一管理",
        "home.description": "为 AI 应用提供统一的 API 网关，支持多模型智能路由、负载均衡、故障转移，让 AI 服务调用更简单、更可靠。",
        "home.btn_enter_console": "进入控制台",
        "home.btn_get_started": "开始使用",
        "home.features_title": "核心功能",
        "home.features_subtitle": "强大的功能，简洁的设计",
        "home.feature.smart_routing.title": "智能路由",
        "home.feature.smart_routing.description": "支持轮询、加权、故障转移等多种路由策略，自动选择最优模型。",
        "home.feature.multi_model.title": "多模型管理",
        "home.feature.multi_model.description": "统一管理 OpenAI、Anthropic、Google 等多家 AI 提供商的模型。",
        "home.feature.high_performance.title": "高性能",
        "home.feature.high_performance.description": "低延迟、高并发，支持请求缓存和负载均衡。",
        "home.feature.secure_reliable.title": "安全可靠",
        "home.feature.secure_reliable.description": "API 密钥管理、访问控制、请求限流，保障系统安全。",
        "home.feature.real_time_monitoring.title": "实时监控",
        "home.feature.real_time_monitoring.description": "完整的性能指标、请求日志和可视化监控面板。",
        "home.feature.unified_interface.title": "统一接口",
        "home.feature.unified_interface.description": "一个 API 密钥访问所有模型，简化集成流程。",
        "home.use_cases_title": "应用场景",
        "home.use_case.enterprise.title": "企业 AI 应用",
        "home.use_case.enterprise.item1": "• 统一管理多个 AI 模型提供商",
        "home.use_case.enterprise.item2": "• 智能路由选择最优模型",
        "home.use_case.enterprise.item3": "• 成本优化和性能监控",
        "home.use_case.enterprise.item4": "• 访问控制和安全管理",
        "home.use_case.developer.title": "开发者平台",
        "home.use_case.developer.item1": "• 一个 API 密钥访问所有模型",
        "home.use_case.developer.item2": "• 自动故障转移和负载均衡",
        "home.use_case.developer.item3": "• 详细的请求日志和分析",
        "home.use_case.developer.item4": "• 简化 AI 服务集成流程",
        "home.cta_title": "立即开始",
        "home.cta_description": "体验 AI Higress 带来的便捷和高效，让 AI 服务调用更简单。",
        "home.btn_view_demo": "查看演示",
        "home.btn_view_docs": "查看文档",
        "home.footer_copyright": "© 2024 AI Higress. 基于极简设计理念构建",
        "home.footer_console": "控制台",
        "home.footer_docs": "文档",
        "home.footer_github": "GitHub",
        // Common
        "common.toggle_theme": "切换主题",
        "common.switch_language": "切换语言",
    },
};

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>("zh"); // Default to Chinese as per "Ink Wash" theme fit

    // Load saved language on mount
    useEffect(() => {
        try {
            const saved = window.localStorage.getItem("ai_higress_lang");
            if (saved === "en" || saved === "zh") {
                setLanguageState(saved);
            }
        } catch {
            // ignore storage errors
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        try {
            window.localStorage.setItem("ai_higress_lang", lang);
        } catch {
            // ignore storage errors
        }
    };

    const t = (key: string) => {
        return translations[language][key] || key;
    };

    return (
        <I18nContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error("useI18n must be used within an I18nProvider");
    }
    return context;
}
