import { httpClient } from './client';

// 提交状态类型
export type SubmissionStatus = 'pending' | 'testing' | 'approved' | 'approved_limited' | 'rejected';

// 提供商类型
export type ProviderType = 'native' | 'aggregator';

// 提交记录接口
export interface ProviderSubmission {
  id: string;
  user_id: string;
  name: string;
  provider_id: string;
  base_url: string;
  provider_type: ProviderType;
  description: string | null;
  approval_status: SubmissionStatus;
  reviewed_by: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// 创建提交请求
export interface CreateSubmissionRequest {
  name: string;
  provider_id: string;
  base_url: string;
  provider_type?: ProviderType;
  api_key: string;
  description?: string;
  extra_config?: Record<string, any>;
}

// 审核请求
export interface ReviewSubmissionRequest {
  approved?: boolean;
  decision?: 'approved' | 'approved_limited' | 'rejected';
  limit_qps?: number;
  review_notes?: string;
}

// 提供商提交服务
export const providerSubmissionService = {
  /**
   * 用户提交共享提供商
   */
  createSubmission: async (data: CreateSubmissionRequest): Promise<ProviderSubmission> => {
    const response = await httpClient.post('/providers/submissions', data);
    return response.data;
  },

  /**
   * 从用户私有提供商一键提交到共享池
   *
   * 后端会自动读取该私有 Provider 的配置和上游密钥并进行验证，
   * 前端无需再提交表单字段。
   */
  submitFromPrivateProvider: async (
    userId: string,
    providerId: string,
  ): Promise<ProviderSubmission> => {
    const response = await httpClient.post(
      `/users/${userId}/private-providers/${providerId}/submit-shared`,
    );
    return response.data;
  },

  /**
   * 获取当前用户的提交列表
   */
  getMySubmissions: async (): Promise<ProviderSubmission[]> => {
    const response = await httpClient.get('/providers/submissions/me');
    return response.data;
  },

  /**
   * 取消待审核的提交
   */
  cancelSubmission: async (submissionId: string): Promise<void> => {
    await httpClient.delete(`/providers/submissions/${submissionId}`);
  },

  /**
   * 管理员获取所有提交列表
   */
  getAllSubmissions: async (status?: SubmissionStatus): Promise<ProviderSubmission[]> => {
    const params = status ? { status } : {};
    const response = await httpClient.get('/providers/submissions', { params });
    return response.data;
  },

  /**
   * 管理员审核提交
   */
  reviewSubmission: async (
    submissionId: string,
    data: ReviewSubmissionRequest
  ): Promise<ProviderSubmission> => {
    const payload = {
      ...data,
      // 兼容仅传 approved 的旧调用
      decision: data.decision ?? (typeof data.approved === "boolean" ? (data.approved ? "approved" : "rejected") : undefined),
    };
    const response = await httpClient.put(
      `/providers/submissions/${submissionId}/review`,
      payload
    );
    return response.data;
  },
};
