import type { Language } from "../i18n-context";

export const submissionsTranslations: Record<Language, Record<string, string>> = {
  en: {
    // My Submissions page
    "submissions.my_title": "My Submissions",
    "submissions.my_subtitle": "View and manage your shared provider submissions",
    "submissions.submit_new": "Submit New Provider",
    "submissions.search_placeholder": "Search submissions...",
    "submissions.filter_all": "All Status",
    "submissions.filter_pending": "Pending",
    "submissions.filter_approved": "Approved",
    "submissions.filter_rejected": "Rejected",
    
    // Admin Submissions page
    "submissions.admin_title": "Provider Submissions",
    "submissions.admin_subtitle": "Review and manage user-submitted shared providers",
    "submissions.stats_total": "Total Submissions",
    "submissions.stats_pending": "Pending Review",
    "submissions.stats_approved": "Approved",
    "submissions.stats_rejected": "Rejected",
    
    // Table columns
    "submissions.column_name": "Provider Name",
    "submissions.column_provider_id": "Provider ID",
    "submissions.column_base_url": "Base URL",
    "submissions.column_type": "Type",
    "submissions.column_status": "Status",
    "submissions.column_submitted_at": "Submitted At",
    "submissions.column_reviewed_at": "Reviewed At",
    "submissions.column_reviewer": "Reviewer",
    "submissions.column_actions": "Actions",
    
    // Status badges
    "submissions.status_pending": "Pending",
    "submissions.status_approved": "Approved",
    "submissions.status_rejected": "Rejected",
    
    // Provider types
    "submissions.type_native": "Native",
    "submissions.type_aggregator": "Aggregator",
    
    // Actions
    "submissions.action_view": "View Details",
    "submissions.action_review": "Review",
    "submissions.action_cancel": "Cancel",
    "submissions.action_delete": "Delete",
    
    // Submit dialog
    "submissions.submit_dialog_title": "Submit Shared Provider",
    "submissions.submit_dialog_description": "Submit a new provider for admin review. Once approved, it will be available to all users.",
    "submissions.form_name": "Provider Name",
    "submissions.form_name_placeholder": "e.g., My OpenAI Proxy",
    "submissions.form_provider_id": "Provider ID",
    "submissions.form_provider_id_placeholder": "e.g., my-openai-proxy",
    "submissions.form_provider_id_help": "Unique identifier for this provider",
    "submissions.form_base_url": "Base URL",
    "submissions.form_base_url_placeholder": "https://api.example.com",
    "submissions.form_api_key": "API Key",
    "submissions.form_api_key_placeholder": "Enter API key",
    "submissions.form_provider_type": "Provider Type",
    "submissions.form_description": "Description",
    "submissions.form_description_placeholder": "Describe this provider and its features...",
    "submissions.btn_cancel": "Cancel",
    "submissions.btn_submit": "Submit",
    "submissions.btn_submitting": "Submitting...",
    
    // Review dialog
    "submissions.review_dialog_title": "Review Submission",
    "submissions.review_dialog_description": "Review this provider submission and decide whether to approve or reject it.",
    "submissions.review_submitter": "Submitter",
    "submissions.review_submitted_at": "Submitted At",
    "submissions.review_provider_info": "Provider Information",
    "submissions.review_description": "Description",
    "submissions.review_notes": "Review Notes",
    "submissions.review_notes_placeholder": "Add notes about your decision...",
    "submissions.btn_approve": "Approve",
    "submissions.btn_reject": "Reject",
    "submissions.btn_reviewing": "Processing...",
    
    // Cancel dialog
    "submissions.cancel_dialog_title": "Cancel Submission",
    "submissions.cancel_dialog_description": "Are you sure you want to cancel this submission? This action cannot be undone.",
    "submissions.btn_confirm_cancel": "Yes, Cancel",
    
    // Messages
    "submissions.empty_my": "No submissions yet",
    "submissions.empty_my_description": "Click 'Submit New Provider' to share a provider with the community",
    "submissions.empty_admin": "No submissions found",
    "submissions.empty_admin_description": "No provider submissions match the current filter",
    "submissions.loading": "Loading...",
    "submissions.error_loading": "Failed to load submissions",
    "submissions.retry": "Retry",
    
    // Toast messages
    "submissions.toast_submit_success": "Provider submitted successfully",
    "submissions.toast_submit_error": "Failed to submit provider",
    "submissions.toast_cancel_success": "Submission cancelled successfully",
    "submissions.toast_cancel_error": "Failed to cancel submission",
    "submissions.toast_review_success": "Submission reviewed successfully",
    "submissions.toast_review_error": "Failed to review submission",
    "submissions.toast_no_permission": "You don't have permission to submit shared providers",
  },
  zh: {
    // My Submissions page
    "submissions.my_title": "我的投稿",
    "submissions.my_subtitle": "查看和管理您提交的共享提供商",
    "submissions.submit_new": "提交新提供商",
    "submissions.search_placeholder": "搜索投稿...",
    "submissions.filter_all": "全部状态",
    "submissions.filter_pending": "待审核",
    "submissions.filter_approved": "已通过",
    "submissions.filter_rejected": "已拒绝",
    
    // Admin Submissions page
    "submissions.admin_title": "提供商投稿管理",
    "submissions.admin_subtitle": "审核和管理用户提交的共享提供商",
    "submissions.stats_total": "总投稿数",
    "submissions.stats_pending": "待审核",
    "submissions.stats_approved": "已通过",
    "submissions.stats_rejected": "已拒绝",
    
    // Table columns
    "submissions.column_name": "提供商名称",
    "submissions.column_provider_id": "提供商ID",
    "submissions.column_base_url": "基础URL",
    "submissions.column_type": "类型",
    "submissions.column_status": "状态",
    "submissions.column_submitted_at": "提交时间",
    "submissions.column_reviewed_at": "审核时间",
    "submissions.column_reviewer": "审核人",
    "submissions.column_actions": "操作",
    
    // Status badges
    "submissions.status_pending": "待审核",
    "submissions.status_approved": "已通过",
    "submissions.status_rejected": "已拒绝",
    
    // Provider types
    "submissions.type_native": "直连",
    "submissions.type_aggregator": "聚合",
    
    // Actions
    "submissions.action_view": "查看详情",
    "submissions.action_review": "审核",
    "submissions.action_cancel": "取消",
    "submissions.action_delete": "删除",
    
    // Submit dialog
    "submissions.submit_dialog_title": "提交共享提供商",
    "submissions.submit_dialog_description": "提交一个新的提供商供管理员审核。通过后将对所有用户开放。",
    "submissions.form_name": "提供商名称",
    "submissions.form_name_placeholder": "例如：我的 OpenAI 代理",
    "submissions.form_provider_id": "提供商ID",
    "submissions.form_provider_id_placeholder": "例如：my-openai-proxy",
    "submissions.form_provider_id_help": "此提供商的唯一标识符",
    "submissions.form_base_url": "基础URL",
    "submissions.form_base_url_placeholder": "https://api.example.com",
    "submissions.form_api_key": "API密钥",
    "submissions.form_api_key_placeholder": "输入API密钥",
    "submissions.form_provider_type": "提供商类型",
    "submissions.form_description": "描述",
    "submissions.form_description_placeholder": "描述此提供商及其特性...",
    "submissions.btn_cancel": "取消",
    "submissions.btn_submit": "提交",
    "submissions.btn_submitting": "提交中...",
    
    // Review dialog
    "submissions.review_dialog_title": "审核投稿",
    "submissions.review_dialog_description": "审核此提供商投稿并决定是否通过或拒绝。",
    "submissions.review_submitter": "提交人",
    "submissions.review_submitted_at": "提交时间",
    "submissions.review_provider_info": "提供商信息",
    "submissions.review_description": "描述",
    "submissions.review_notes": "审核意见",
    "submissions.review_notes_placeholder": "添加关于您决定的说明...",
    "submissions.btn_approve": "通过",
    "submissions.btn_reject": "拒绝",
    "submissions.btn_reviewing": "处理中...",
    
    // Cancel dialog
    "submissions.cancel_dialog_title": "取消投稿",
    "submissions.cancel_dialog_description": "确定要取消此投稿吗？此操作不可撤销。",
    "submissions.btn_confirm_cancel": "确认取消",
    
    // Messages
    "submissions.empty_my": "还没有投稿",
    "submissions.empty_my_description": "点击\"提交新提供商\"按钮与社区分享提供商",
    "submissions.empty_admin": "未找到投稿",
    "submissions.empty_admin_description": "没有符合当前筛选条件的提供商投稿",
    "submissions.loading": "加载中...",
    "submissions.error_loading": "加载投稿失败",
    "submissions.retry": "重试",
    
    // Toast messages
    "submissions.toast_submit_success": "提供商提交成功",
    "submissions.toast_submit_error": "提交提供商失败",
    "submissions.toast_cancel_success": "投稿取消成功",
    "submissions.toast_cancel_error": "取消投稿失败",
    "submissions.toast_review_success": "审核完成",
    "submissions.toast_review_error": "审核失败",
    "submissions.toast_no_permission": "您没有提交共享提供商的权限",
  },
};
