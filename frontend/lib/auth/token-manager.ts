import Cookies from 'js-cookie';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const tokenManager = {
  // Access Token - 仅存储在 localStorage（最佳实践）
  setAccessToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
  },

  getAccessToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return null;
  },

  clearAccessToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  },

  // Refresh Token - 仅存储在 Cookie
  setRefreshToken: (token: string) => {
    Cookies.set(REFRESH_TOKEN_KEY, token, {
      expires: 7, // 7天
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  },

  getRefreshToken: (): string | undefined => {
    return Cookies.get(REFRESH_TOKEN_KEY);
  },

  clearRefreshToken: () => {
    Cookies.remove(REFRESH_TOKEN_KEY);
  },

  // 清除所有 token
  clearAll: () => {
    tokenManager.clearAccessToken();
    tokenManager.clearRefreshToken();
  },
};