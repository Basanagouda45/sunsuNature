// Separate API client for the admin portal — uses its own bearer token so it
// never collides with the customer session token.
const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

let adminToken: string | null = null;
export const setAdminToken = (t: string | null) => {
  adminToken = t;
};

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T = any>(path: string, method = 'GET', body?: any): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
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
      const detail = (data && (data.detail || data.message)) || 'Request failed';
      throw new AdminApiError(res.status, typeof detail === 'string' ? detail : 'Request failed');
    }
    return data as T;
  } catch (e: any) {
    if (e instanceof AdminApiError) throw e;
    if (e.name === 'AbortError') throw new AdminApiError(0, 'Request timed out.');
    throw new AdminApiError(0, 'Network error. Please try again.');
  } finally {
    clearTimeout(timer);
  }
}

export const adminApi = {
  get: <T = any>(p: string) => request<T>(p),
  post: <T = any>(p: string, body?: any) => request<T>(p, 'POST', body),
  put: <T = any>(p: string, body?: any) => request<T>(p, 'PUT', body),
  del: <T = any>(p: string) => request<T>(p, 'DELETE'),
};
