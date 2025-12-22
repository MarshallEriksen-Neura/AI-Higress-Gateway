import axios, { type AxiosRequestConfig } from 'axios';
import { cookies } from 'next/headers';

/**
 * 服务端数据获取工具
 * 用于在 Next.js 服务端组件中预取数据，避免客户端初始加载闪烁
 * 
 * Token 存储方案：
 * - access_token 存储在 Cookie 中（非 HttpOnly）
 * - 服务端可以通过 cookies() 读取
 * - 客户端可以通过 js-cookie 读取
 */
export async function serverFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    // Next.js 16（React 19）中 cookies() 返回 Promise，需要 await 获取 CookieStore
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    
    // 与前端 httpClient 保持一致：优先使用 NEXT_PUBLIC_API_BASE_URL
    // 兼容旧变量名 NEXT_PUBLIC_API_URL
    const apiUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:8000';

    const normalizedHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options?.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        normalizedHeaders[key] = value;
      });
    } else if (options?.headers && typeof options.headers === 'object') {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'undefined') return;
        normalizedHeaders[key] = Array.isArray(value) ? value.join(', ') : String(value);
      });
    }
    if (token) {
      normalizedHeaders['Authorization'] = `Bearer ${token}`;
    }
    // 与 fetch 的 no-store 行为保持一致，避免使用缓存
    normalizedHeaders['Cache-Control'] = 'no-store';

    const axiosConfig: AxiosRequestConfig = {
      baseURL: apiUrl,
      url: endpoint,
      method: (options?.method as AxiosRequestConfig['method']) ?? 'GET',
      headers: normalizedHeaders,
      data: options?.body,
      signal: options?.signal,
      // 交由 axios 返回响应对象，由下方统一处理状态码
      validateStatus: () => true,
    };

    const res = await axios.request<T>(axiosConfig);

    if (res.status === 401) {
      console.log(`[serverFetch] 401 Unauthorized: ${endpoint} (token may be expired)`);
      return null;
    }
    if (res.status < 200 || res.status >= 300) {
      console.error(`[serverFetch] Failed: ${endpoint}`, res.status);
      return null;
    }

    return res.data;
  } catch (error) {
    console.error(`[serverFetch] Error: ${endpoint}`, error);
    return null;
  }
}
