const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface ApiError {
  status: number;
  title: string;
  detail?: string;
  code?: string;
}

function getCsrfFromCookie(): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrf_token='));
  return match ? match.split('=')[1] : null;
}

// Endpoints whose own 401 means "bad credentials / bad token", never "expired session".
// Refreshing on them would loop (or, on /login, wipe state and reload the page).
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

class HttpClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshQueue: Array<{
    resolve: (token: string) => void;
    reject: (err: unknown) => void;
  }> = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const csrfToken = localStorage.getItem('csrf_token');
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    return headers;
  }

  private async handleRefresh(): Promise<string> {
    if (this.isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const csrfToken = localStorage.getItem('csrf_token');

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = (await response.json()) as { accessToken: string };
      const newToken = data.accessToken;

      localStorage.setItem('access_token', newToken);

      const newCsrf = getCsrfFromCookie();
      if (newCsrf) {
        localStorage.setItem('csrf_token', newCsrf);
      }

      this.refreshQueue.forEach(({ resolve }) => resolve(newToken));
      this.refreshQueue = [];

      return newToken;
    } catch (err) {
      this.refreshQueue.forEach(({ reject }) => reject(err));
      this.refreshQueue = [];

      localStorage.removeItem('access_token');
      localStorage.removeItem('csrf_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      throw err;
    } finally {
      this.isRefreshing = false;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      credentials: 'include',
      headers: this.getHeaders(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const canRefresh =
      !NO_REFRESH_PATHS.some((p) => path.startsWith(p)) && localStorage.getItem('access_token') !== null;

    if (response.status === 401 && canRefresh) {
      const newToken = await this.handleRefresh();

      const retryResponse = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          ...this.getHeaders(),
          Authorization: `Bearer ${newToken}`,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      if (!retryResponse.ok) {
        const errorData = (await retryResponse.json().catch(() => ({}))) as Partial<ApiError>;
        const error: ApiError = {
          status: retryResponse.status,
          title: errorData.title ?? 'Request failed',
          detail: errorData.detail,
          code: errorData.code,
        };
        throw error;
      }

      if (retryResponse.status === 204) {
        return undefined as T;
      }

      return retryResponse.json() as Promise<T>;
    }

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Partial<ApiError>;
      const error: ApiError = {
        status: response.status,
        title: errorData.title ?? 'Request failed',
        detail: errorData.detail,
        code: errorData.code,
      };
      throw error;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

// Business-rule rejections carry a Spanish `detail`; prefer it over a generic fallback.
export function apiErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as Partial<ApiError> | undefined)?.detail;
  return typeof detail === 'string' && detail.trim() ? detail : fallback;
}

export const api = new HttpClient(API_URL);
