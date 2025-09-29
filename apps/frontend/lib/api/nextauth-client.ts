import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

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
  withCredentials: true,
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const apiError: ApiError = {
      message: (error.response?.data as any)?.message || error.message || 'An unexpected error occurred',
      statusCode: error.response?.status || 500,
      error: (error.response?.data as any)?.error,
      details: error.response?.data,
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

export const httpClient = {
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

export default httpClient;