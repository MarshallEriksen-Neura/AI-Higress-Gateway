import { cookies } from 'next/headers';

/**
 * 服务端数据获取工具
 * 用于在 Next.js 服务端组件中预取数据，避免客户端初始加载闪烁
 */
export async function serverFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const url = `${apiUrl}${endpoint}`;
    
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options?.headers,
      },
      cache: 'no-store', // 默认不缓存，确保数据新鲜
    });
    
    if (!res.ok) {
      console.error(`[serverFetch] Failed: ${endpoint}`, res.status);
      return null;
    }
    
    return res.json();
  } catch (error) {
    console.error(`[serverFetch] Error: ${endpoint}`, error);
    return null;
  }
}
