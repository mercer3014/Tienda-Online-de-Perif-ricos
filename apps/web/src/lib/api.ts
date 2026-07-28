import type { ApiError } from '@villano/shared-types';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
/** Origen para prefijar rutas de imagen `/uploads/...` que sirve la API. */
export const ASSET_ORIGIN = API_URL.replace(/\/api\/?$/, '');

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

/** Resuelve una URL de imagen relativa de la API a absoluta. */
export const assetUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  return `${ASSET_ORIGIN}${url}`;
};

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor. Revisa tu conexión.');
  }

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const err = (json as ApiError).error;
    throw new ApiRequestError(res.status, err?.code ?? 'ERROR', err?.message ?? 'Ocurrió un error inesperado');
  }
  return (json as { data: T }).data;
}
