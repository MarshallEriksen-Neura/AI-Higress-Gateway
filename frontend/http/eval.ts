import { httpClient } from './client';
import type {
  CreateEvalRequest,
  EvalResponse,
  SubmitRatingRequest,
  RatingResponse,
} from '@/lib/api-types';

/**
 * 评测服务 HTTP client
 * 提供评测创建、查询和评分提交功能
 */
export const evalService = {
  /**
   * 创建评测
   * 基于 baseline run 触发推荐评测
   */
  async createEval(data: CreateEvalRequest): Promise<EvalResponse> {
    const response = await httpClient.post<EvalResponse>('/v1/evals', data);
    return response.data;
  },

  /**
   * 获取评测状态
   * 查询评测的当前状态和所有 challenger runs 的状态
   */
  async getEval(evalId: string): Promise<EvalResponse> {
    const response = await httpClient.get<EvalResponse>(`/v1/evals/${evalId}`);
    return response.data;
  },

  /**
   * 提交评测评分
   * 选择最佳模型并提交原因标签
   */
  async submitRating(evalId: string, data: SubmitRatingRequest): Promise<RatingResponse> {
    const response = await httpClient.post<RatingResponse>(
      `/v1/evals/${evalId}/rating`,
      data
    );
    return response.data;
  },
};
