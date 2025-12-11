/**
 * 组件 Props 类型定义文件
 * 此文件包含所有组件的 Props 接口定义，确保类型安全
 */

import type { ReactNode } from 'react';
import type {
  ApiKey,
  CreditAccount,
  CreditTransaction,
  Notification,
  UserInfo,
} from './api-types';
import type { Role, Permission } from '@/http/admin';
import type { Provider, ProviderTestResult, ProviderAuditLog, Model } from '@/http/provider';
import type { ProviderPreset } from '@/http/provider-preset';
import type { ProviderSubmission } from '@/http/provider-submission';

// ============= 通用组件 Props =============

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface FormDialogProps extends DialogProps {
  onSuccess?: () => void;
}

export interface TableProps<T> {
  data: T[];
  loading: boolean;
}

export interface CardProps {
  title?: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}

// ============= API Keys 相关组件 Props =============

export interface ApiKeysTableProps {
  apiKeys: ApiKey[];
  loading: boolean;
  onEdit: (apiKey: ApiKey) => void;
  onDelete: (keyId: string) => Promise<void>;
  onCreate: () => void;
}

export interface ApiKeyDialogProps extends DialogProps {
  apiKey?: ApiKey | null;
  onSuccess?: () => void;
}

export interface TokenDisplayDialogProps extends DialogProps {
  token: string;
}

export interface ProviderSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  providers: Provider[];
  loading?: boolean;
}

// ============= Credits 相关组件 Props =============

export interface CreditBalanceCardProps {
  balance: CreditAccount | undefined;
  loading: boolean;
  onRefresh?: () => void;
}

export interface CreditTransactionsTableProps {
  transactions: CreditTransaction[];
  loading: boolean;
  onPageChange?: (page: number) => void;
  currentPage?: number;
  totalPages?: number;
}

export interface AdminTopupDialogProps extends FormDialogProps {
  userId?: string;
}

export interface AutoTopupDialogProps extends FormDialogProps {
  userId?: string;
}

export interface AutoTopupBatchDialogProps extends FormDialogProps {
  userIds?: string[];
}

export type DateRangePreset = 'today' | 'week' | 'month' | '7days' | '30days' | 'all';

export interface DateRangeFilterProps {
  value: DateRangePreset;
  onChange: (value: DateRangePreset) => void;
}

// ============= Providers 相关组件 Props =============

export interface ProviderTableProps {
  providers: Provider[];
  loading?: boolean;
  onToggleStatus?: (providerId: string) => void;
  onEdit?: (providerId: string) => void;
  onDelete?: (providerId: string) => void;
  onViewModels?: (providerId: string) => void;
}

export interface ProviderDetailMainProps {
  providerId: string;
  currentUserId?: string | null;
  translations?: any;
}

export interface ModelCardProps {
  model: Model;
  canEdit: boolean;
  onEditPricing?: (model: Model) => void;
  onEditAlias?: (model: Model) => void;
}

export interface ModelPricingDialogProps extends DialogProps {
  model: Model | null;
  providerId: string;
  onSuccess?: () => void;
}

export interface ModelAliasDialogProps extends DialogProps {
  model: Model | null;
  providerId: string;
  onSuccess?: () => void;
}

export interface JsonEditorProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export interface ArrayEditorProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  disabled?: boolean;
}

export interface NumberArrayEditorProps {
  label: string;
  value: number[];
  onChange: (value: number[]) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export interface PresetSelectorProps {
  selectedPresetId: string | null;
  onPresetSelect: (preset: ProviderPreset | null) => void;
  presets?: ProviderPreset[];
  loading?: boolean;
}

export interface ProviderSharingConfigProps {
  providerId: string;
  currentUserId: string;
  visibility: 'public' | 'private' | 'restricted';
  sharedUserIds: string[];
  onUpdate?: () => void;
}

// ============= Provider Audit 相关组件 Props =============

export interface AuditHistoryCardProps {
  recentTests: ProviderTestResult[];
  auditLogs: ProviderAuditLog[];
  loading?: boolean;
}

export interface ProbeConfigDrawerProps extends DialogProps {
  providerId: string;
  currentConfig: {
    probe_enabled: boolean;
    probe_interval_seconds: number | null;
    probe_model: string | null;
  };
  availableModels: Model[];
  onSuccess?: () => void;
}

export interface AuditOperationsProps {
  providerId: string;
  auditStatus: string;
  operationStatus: string;
  auditRemark: string;
  onStatusChange?: () => void;
}

export interface AuditTabContentProps {
  providerId: string;
  auditStatus: string;
  operationStatus: string;
  auditRemark: string;
  recentTests: ProviderTestResult[];
  auditLogs: ProviderAuditLog[];
  availableModels: Model[];
  currentConfig: {
    probe_enabled: boolean;
    probe_interval_seconds: number | null;
    probe_model: string | null;
  };
  onRefresh?: () => void;
}

// ============= Provider Submissions 相关组件 Props =============

export interface SubmissionsTableProps {
  submissions: ProviderSubmission[];
  loading?: boolean;
  onCancel?: (submissionId: string) => void;
}

export interface AdminSubmissionsTableProps {
  submissions: ProviderSubmission[];
  loading?: boolean;
  onReview: (submission: ProviderSubmission) => void;
}

export interface ReviewDialogProps extends DialogProps {
  submission: ProviderSubmission | null;
  onSuccess?: () => void;
}

export interface SubmissionFormDialogProps extends FormDialogProps {
  providerId?: string;
}

// ============= Provider Presets 相关组件 Props =============

export interface ProviderPresetTableProps {
  presets: ProviderPreset[];
  isLoading: boolean;
  onEdit?: (preset: ProviderPreset) => void;
  onDelete?: (presetId: string) => void;
}

export interface ProviderPresetFormProps extends FormDialogProps {
  preset?: ProviderPreset | null;
}

export interface ImportDialogProps extends DialogProps {
  onSuccess?: () => void;
}

export interface ExportDialogProps extends DialogProps {
  presets: ProviderPreset[];
}

// ============= Notifications 相关组件 Props =============

export interface NotificationPopoverProps {
  className?: string;
}

export interface NotificationItemProps {
  notification: Notification;
  compact?: boolean;
  onRead?: (notificationId: string) => void;
}

export interface AdminNotificationFormProps extends FormDialogProps {
  notification?: Notification | null;
}

// ============= System/Admin 相关组件 Props =============

export interface GatewayConfigCardProps {
  onUpdate?: () => void;
}

export interface ProviderLimitsCardProps {
  onUpdate?: () => void;
}

export interface CacheMaintenanceCardProps {
  onClear?: () => void;
}

// ============= Roles 相关组件 Props =============

export interface RolesListProps {
  roles: Role[];
  loading: boolean;
  onEdit: (role: Role) => void;
  onDelete: (roleId: string) => Promise<void>;
  onManagePermissions: (role: Role) => void;
  onCreate: () => void;
}

export interface CreateRoleDialogProps extends FormDialogProps {}

export interface EditRoleDialogProps extends FormDialogProps {
  role: Role | null;
}

export interface PermissionsDialogProps extends DialogProps {
  role: Role | null;
  permissions: Permission[];
  onSuccess?: () => void;
}

// ============= Users 相关组件 Props =============

export interface UsersTableProps {
  users: UserInfo[];
  loading: boolean;
  onEdit?: (user: UserInfo) => void;
  onDelete?: (userId: string) => void;
  onManageRoles?: (user: UserInfo) => void;
  onManagePermissions?: (user: UserInfo) => void;
}

export interface CreateUserDialogProps extends FormDialogProps {}

export interface UserStatusDialogProps extends DialogProps {
  user: UserInfo | null;
  onSuccess?: () => void;
}

export interface UserRolesDialogProps extends DialogProps {
  user: UserInfo | null;
  roles: Role[];
  onSuccess?: () => void;
}

export interface UserPermissionsDialogProps extends DialogProps {
  user: UserInfo | null;
  onSuccess?: () => void;
}

// ============= Profile 相关组件 Props =============

export interface ProfileHeaderProps {
  user: UserInfo;
}

export interface ProfileInfoCardProps {
  user: UserInfo;
  onUpdate?: () => void;
}

export interface AvatarUploadProps {
  currentAvatar: string | null;
  onUploadSuccess?: (newAvatarUrl: string) => void;
}

export interface PasswordChangeCardProps {
  userId: string;
  onSuccess?: () => void;
}

export interface SessionsCardProps {
  userId: string;
}

export interface PreferencesCardProps {
  user: UserInfo;
  onUpdate?: () => void;
}

export interface DangerZoneCardProps {
  userId: string;
}

// ============= Metrics 相关组件 Props =============

export interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
  icon?: React.ComponentType<{ className?: string }>;
}

export interface ActivityChartProps {
  data: Array<{
    timestamp: string;
    value: number;
  }>;
  loading?: boolean;
}

export interface ProvidersMetricsTableProps {
  items: Array<{
    provider_id: string;
    total_requests: number;
    success_requests: number;
    error_requests: number;
    success_rate: number;
    latency_p95_ms: number | null;
  }>;
  loading?: boolean;
}

// ============= Routing 相关组件 Props =============

export interface RoutingTableProps {
  routingRules: Array<{
    id: number;
    logical_model: string;
    strategy: string;
    preferred_region?: string;
  }>;
  loading?: boolean;
  onEdit: (id: number) => void;
  onDelete?: (id: number) => void;
}

export interface RoutingFormProps extends FormDialogProps {
  rule?: any;
}

// ============= Logical Models 相关组件 Props =============

export interface LogicalModelsTableProps {
  models: Array<{
    logical_id: string;
    display_name: string;
    description: string;
    capabilities: string[];
    enabled: boolean;
  }>;
  loading?: boolean;
  onSelect: (model: any) => void;
}

export interface LogicalModelsFormProps extends FormDialogProps {
  model?: any;
}

// ============= Error 相关组件 Props =============

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export interface ErrorContentProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// ============= 回调函数类型定义 =============

export type OnSuccessCallback = () => void;
export type OnErrorCallback = (error: Error) => void;
export type OnChangeCallback<T> = (value: T) => void;
export type OnSubmitCallback<T> = (data: T) => void | Promise<void>;
export type OnDeleteCallback = (id: string) => void | Promise<void>;
export type OnEditCallback<T> = (item: T) => void;
export type OnRefreshCallback = () => void | Promise<void>;
export type OnPageChangeCallback = (page: number) => void;
export type OnFilterChangeCallback<T> = (filters: T) => void;
export type OnSortChangeCallback = (field: string, direction: 'asc' | 'desc') => void;
