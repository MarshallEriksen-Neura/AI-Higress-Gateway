import type { Language } from "../i18n-context";

export const permissionsTranslations: Record<Language, Record<string, string>> = {
  en: {
    // Page
    "permissions.title": "User Permissions",
    "permissions.subtitle": "Manage fine-grained permissions for this user",
    "permissions.back_to_users": "Back to Users",
    "permissions.grant_permission": "Grant Permission",
    "permissions.no_permissions": "This user has no special permissions",
    
    // Table
    "permissions.table_type": "Permission Type",
    "permissions.table_value": "Value",
    "permissions.table_expires": "Expires At",
    "permissions.table_notes": "Notes",
    "permissions.table_status": "Status",
    "permissions.table_actions": "Actions",
    
    // Status
    "permissions.status_active": "Active",
    "permissions.status_expired": "Expired",
    "permissions.never_expires": "Never",
    
    // Dialogs
    "permissions.grant_dialog_title": "Grant Permission",
    "permissions.grant_dialog_desc": "Grant a new permission to this user",
    "permissions.edit_dialog_title": "Edit Permission",
    "permissions.edit_dialog_desc": "Update permission configuration",
    
    // Form Labels
    "permissions.label_type": "Permission Type",
    "permissions.label_value": "Permission Value",
    "permissions.label_expires": "Expires At",
    "permissions.label_notes": "Notes",
    
    // Placeholders
    "permissions.placeholder_select_type": "Select permission type",
    "permissions.placeholder_value": "e.g., 10",
    "permissions.placeholder_notes": "Add notes...",
    
    // Expiry Options
    "permissions.expires_never": "Never",
    "permissions.expires_1month": "1 Month",
    "permissions.expires_3months": "3 Months",
    "permissions.expires_6months": "6 Months",
    "permissions.expires_1year": "1 Year",
    "permissions.expires_custom": "Custom Date",
    
    // Revoke Dialog
    "permissions.revoke_confirm_title": "Revoke Permission?",
    "permissions.revoke_confirm_desc": "You are about to revoke the following permission from user {user}:",
    "permissions.revoke_warning": "This action cannot be undone.",
    "permissions.btn_revoke": "Revoke",
    
    // Messages
    "permissions.success_granted": "Permission granted successfully",
    "permissions.success_updated": "Permission updated successfully",
    "permissions.success_revoked": "Permission revoked successfully",
    "permissions.error_grant": "Failed to grant permission",
    "permissions.error_update": "Failed to update permission",
    "permissions.error_revoke": "Failed to revoke permission",
    "permissions.error_load": "Failed to load permissions",
    
    // Permission Types
    "permissions.type_create_private_provider": "Create Private Provider",
    "permissions.type_create_private_provider_desc": "Allow user to create private providers",
    "permissions.type_submit_shared_provider": "Submit Shared Provider",
    "permissions.type_submit_shared_provider_desc": "Allow user to submit shared providers to public pool",
    "permissions.type_unlimited_providers": "Unlimited Providers",
    "permissions.type_unlimited_providers_desc": "No limit on the number of providers user can create",
    "permissions.type_private_provider_limit": "Private Provider Limit",
    "permissions.type_private_provider_limit_desc": "Set maximum number of private providers user can create",
    "permissions.label_limit_value": "Limit Value",
    "permissions.placeholder_limit_value": "e.g., 10",
    
    // User Info
    "permissions.user_info": "User Information",
    "permissions.user_roles": "Roles",
    "permissions.user_status": "Status",
  },
  zh: {
    // Page
    "permissions.title": "用户权限管理",
    "permissions.subtitle": "管理该用户的细粒度权限配置",
    "permissions.back_to_users": "返回用户列表",
    "permissions.grant_permission": "授予权限",
    "permissions.no_permissions": "该用户暂无特殊权限",
    
    // Table
    "permissions.table_type": "权限类型",
    "permissions.table_value": "权限值",
    "permissions.table_expires": "过期时间",
    "permissions.table_notes": "备注",
    "permissions.table_status": "状态",
    "permissions.table_actions": "操作",
    
    // Status
    "permissions.status_active": "有效",
    "permissions.status_expired": "已过期",
    "permissions.never_expires": "永久",
    
    // Dialogs
    "permissions.grant_dialog_title": "授予权限",
    "permissions.grant_dialog_desc": "为该用户授予新权限",
    "permissions.edit_dialog_title": "编辑权限",
    "permissions.edit_dialog_desc": "更新权限配置",
    
    // Form Labels
    "permissions.label_type": "权限类型",
    "permissions.label_value": "权限值",
    "permissions.label_expires": "过期时间",
    "permissions.label_notes": "备注",
    
    // Placeholders
    "permissions.placeholder_select_type": "选择权限类型",
    "permissions.placeholder_value": "例如: 10",
    "permissions.placeholder_notes": "添加备注说明...",
    
    // Expiry Options
    "permissions.expires_never": "永久",
    "permissions.expires_1month": "1个月后",
    "permissions.expires_3months": "3个月后",
    "permissions.expires_6months": "6个月后",
    "permissions.expires_1year": "1年后",
    "permissions.expires_custom": "自定义日期",
    
    // Revoke Dialog
    "permissions.revoke_confirm_title": "确认撤销权限？",
    "permissions.revoke_confirm_desc": "您即将撤销用户 {user} 的以下权限：",
    "permissions.revoke_warning": "此操作不可恢复。",
    "permissions.btn_revoke": "确认撤销",
    
    // Messages
    "permissions.success_granted": "权限授予成功",
    "permissions.success_updated": "权限更新成功",
    "permissions.success_revoked": "权限撤销成功",
    "permissions.error_grant": "授予权限失败",
    "permissions.error_update": "更新权限失败",
    "permissions.error_revoke": "撤销权限失败",
    "permissions.error_load": "加载权限失败",
    
    // Permission Types
    "permissions.type_create_private_provider": "创建私有提供商",
    "permissions.type_create_private_provider_desc": "允许用户创建私有提供商",
    "permissions.type_submit_shared_provider": "提交共享提供商",
    "permissions.type_submit_shared_provider_desc": "允许用户提交共享提供商到公共池",
    "permissions.type_unlimited_providers": "无限制提供商",
    "permissions.type_unlimited_providers_desc": "不限制用户可创建的提供商数量",
    "permissions.type_private_provider_limit": "私有提供商限制",
    "permissions.type_private_provider_limit_desc": "设置用户可创建的私有提供商数量上限",
    "permissions.label_limit_value": "数量上限",
    "permissions.placeholder_limit_value": "例如: 10",
    
    // User Info
    "permissions.user_info": "用户信息",
    "permissions.user_roles": "角色",
    "permissions.user_status": "状态",
  },
};