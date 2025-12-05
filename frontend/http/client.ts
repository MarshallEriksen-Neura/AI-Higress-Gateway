import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenManager } from '@/lib/auth/token-manager';

// 错误提示函数
const showError = (msg: string) => {
  if (typeof window !== 'undefined') {
    import('sonner').then(({ toast }) => {
      toast.error(msg);
    }).catch(() => {
      console.error(msg);
    });
  }
};

// 认证状态变更回调
let authErrorCallback: (() => void) | null = null;

// 设置认证错误回调
export const setAuthErrorCallback = (callback: () => void) => {
  authErrorCallback = callback;
};

// 清除认证错误回调
export const clearAuthErrorCallback = () => {
  authErrorCallback = null;
};

// 环境变量
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// 刷新 token 的状态管理
let isRefreshing = false;
let refreshTokenPromise: Promise<string> | null = null;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

// 处理队列中的请求
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// 刷新 token 的函数
const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = tokenManager.getRefreshToken();
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await axios.post(`${BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });

    const { access_token, refresh_token: new_refresh_token } = response.data;
    
    // 更新 tokens
    tokenManager.setAccessToken(access_token);
    tokenManager.setRefreshToken(new_refresh_token);
    
    return access_token;
  } catch (error) {
    // 刷新失败，清除所有 token
    tokenManager.clearAll();
    throw error;
  }
};

// 创建axios实例
const createHttpClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 请求拦截器
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // 从 tokenManager 获取 token
      const token = tokenManager.getAccessToken();
      const apiKey = typeof window !== 'undefined' 
        ? localStorage.getItem('api_key') 
        : null;

      // 添加认证信息
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (apiKey) {
        config.headers['X-API-Key'] = apiKey;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // 统一错误处理
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data as { detail?: string };

        // 401 错误处理
        if (status === 401) {
          // 检查是否是刷新token的请求
          const isRefreshRequest = originalRequest.url?.includes('/auth/refresh');
          
          // 如果是刷新token请求失败，触发认证错误回调
          if (isRefreshRequest) {
            tokenManager.clearAll();
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              authErrorCallback?.();
            }
            showError('登录已过期，请重新登录');
            return Promise.reject(error);
          }
          
          // 如果不是刷新token请求，且不是已重试的请求，尝试刷新token
          if (!originalRequest._retry) {
            // 如果正在刷新，等待刷新完成后使用新 token 重试
            if (isRefreshing && refreshTokenPromise) {
              return refreshTokenPromise.then(token => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return instance(originalRequest);
              }).catch(err => {
                return Promise.reject(err);
              });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            // 创建共享的刷新 Promise
            refreshTokenPromise = refreshAccessToken()
              .then(newToken => {
                processQueue(null, newToken);
                return newToken;
              })
              .catch(refreshError => {
                processQueue(refreshError, null);
                
                // 刷新失败，清除所有token并触发认证错误回调
                tokenManager.clearAll();
                if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                  authErrorCallback?.();
                }
                showError('会话已过期，请重新登录');
                throw refreshError;
              })
              .finally(() => {
                isRefreshing = false;
                refreshTokenPromise = null;
              });

            // 等待刷新完成后重试原请求
            return refreshTokenPromise.then(newToken => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              return instance(originalRequest);
            });
          }
        }

        // 其他错误处理
        switch (status) {
          case 403:
            showError('无权限访问该资源');
            break;
          case 404:
            showError('请求的资源不存在');
            break;
          case 429:
            showError('请求过于频繁，请稍后再试');
            break;
          case 500:
            showError('服务器内部错误');
            break;
          case 503:
            showError('服务暂时不可用');
            break;
          default:
            if (status !== 401) {
              showError(errorData?.detail || '请求失败');
            }
        }
      } else if (error.request) {
        showError('网络连接失败，请检查网络设置');
      } else {
        showError('请求配置错误');
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// 创建并导出axios实例
export const httpClient = createHttpClient();

// 导出类型
export type { AxiosRequestConfig, AxiosResponse, AxiosError };

// 导出默认实例
export default httpClient;
