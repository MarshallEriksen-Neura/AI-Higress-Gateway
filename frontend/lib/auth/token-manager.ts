import Cookies from 'js-cookie';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'has_refresh_token';
const PERSISTENCE_KEY = 'auth_persistence';

type RememberOption = { remember?: boolean };

const getStoredPersistence = (): boolean | null => {
  const persisted = Cookies.get(PERSISTENCE_KEY);
  if (persisted === 'remember') return true;
  if (persisted === 'session') return false;
  return null;
};

const setPersistence = (remember: boolean) => {
  Cookies.set(PERSISTENCE_KEY, remember ? 'remember' : 'session', {
    expires: remember ? 7 : undefined,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
};

const clearPersistence = () => {
  Cookies.remove(PERSISTENCE_KEY);
};

const resolveRemember = (remember?: boolean): boolean => {
  if (remember !== undefined) return remember;

  const stored = getStoredPersistence();
  if (stored !== null) return stored;

  if (typeof window !== 'undefined') {
    if (localStorage.getItem(ACCESS_TOKEN_KEY)) return true;
    if (sessionStorage.getItem(ACCESS_TOKEN_KEY)) return false;
  }

  return true;
};

// 根据记住与否选择存储介质；若未指定则复用已有介质
const resolveAccessTokenStorage = (remember?: boolean): Storage | null => {
  if (typeof window === 'undefined') return null;

  const rememberChoice = resolveRemember(remember);
  if (rememberChoice === true) return localStorage;
  if (rememberChoice === false) return sessionStorage;

  return localStorage;
};

export const tokenManager = {
  // Access Token - 记住时存 localStorage，不记住时存 sessionStorage
  setAccessToken: (token: string, options?: RememberOption) => {
    const storage = resolveAccessTokenStorage(options?.remember);
    if (!storage) return;

    storage.setItem(ACCESS_TOKEN_KEY, token);

    // 保持单一存储位置，避免残留旧值
    const otherStorage = storage === localStorage ? sessionStorage : localStorage;
    otherStorage.removeItem(ACCESS_TOKEN_KEY);
    if (options?.remember !== undefined) {
      setPersistence(options.remember);
    }
  },

  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY);
  },

  clearAccessToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  },

  // Refresh Token - 仅存储标记，实际 Token 存 HttpOnly Cookie
  setRefreshToken: (token: string | null | undefined, options?: RememberOption) => {
    const storage = resolveAccessTokenStorage(options?.remember);
    if (!storage) return;

    // 存储标记，表示我们拥有 refresh token (在 HttpOnly cookie 中)
    storage.setItem(REFRESH_TOKEN_KEY, 'true');

    // 保持单一存储位置
    const otherStorage = storage === localStorage ? sessionStorage : localStorage;
    otherStorage.removeItem(REFRESH_TOKEN_KEY);

    const remember = resolveRemember(options?.remember);
    setPersistence(remember);
  },

  getRefreshToken: (): string | undefined => {
    if (typeof window === 'undefined') return undefined;
    const val = localStorage.getItem(REFRESH_TOKEN_KEY) ?? sessionStorage.getItem(REFRESH_TOKEN_KEY);
    return val ? 'true' : undefined;
  },

  clearRefreshToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    clearPersistence();
  },

  // 清除所有 token
  clearAll: () => {
    tokenManager.clearAccessToken();
    tokenManager.clearRefreshToken();
  },
};
