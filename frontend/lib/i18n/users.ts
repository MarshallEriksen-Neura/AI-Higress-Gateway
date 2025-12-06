import type { Language } from "../i18n-context";

export const usersTranslations: Record<Language, Record<string, string>> = {
  en: {
    // Users page
    "users.title": "User Management",
    "users.subtitle": "Manage user accounts and permissions",
    "users.add_user": "Add User",
    "users.table_column_name": "Name",
    "users.table_column_email": "Email",
    "users.table_column_roles": "Roles",
    "users.table_column_status": "Status",
    "users.table_column_last_login": "Last Login",
    "users.manage_roles": "Manage Roles",
    "users.roles_dialog_title": "Manage User Roles",
    "users.roles_dialog_desc": "Assign roles to this user",
    "users.select_roles": "Select roles for this user",
    // User roles page
    "users.roles_search_placeholder": "Search roles...",
    "users.assigned_roles": "Assigned Roles",
    "users.roles_load_error": "Failed to load user roles",
    "users.roles_save_success": "User roles updated successfully",
    "users.roles_save_error": "Failed to update user roles",
    "users.roles_empty": "No roles available",
  },
  zh: {
    // Users page
    "users.title": "用户管理",
    "users.subtitle": "管理用户账户和权限",
    "users.add_user": "添加用户",
    "users.table_column_name": "姓名",
    "users.table_column_email": "邮箱",
    "users.table_column_roles": "角色",
    "users.table_column_status": "状态",
    "users.table_column_last_login": "最后登录",
    "users.manage_roles": "管理角色",
    "users.roles_dialog_title": "管理用户角色",
    "users.roles_dialog_desc": "为该用户分配角色",
    "users.select_roles": "为该用户选择角色",
    // User roles page
    "users.roles_search_placeholder": "搜索角色名称或编码...",
    "users.assigned_roles": "已分配角色",
    "users.roles_load_error": "加载用户角色失败",
    "users.roles_save_success": "用户角色更新成功",
    "users.roles_save_error": "更新用户角色失败",
    "users.roles_empty": "暂无可用角色",
  },
};
