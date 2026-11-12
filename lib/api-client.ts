import type { ErrorCode } from './types';

export class ApiClientError extends Error {
  code: ErrorCode;
  status: number;
  constructor(code: ErrorCode, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiClientError('INTERNAL', 'Network problem. Check your connection and retry.', 0);
  }
  const json = (await res.json().catch(() => null)) as
    | { data?: T; error?: { code: ErrorCode; message: string } }
    | null;
  if (!res.ok || !json || json.error) {
    throw new ApiClientError(
      json?.error?.code ?? 'INTERNAL',
      json?.error?.message ?? 'Request failed.',
      res.status
    );
  }
  return json.data as T;
}

export function fetcher<T>(url: string): Promise<T> {
  return request<T>(url);
}

export function postJson<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function patchJson<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

