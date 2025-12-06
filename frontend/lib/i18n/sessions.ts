import type { Language } from "../i18n-context";

export const sessionsTranslations: Record<Language, Record<string, string>> = {
  en: {
    // 标题和描述
    "sessions.title": "Active Sessions",
    "sessions.description": "Manage your active login sessions across devices",
    
    // 会话信息
    "sessions.current_device": "Current Device",
    "sessions.last_active": "Last active",
    "sessions.logged_in": "Logged in",
    "sessions.unknown_ip": "Unknown IP",
    
    // 操作按钮
    "sessions.revoke": "Revoke",
    "sessions.revoke_all_other_sessions": "Revoke All Other Sessions",
    
    // 撤销单个会话对话框
    "sessions.revoke_dialog_title": "Revoke Session?",
    "sessions.revoke_dialog_description": "Are you sure you want to revoke this session? The device will be logged out immediately.",
    "sessions.revoke_session": "Revoke Session",
    "sessions.revoking": "Revoking...",
    
    // 撤销所有会话对话框
    "sessions.revoke_all_dialog_title": "Revoke All Other Sessions?",
    "sessions.revoke_all_dialog_description": "This will log out all devices except this one. You'll need to log in again on those devices.",
    "sessions.sessions_to_revoke": "Sessions to revoke",
    "sessions.revoke_all_sessions": "Revoke All Sessions",
    
    // 状态消息
    "sessions.no_sessions": "No active sessions",
    "sessions.revoke_success": "Session revoked",
    "sessions.revoke_success_description": "The session has been successfully revoked",
    "sessions.revoke_error": "Failed to revoke session",
    "sessions.revoke_error_description": "An error occurred while revoking the session",
    "sessions.revoke_all_success": "All sessions revoked",
    "sessions.revoke_all_success_description": "All other sessions have been successfully revoked",
    "sessions.revoke_all_error": "Failed to revoke sessions",
    "sessions.revoke_all_error_description": "An error occurred while revoking the sessions",
  },
  zh: {
    // 标题和描述
    "sessions.title": "活跃会话",
    "sessions.description": "管理您在不同设备上的登录会话",
    
    // 会话信息
    "sessions.current_device": "当前设备",
    "sessions.last_active": "最后活跃",
    "sessions.logged_in": "登录时间",
    "sessions.unknown_ip": "未知 IP",
    
    // 操作按钮
    "sessions.revoke": "撤销",
    "sessions.revoke_all_other_sessions": "撤销所有其他会话",
    
    // 撤销单个会话对话框
    "sessions.revoke_dialog_title": "撤销会话？",
    "sessions.revoke_dialog_description": "确定要撤销此会话吗？该设备将立即被登出。",
    "sessions.revoke_session": "撤销会话",
    "sessions.revoking": "撤销中...",
    
    // 撤销所有会话对话框
    "sessions.revoke_all_dialog_title": "撤销所有其他会话？",
    "sessions.revoke_all_dialog_description": "这将登出除当前设备外的所有设备。您需要在这些设备上重新登录。",
    "sessions.sessions_to_revoke": "将撤销的会话数",
    "sessions.revoke_all_sessions": "撤销所有会话",
    
    // 状态消息
    "sessions.no_sessions": "暂无活跃会话",
    "sessions.revoke_success": "会话已撤销",
    "sessions.revoke_success_description": "会话已成功撤销",
    "sessions.revoke_error": "撤销会话失败",
    "sessions.revoke_error_description": "撤销会话时发生错误",
    "sessions.revoke_all_success": "所有会话已撤销",
    "sessions.revoke_all_success_description": "所有其他会话已成功撤销",
    "sessions.revoke_all_error": "撤销会话失败",
    "sessions.revoke_all_error_description": "撤销会话时发生错误",
  },
};
