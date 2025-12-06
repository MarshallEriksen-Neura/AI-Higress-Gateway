export interface PermissionTypeMetadata {
  type: string;
  nameKey: string;
  descriptionKey: string;
  requiresValue: boolean;
  valueLabel?: string;
  valuePlaceholder?: string;
  category: 'feature' | 'quota';
}

export const PERMISSION_TYPES: PermissionTypeMetadata[] = [
  {
    type: 'create_private_provider',
    nameKey: 'permissions.type_create_private_provider',
    descriptionKey: 'permissions.type_create_private_provider_desc',
    requiresValue: false,
    category: 'feature',
  },
  {
    type: 'submit_shared_provider',
    nameKey: 'permissions.type_submit_shared_provider',
    descriptionKey: 'permissions.type_submit_shared_provider_desc',
    requiresValue: false,
    category: 'feature',
  },
  {
    type: 'unlimited_providers',
    nameKey: 'permissions.type_unlimited_providers',
    descriptionKey: 'permissions.type_unlimited_providers_desc',
    requiresValue: false,
    category: 'quota',
  },
  {
    type: 'private_provider_limit',
    nameKey: 'permissions.type_private_provider_limit',
    descriptionKey: 'permissions.type_private_provider_limit_desc',
    requiresValue: true,
    valueLabel: 'permissions.label_limit_value',
    valuePlaceholder: 'permissions.placeholder_limit_value',
    category: 'quota',
  },
];

/**
 * 根据权限类型获取元数据
 */
export function getPermissionTypeMetadata(type: string): PermissionTypeMetadata | undefined {
  return PERMISSION_TYPES.find(p => p.type === type);
}

/**
 * 判断权限是否已过期
 */
export function isPermissionExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}