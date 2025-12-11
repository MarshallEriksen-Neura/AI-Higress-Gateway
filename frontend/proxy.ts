import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 从 cookie 获取 refresh_token 来判断是否已登录
  // (access_token 存储在 localStorage 中，middleware 无法访问)
  const refreshToken = request.cookies.get('refresh_token')?.value;
  
  // 不再在 middleware 中强制重定向到 /login
  // 而是让页面正常加载，由客户端的响应拦截器处理认证
  // 当 API 请求返回 401 时，会自动打开登录对话框
  
  // 如果已登录用户访问登录页，重定向到 dashboard
  if (pathname === '/login' && refreshToken) {
    return NextResponse.redirect(new URL('/dashboard/overview', request.url));
  }
  
  // 所有路由都允许访问，认证由客户端处理
  return NextResponse.next();
}

// 配置 middleware 匹配的路径
export const config = {
  matcher: [
    /*
     * 匹配所有路径除了：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
