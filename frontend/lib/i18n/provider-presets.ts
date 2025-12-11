import type { Language } from "../i18n-context";

export const providerPresetsTranslations: Record<Language, Record<string, string>> = {
  en: {
    // Page actions
    "provider_presets.search_placeholder": "Search presets (ID / Name / Description / Base URL)...",
    "provider_presets.export": "Export",
    "provider_presets.import": "Import",
    "provider_presets.create": "Create preset",
    "provider_presets.loading": "Loading...",
    "provider_presets.load_error": "Failed to load provider presets",
    "provider_presets.retry": "Retry",

    // Empty state
    "provider_presets.empty_title": "No provider presets",
    "provider_presets.empty_description": "Click \"Create preset\" to add the first provider preset",

    // Delete confirmation
    "provider_presets.delete_confirm_title": "Confirm deletion",
    "provider_presets.delete_confirm_desc": "Are you sure you want to delete provider preset",
    "provider_presets.delete_confirm_warning": "This action cannot be undone",
    "provider_presets.delete_cancel": "Cancel",
    "provider_presets.delete_confirm": "Delete",
    "provider_presets.deleting": "Deleting...",
    "provider_presets.delete_success": "Provider preset deleted",
    "provider_presets.delete_error": "Failed to delete provider preset",

    // Export
    "provider_presets.export_success": "Exported {count} preset(s)",
    "provider_presets.export_error": "Failed to export presets",

    // Import dialog
    "provider_presets.import_title": "Import presets",
    "provider_presets.import_description": "Upload a JSON file containing provider presets",
    "provider_presets.import_file_label": "Preset file",
    "provider_presets.import_file_selected": "Selected file: {filename}",
    "provider_presets.import_file_size_error": "File size must be under 10MB",
    "provider_presets.import_format_error": "Invalid file format, must be JSON array or { presets: [] }",
    "provider_presets.import_empty_error": "No presets found in file",
    "provider_presets.import_parse_error": "Failed to parse the file, please check the JSON",
    "provider_presets.import_no_file_error": "Please select a preset file first",
    "provider_presets.import_overwrite_label": "Overwrite existing presets",
    "provider_presets.import_overwrite_hint": "When enabled, presets with the same ID will be replaced",
    "provider_presets.import_preview": "Preview: {count} preset(s) will be imported",
    "provider_presets.import_preview_ids": "Preset IDs: {ids}",
    "provider_presets.import_cancel": "Cancel",
    "provider_presets.import_submit": "Import",
    "provider_presets.importing": "Importing...",
    "provider_presets.import_success": "Import completed: {summary}",
    "provider_presets.import_summary_created": "{count} created",
    "provider_presets.import_summary_updated": "{count} updated",
    "provider_presets.import_summary_skipped": "{count} skipped",
    "provider_presets.import_failed": "{count} preset(s) failed to import",
    "provider_presets.import_error": "Failed to import presets",

    // Provider preset table
    "provider_presets.table_preset_id": "Preset ID",
    "provider_presets.table_display_name": "Display Name",
    "provider_presets.table_base_url": "Base URL",
    "provider_presets.table_provider_type": "Provider Type",
    "provider_presets.table_transport": "Transport",
    "provider_presets.table_created_at": "Created At",
    "provider_presets.table_actions": "Actions",
    "provider_presets.provider_type_native": "Native",
    "provider_presets.provider_type_aggregate": "Aggregate",
    "provider_presets.action_edit": "Edit preset",
    "provider_presets.action_delete": "Delete preset",
  },
  zh: {
    // 页面操作
    "provider_presets.search_placeholder": "搜索预设（ID / 名称 / 描述 / Base URL）...",
    "provider_presets.export": "导出",
    "provider_presets.import": "导入",
    "provider_presets.create": "创建预设",
    "provider_presets.loading": "加载中...",
    "provider_presets.load_error": "加载提供商预设失败",
    "provider_presets.retry": "重试",

    // 空状态
    "provider_presets.empty_title": "暂无提供商预设",
    "provider_presets.empty_description": "点击“创建预设”按钮添加第一个提供商预设",

    // 删除确认
    "provider_presets.delete_confirm_title": "确认删除",
    "provider_presets.delete_confirm_desc": "确定要删除提供商预设",
    "provider_presets.delete_confirm_warning": "此操作不可撤销",
    "provider_presets.delete_cancel": "取消",
    "provider_presets.delete_confirm": "删除",
    "provider_presets.deleting": "删除中...",
    "provider_presets.delete_success": "预设删除成功",
    "provider_presets.delete_error": "删除提供商预设失败",

    // 导出
    "provider_presets.export_success": "成功导出 {count} 个预设",
    "provider_presets.export_error": "导出预设失败",

    // 导入对话框
    "provider_presets.import_title": "导入预设",
    "provider_presets.import_description": "上传包含提供商预设的 JSON 文件",
    "provider_presets.import_file_label": "预设文件",
    "provider_presets.import_file_selected": "已选择文件：{filename}",
    "provider_presets.import_file_size_error": "文件大小需小于 10MB",
    "provider_presets.import_format_error": "文件格式不正确，应为 JSON 数组或 { presets: [] }",
    "provider_presets.import_empty_error": "文件中未找到预设",
    "provider_presets.import_parse_error": "文件解析失败，请检查 JSON 内容",
    "provider_presets.import_no_file_error": "请先选择预设文件",
    "provider_presets.import_overwrite_label": "覆盖同名预设",
    "provider_presets.import_overwrite_hint": "开启后，ID 相同的预设会被替换",
    "provider_presets.import_preview": "预览：将导入 {count} 条预设",
    "provider_presets.import_preview_ids": "预设 ID：{ids}",
    "provider_presets.import_cancel": "取消",
    "provider_presets.import_submit": "导入",
    "provider_presets.importing": "导入中...",
    "provider_presets.import_success": "导入完成：{summary}",
    "provider_presets.import_summary_created": "新增 {count} 条",
    "provider_presets.import_summary_updated": "更新 {count} 条",
    "provider_presets.import_summary_skipped": "跳过 {count} 条",
    "provider_presets.import_failed": "{count} 条预设导入失败",
    "provider_presets.import_error": "导入预设失败",

    // 提供商预设表格与操作
    "provider_presets.table_preset_id": "预设ID",
    "provider_presets.table_display_name": "显示名称",
    "provider_presets.table_base_url": "基础URL",
    "provider_presets.table_provider_type": "提供商类型",
    "provider_presets.table_transport": "传输方式",
    "provider_presets.table_created_at": "创建时间",
    "provider_presets.table_actions": "操作",
    "provider_presets.provider_type_native": "原生",
    "provider_presets.provider_type_aggregate": "聚合",
    "provider_presets.action_edit": "编辑预设",
    "provider_presets.action_delete": "删除预设",
  },
};
