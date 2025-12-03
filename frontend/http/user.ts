import { httpClient } from './client';
import { UserInfo } from './auth';

// 用户管理相关接口
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  display_name?: string;
  avatar?: string;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  display_name?: string;
  avatar?: string;
}

export interface UpdateUserStatusRequest {
  is_active: boolean;
}

// 用户API服务
export const userService = {
  // 创建用户
  createUser: async (data: CreateUserRequest): Promise<UserInfo> => {
    const response = await httpClient.post('/users', data);
    return response.data;
  },

  // 获取当前用户信息
  getCurrentUser: async (): Promise<UserInfo> => {
    const response = await httpClient.get('/users/me');
    return response.data;
  },

  // 更新用户信息
  updateUser: async (userId: string, data: UpdateUserRequest): Promise<UserInfo> => {
    const response = await httpClient.put(`/users/${userId}`, data);
    return response.data;
  },

  // 更新用户状态
  updateUserStatus: async (
    userId: string,
    data: UpdateUserStatusRequest
  ): Promise<UserInfo> => {
    const response = await httpClient.put(`/users/${userId}/status`, data);
    return response.data;
  },
};