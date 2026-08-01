import type { ApiError } from '@villano/shared-types';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
export const ASSET_ORIGIN = API_URL.replace(/\/api\/?$/, '');
const TOKEN_KEY = 'villano_admin_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const assetUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  return `${ASSET_ORIGIN}${url}`;
};

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/** Handler global de 401: limpia sesión y redirige a login. */
function handleUnauthorized() {
  clearToken();
  if (!location.pathname.startsWith('/login')) {
    location.href = '/login';
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor.');
  }

  if (res.status === 401 && path !== '/auth/login') {
    handleUnauthorized();
    throw new ApiRequestError(401, 'UNAUTHORIZED', 'Sesión expirada. Iniciá sesión nuevamente.');
  }

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = (json as ApiError).error;
    throw new ApiRequestError(res.status, err?.code ?? 'ERROR', err?.message ?? 'Ocurrió un error');
  }
  return (json as { data: T }).data;
}

/** Descarga un archivo (CSV, etc.) autenticado y dispara la descarga en el navegador. */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new ApiRequestError(401, 'UNAUTHORIZED', 'Sesión expirada.');
  }
  if (!res.ok) {
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    const err = (json as ApiError).error;
    throw new ApiRequestError(res.status, err?.code ?? 'ERROR', err?.message ?? 'No se pudo exportar');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Subida multipart (imágenes) con token. */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new ApiRequestError(401, 'UNAUTHORIZED', 'Sesión expirada.');
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = (json as ApiError).error;
    throw new ApiRequestError(res.status, err?.code ?? 'ERROR', err?.message ?? 'Error al subir');
  }
  return (json as { data: T }).data;
}
