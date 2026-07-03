const TOKEN_KEY = 'shophub.accessToken';
const USER_KEY = 'shophub.user';

export interface StoredUser {
  id: string;
  email: string | null;
  walletAddress: string | null;
}

export const authStorage = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TOKEN_KEY, token);

    // Write token to a cookie scoped to the root domain for SSO
    const parts = window.location.hostname.split('.');
    const domain = (parts.length > 1 && parts.join('.') !== '127.0.0.1') 
      ? `; domain=.${parts.slice(-2).join('.')}` 
      : '';
    document.cookie = `token=${token}; path=/${domain}; max-age=86400; samesite=lax`;
  },
  getUser(): StoredUser | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  },
  setUser(user: StoredUser): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);

    // Clear SSO cookie
    const parts = window.location.hostname.split('.');
    const domain = (parts.length > 1 && parts.join('.') !== '127.0.0.1') 
      ? `; domain=.${parts.slice(-2).join('.')}` 
      : '';
    document.cookie = `token=; path=/${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  },
};
