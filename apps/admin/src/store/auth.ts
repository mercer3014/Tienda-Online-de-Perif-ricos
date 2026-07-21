import { create } from 'zustand';
import type { AuthUser, LoginResponse, PermissionKey } from '@villano/shared-types';
import { apiFetch, clearToken, setToken, getToken } from '../lib/api';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loadMe: () => Promise<void>;
  logout: () => void;
  can: (permission: PermissionKey) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: !!getToken(),

  login: async (email, password) => {
    const res = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setToken(res.token);
    set({ user: res.user, loading: false });
  },

  loadMe: async () => {
    if (!getToken()) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const user = await apiFetch<AuthUser>('/auth/me');
      set({ user, loading: false });
    } catch {
      clearToken();
      set({ user: null, loading: false });
    }
  },

  logout: () => {
    clearToken();
    set({ user: null });
    location.href = '/login';
  },

  can: (permission) => get().user?.permissions.includes(permission) ?? false,
}));
