import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// 错误提示函数
const showError = (msg: string) => {
  if (typeof window !== 'undefined') {
    // 动态导入toast以避免SSR问题
    import('../components/toast').then(({ toast }) => {
      toast.error(msg);
    }).catch(() => {
      // 如果导入失败，至少在控制台输出错误
      console.error(msg);
    });
  }
};

// 环境变量
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

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
    (config: AxiosRequestConfig) => {
      // 从localStorage获取token
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem('access_token') 
        : null;
        
      // 从localStorage获取API密钥
      const apiKey = typeof window !== 'undefined' 
        ? localStorage.getItem('api_key') 
        : null;

      // 添加认证信息
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      } else if (apiKey) {
        config.headers = {
          ...config.headers,
          'X-API-Key': apiKey,
        };
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
    (error: AxiosError) => {
      // 统一错误处理
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data as { detail?: string };

        switch (status) {
          case 401:
            // 清除认证信息并跳转到登录页
            if (typeof window !== 'undefined') {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('api_key');
              window.location.href = '/login';
            }
            showError('认证失败，请重新登录');
            break;
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
            showError(errorData?.detail || '请求失败');
        }
      } else if (error.request) {
        // 请求已发出但没有收到响应
        showError('网络连接失败，请检查网络设置');
      } else {
        // 请求配置出错
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