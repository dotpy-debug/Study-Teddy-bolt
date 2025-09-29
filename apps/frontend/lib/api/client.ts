import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Token storage interface
interface TokenStorage {
  getAccessToken(): string | null;
  setAccessToken(accessToken: string): void;
  clearTokens(): void;
}

const tokenStorage: TokenStorage = {
  getAccessToken: () => (typeof window === 'undefined' ? null : localStorage.getItem('backendAccessToken')),
  setAccessToken: (accessToken: string) => {
    if (typeof window !== 'undefined') localStorage.setItem('backendAccessToken', accessToken)
  },
  clearTokens: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('backendAccessToken');
    localStorage.removeItem('user');
  }
};

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
}

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let isExchanging = false;
let queued: Array<{ resolve: (v?: unknown) => void; reject: (r?: unknown) => void }> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  queued.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  queued = [];
};

const exchangeJwt = async (): Promise<string | null> => {
  try {
    const resp = await fetch('/api/exchange', { method: 'POST' });
    if (!resp.ok) return null;
    const data = await resp.json();
    const token = data?.access_token as string | undefined;
    if (token) tokenStorage.setAccessToken(token);
    return token || null;
  } catch {
    return null;
  }
};

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    let token = tokenStorage.getAccessToken();
    if (!token) {
      if (isExchanging) {
        await new Promise((resolve, reject) => queued.push({ resolve, reject }));
        token = tokenStorage.getAccessToken();
      } else {
        isExchanging = true;
        try {
          token = await exchangeJwt();
          processQueue(null, token);
        } catch (e) {
          processQueue(e as AxiosError, null);
        } finally {
          isExchanging = false;
        }
      }
    }
    if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      // try to refresh short-lived exchange token
      let token: string | null = null;
      if (isExchanging) {
        await new Promise((resolve, reject) => queued.push({ resolve, reject }));
        token = tokenStorage.getAccessToken();
      } else {
        isExchanging = true;
        try {
          token = await exchangeJwt();
          processQueue(null, token);
        } catch (e) {
          processQueue(e as AxiosError, null);
        } finally {
          isExchanging = false;
        }
      }
      if (token && original.headers) original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    }

    const apiError: ApiError = {
      message: (error.response?.data as any)?.message || error.message || 'An unexpected error occurred',
      statusCode: error.response?.status || 500,
      error: (error.response?.data as any)?.error,
      details: error.response?.data
    };
    if (!error.response) {
      apiError.message = 'Network error. Please check your connection.';
      apiError.statusCode = 0;
    }
    if (error.code === 'ECONNABORTED') {
      apiError.message = 'Request timeout. Please try again.';
      apiError.statusCode = 408;
    }
    return Promise.reject(apiError);
  }
);

export const apiClient = {
  get: async <T = unknown>(url: string, config?: object): Promise<T> => {
    const response = await api.get<ApiResponse<T>>(url, config);
    return (response.data as any).data || (response.data as any);
  },
  post: async <T = unknown>(url: string, data?: unknown, config?: object): Promise<T> => {
    const response = await api.post<ApiResponse<T>>(url, data, config);
    return (response.data as any).data || (response.data as any);
  },
  put: async <T = unknown>(url: string, data?: unknown, config?: object): Promise<T> => {
    const response = await api.put<ApiResponse<T>>(url, data, config);
    return (response.data as any).data || (response.data as any);
  },
  patch: async <T = unknown>(url: string, data?: unknown, config?: object): Promise<T> => {
    const response = await api.patch<ApiResponse<T>>(url, data, config);
    return (response.data as any).data || (response.data as any);
  },
  delete: async <T = unknown>(url: string, config?: object): Promise<T> => {
    const response = await api.delete<ApiResponse<T>>(url, config);
    return (response.data as any).data || (response.data as any);
  }
};

export { api };
export default api;