const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://sunsunature-3.onrender.com';
const BASE = `${BACKEND_URL}/api`;

let authToken: string | null = null;
export const setAuthToken = (t: string | null) => {
  authToken = t;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Options = {
  method?: string;
  body?: any;
  auth?: boolean;
  timeoutMs?: number;
};

async function request<T = any>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', body, auth = false, timeoutMs = 20000 } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth && authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const detail = (data && (data.detail || data.message)) || 'Something went wrong';
      throw new ApiError(res.status, typeof detail === 'string' ? detail : 'Request failed');
    }
    return data as T;
  } catch (e: any) {
    if (e instanceof ApiError) throw e;
    if (e.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out. Please check your connection.');
    }
    throw new ApiError(0, 'No internet connection. Please try again.');
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T = any>(p: string, auth = false) => request<T>(p, { auth }),
  post: <T = any>(p: string, body?: any, auth = false) => request<T>(p, { method: 'POST', body, auth }),
  put: <T = any>(p: string, body?: any, auth = false) => request<T>(p, { method: 'PUT', body, auth }),
  del: <T = any>(p: string, auth = false) => request<T>(p, { method: 'DELETE', auth }),
};
