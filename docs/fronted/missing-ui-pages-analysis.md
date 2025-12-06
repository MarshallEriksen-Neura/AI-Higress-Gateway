# 缺失的前端 UI 页面分析

## 概述

本文档分析当前 AI Higress 项目中,除了性能(Metrics)页面以外,还需要实现的前端 UI 页面。基于后端 API 文档和现有前端结构的对比分析。

## 当前已实现的页面

### Dashboard 区域
1. ✅ **Overview** (`/dashboard/overview`) - 概览页面
2. ✅ **Providers** (`/dashboard/providers`) - 提供商管理
3. ✅ **Logical Models** (`/dashboard/logical-models`) - 逻辑模型管理
4. ✅ **API Keys** (`/dashboard/api-keys`) - API密钥管理
5. ✅ **Metrics** (`/dashboard/metrics`) - 性能指标页面
6. ✅ **Routing** (`/dashboard/routing`) - 路由管理页面
7. ✅ **Provider Presets** (`/dashboard/provider-presets`) - 提供商预设管理

### System 区域
1. ✅ **Admin** (`/system/admin`) - 系统管理
2. ✅ **Users** (`/system/users`) - 用户管理
3. ✅ **Roles** (`/system/roles`) - 角色管理

### 其他
1. ✅ **Profile** (`/profile`) - 个人资料页面
2. ✅ **Login/Register** (`/(auth)/login`, `/(auth)/register`) - 认证页面

---

## 🚨 缺失的重要页面

### 1. 积分与额度管理页面 ⭐⭐⭐

**优先级**: 高

**页面路径建议**: `/dashboard/credits`

**功能需求**:
- 显示当前用户的积分余额
- 显示积分流水记录(分页)
- 支持按时间范围筛选流水
- 显示每次调用的详细信息(模型、tokens、扣费)
- 管理员功能:为用户充值积分

**相关后端API**:
- `GET /v1/credits/me` - 查询当前用户积分
- `GET /v1/credits/me/transactions` - 查询积分流水
- `POST /v1/credits/admin/users/{user_id}/topup` - 管理员充值(需超级用户权限)

**UI组件需求**:
- 积分余额卡片(显示余额、状态、每日限额)
- 流水记录表格(时间、金额、原因、模型、tokens)
- 充值对话框(仅管理员可见)
- 筛选器(时间范围、交易类型)

---

### 2. 厂商密钥管理页面 ⭐⭐⭐

**优先级**: 高

**页面路径建议**: `/dashboard/providers/{providerId}/keys`

**功能需求**:
- 查看指定提供商的所有API密钥
- 创建新的厂商API密钥
- 编辑密钥配置(标签、权重、QPS限制、状态)
- 删除密钥
- 显示密钥状态(active/inactive)

**相关后端API**:
- `GET /providers/{provider_id}/keys` - 获取密钥列表
- `POST /providers/{provider_id}/keys` - 创建密钥
- `GET /providers/{provider_id}/keys/{key_id}` - 获取密钥详情
- `PUT /providers/{provider_id}/keys/{key_id}` - 更新密钥
- `DELETE /providers/{provider_id}/keys/{key_id}` - 删除密钥

**UI组件需求**:
- 密钥列表表格(标签、权重、QPS、状态、操作)
- 创建/编辑密钥对话框
- 密钥状态切换开关
- 删除确认对话框

**集成方式**:
- 可以作为 Provider 详情页的子页面或标签页
- 或在 Provider 列表中添加"管理密钥"操作按钮

---

### 3. 用户私有提供商管理页面 ⭐⭐⭐

**优先级**: 高

**页面路径建议**: `/dashboard/my-providers`

**功能需求**:
- 查看当前用户的私有提供商列表
- 创建新的私有提供商
- 编辑私有提供商配置
- 删除私有提供商
- 显示提供商状态和健康检查
- 显示配额使用情况(已创建数量/限制数量)

**相关后端API**:
- `GET /users/{user_id}/private-providers` - 获取私有提供商列表
- `POST /users/{user_id}/private-providers` - 创建私有提供商
- `PUT /users/{user_id}/private-providers/{provider_id}` - 更新私有提供商
- `DELETE /users/{user_id}/private-providers/{provider_id}` - 删除私有提供商

**UI组件需求**:
- 私有提供商列表卡片/表格
- 创建提供商向导(支持预设选择)
- 编辑提供商表单
- 配额进度条
- 健康状态指示器

---

### 4. 共享提供商投稿管理页面 ⭐⭐

**优先级**: 中高

**页面路径建议**: 
- 用户端: `/dashboard/my-submissions`
- 管理员端: `/system/provider-submissions`

**功能需求**:

#### 用户端功能:
- 提交新的共享提供商
- 查看自己的提交记录
- 查看审核状态(pending/approved/rejected)
- 查看审核意见
- 取消待审核的提交

#### 管理员端功能:
- 查看所有用户提交
- 按状态筛选(pending/approved/rejected)
- 审核提交(通过/拒绝)
- 填写审核意见
- 查看提交者信息

**相关后端API**:
- `POST /providers/submissions` - 提交共享提供商
- `GET /providers/submissions` - 管理员查看提交列表
- `PUT /providers/submissions/{submission_id}/review` - 管理员审核
- `DELETE /providers/submissions/{submission_id}` - 取消提交

**UI组件需求**:
- 提交表单(名称、provider_id、base_url、描述等)
- 提交列表表格(状态、提交时间、审核时间、审核人)
- 审核对话框(通过/拒绝、审核意见)
- 状态徽章(pending/approved/rejected)

---

### 5. 会话管理页面 ⭐⭐

**优先级**: 中

**页面路径建议**: 建议直接使用当前已有的用户管理页面 然后补充相应功能
**功能需求**:
- 查看当前用户的所有活跃会话
- 显示设备信息(User-Agent、IP地址)
- 显示登录时间、最后活跃时间、过期时间
- 标识当前会话
- 撤销指定会话(远程登出)
- 撤销所有其他会话

**相关后端API**:
- `GET /v1/sessions` - 获取会话列表
- `DELETE /v1/sessions/{token_id}` - 撤销指定会话
- `DELETE /v1/sessions/others` - 撤销所有其他会话
- `POST /auth/logout-all` - 登出所有设备

**UI组件需求**:
- 会话列表卡片(设备信息、时间信息、当前标识)
- 撤销会话按钮
- 批量撤销按钮
- 确认对话框

---

### 6. 用户权限管理页面(管理员) ⭐⭐

**优先级**: 中

**页面路径建议**: `/system/users/{userId}/permissions`

**功能需求**:
- 查看指定用户的权限列表
- 授予新权限
- 更新权限配置(值、过期时间、备注)
- 撤销权限
- 显示权限类型说明

**相关后端API**:
- `GET /admin/users/{user_id}/permissions` - 获取用户权限
- `POST /admin/users/{user_id}/permissions` - 授予权限
- `DELETE /admin/users/{user_id}/permissions/{permission_id}` - 撤销权限

**UI组件需求**:
- 权限列表表格(类型、值、过期时间、备注)
- 授予权限对话框
- 权限类型选择器
- 过期时间选择器

**集成方式**:
- 可以作为用户详情页的子页面或标签页
- 或在用户列表中添加"管理权限"操作按钮

---

### 7. 角色权限配置页面(管理员) ⭐⭐

**优先级**: 中

**实现状态**: ✅ 已实现（`/system/roles/[roleId]/permissions`）

**页面路径**: `/system/roles/{roleId}/permissions`

**功能需求**:
- 查看角色已绑定的权限
- 批量设置角色权限(全量覆盖)
- 权限多选器
- 显示可用权限列表

**相关后端API**:
- `GET /admin/permissions` - 获取所有权限定义
- `GET /admin/roles/{role_id}/permissions` - 获取角色权限
- `PUT /admin/roles/{role_id}/permissions` - 设置角色权限

**UI组件需求**:
- 权限多选列表(带搜索)
- 已选权限标签
- 保存按钮
- 权限说明提示

**集成方式**:
- 可以作为角色详情页的子页面
- 或在角色列表中添加"配置权限"操作按钮

---

### 8. 用户角色分配页面(管理员) ⭐

**优先级**: 中低

**实现状态**: ✅ 已实现（`/system/users/[userId]/roles`）

**页面路径**: `/system/users/{userId}/roles`

**功能需求**:
- 查看用户当前角色
- 为用户分配角色(多选)
- 移除用户角色

**相关后端API**:
- `GET /admin/users/{user_id}/roles` - 获取用户角色
- `PUT /admin/users/{user_id}/roles` - 设置用户角色

**UI组件需求**:
- 角色多选器
- 已分配角色列表
- 保存按钮

**集成方式**:
- 可以集成到用户详情页或权限管理页面

---

### 9. 系统配置页面(管理员) ⭐

**优先级**: 中低

**页面路径建议**: `/system/config`

**功能需求**:
- 查看和更新系统Provider限制配置
- 生成系统主密钥
- 验证密钥强度
- 查看系统状态

**相关后端API**:
- `GET /system/provider-limits` - 获取Provider限制配置
- `PUT /system/provider-limits` - 更新Provider限制配置
- `POST /system/secret-key/generate` - 生成系统密钥
- `POST /system/key/validate` - 验证密钥强度
- `GET /system/status` - 获取系统状态

**UI组件需求**:
- 配置表单(默认限制、最大限制、审核开关)
- 密钥生成器
- 密钥强度验证器
- 系统状态卡片

---

### 10. 提供商可见性管理页面(管理员) ⭐

**优先级**: 低

**页面路径建议**: `/system/providers` 或集成到现有Provider管理页面

**功能需求**:
- 查看所有Provider(含私有)
- 按可见性筛选(public/private/restricted)
- 按所有者筛选
- 更新Provider可见性

**相关后端API**:
- `GET /admin/providers` - 获取所有Provider
- `PUT /admin/providers/{provider_id}/visibility` - 更新可见性

**UI组件需求**:
- Provider列表表格(含可见性和所有者列)
- 可见性筛选器
- 可见性编辑对话框

---

## 页面优先级总结

### 高优先级(⭐⭐⭐)
1. **积分与额度管理页面** - 核心计费功能
2. **厂商密钥管理页面** - Provider配置的重要部分
3. **用户私有提供商管理页面** - 用户核心功能

### 中高优先级(⭐⭐)
4. **共享提供商投稿管理页面** - 社区贡献功能
5. **会话管理页面** - 安全性功能
6. **用户权限管理页面** - 管理员核心功能
7. **角色权限配置页面** - RBAC核心功能

### 中低优先级(⭐)
8. **用户角色分配页面** - 可集成到其他页面
9. **系统配置页面** - 管理员辅助功能
10. **提供商可见性管理页面** - 可集成到现有页面

---

## 实现建议

### 第一阶段(核心功能)
1. 积分与额度管理页面
2. 厂商密钥管理(集成到Provider详情页)
3. 用户私有提供商管理页面

### 第二阶段(扩展功能)
4. 共享提供商投稿管理
5. 会话管理页面
6. 用户权限管理(集成到用户管理)

### 第三阶段(完善功能)
7. 角色权限配置
8. 用户角色分配
9. 系统配置页面
10. 提供商可见性管理

---

## 技术实现要点

### 1. 复用现有组件
- 使用 `@/components/ui` 中的 shadcn/ui 组件
- 复用 `@/components/dashboard/common.tsx` 中的通用组件
- 参考现有页面的布局和交互模式

### 2. 数据获取
- 使用 SWR 进行数据获取和缓存
- 参考 `frontend/lib/swr/` 中的现有 hooks
- 实现对应的 HTTP 客户端函数

### 3. 权限控制
- 基于用户角色显示/隐藏功能
- 使用 `useAuth` hook 获取当前用户信息
- 在路由层面实现权限检查

### 4. 国际化
- 使用 `useI18n` hook
- 在 `frontend/lib/i18n/` 中添加对应的翻译文件

### 5. 表单验证
- 使用 React Hook Form + Zod
- 参考现有表单组件的实现模式

---

## 相关文档

- [后端 API 文档](../backend/API_Documentation.md)
- [前端设计文档](../../frontend/docs/frontend-design.md)
- [路由架构文档](./routing-architecture.md)

---

**最后更新**: 2025-12-05
**文档版本**: 1.0
