import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { clientCache, cacheKeys, cacheTTL, getCachedOrFetch } from '../cache';
import { trackCustomMetric } from '../web-vitals';

interface OptimizedRequestConfig extends AxiosRequestConfig {
  cache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
}

class OptimizedApiClient {
  private client: AxiosInstance;
  private requestQueue = new Map<string, Promise<any>>();

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for performance tracking
    this.client.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: performance.now() };
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for performance tracking and error handling
    this.client.interceptors.response.use(
      (response) => {
        const endTime = performance.now();
        const startTime = response.config.metadata?.startTime || endTime;
        const duration = endTime - startTime;

        // Track API performance
        trackCustomMetric(`api_${response.config.method}_${response.config.url}`, duration);

        // Log slow requests
        if (duration > 2000) {
          console.warn(`Slow API request: ${response.config.method?.toUpperCase()} ${response.config.url} took ${duration.toFixed(2)}ms`);
        }

        return response;
      },
      (error) => {
        const endTime = performance.now();
        const startTime = error.config?.metadata?.startTime || endTime;
        const duration = endTime - startTime;

        trackCustomMetric(`api_error_${error.config?.method}_${error.config?.url}`, duration);

        return Promise.reject(error);
      }
    );
  }

  // Deduplicate identical requests
  private async deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key);
    }

    const promise = requestFn().finally(() => {
      this.requestQueue.delete(key);
    });

    this.requestQueue.set(key, promise);
    return promise;
  }

  async get<T>(url: string, config: OptimizedRequestConfig = {}): Promise<T> {
    const { cache = false, cacheTTL = cacheTTL.medium, cacheKey, ...axiosConfig } = config;
    
    if (cache) {
      const key = cacheKey || `get:${url}:${JSON.stringify(axiosConfig.params || {})}`;
      
      return getCachedOrFetch(
        key,
        () => this.deduplicateRequest(
          key,
          () => this.client.get<T>(url, axiosConfig).then(response => response.data)
        ),
        cacheTTL
      );
    }

    return this.deduplicateRequest(
      `get:${url}:${JSON.stringify(axiosConfig.params || {})}`,
      () => this.client.get<T>(url, axiosConfig).then(response => response.data)
    );
  }

  async post<T>(url: string, data?: any, config: OptimizedRequestConfig = {}): Promise<T> {
    const { cache = false, cacheTTL = cacheTTL.medium, cacheKey, ...axiosConfig } = config;
    
    const response = await this.client.post<T>(url, data, axiosConfig);
    
    // Invalidate related cache entries after mutations
    if (url.includes('/tasks')) {
      this.invalidateTasksCache();
    } else if (url.includes('/ai/chat')) {
      this.invalidateChatCache();
    }
    
    return response.data;
  }

  async put<T>(url: string, data?: any, config: OptimizedRequestConfig = {}): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    
    // Invalidate related cache entries after mutations
    if (url.includes('/tasks')) {
      this.invalidateTasksCache();
    }
    
    return response.data;
  }

  async delete<T>(url: string, config: OptimizedRequestConfig = {}): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    
    // Invalidate related cache entries after mutations
    if (url.includes('/tasks')) {
      this.invalidateTasksCache();
    }
    
    return response.data;
  }

  // Cache invalidation methods
  private invalidateTasksCache() {
    clientCache.delete(cacheKeys.tasks(''));
    clientCache.delete(cacheKeys.todayTasks(''));
    clientCache.delete(cacheKeys.dashboardStats(''));
    clientCache.delete(cacheKeys.dashboardStreak(''));
    clientCache.delete(cacheKeys.dashboardWeekly(''));
  }

  private invalidateChatCache() {
    clientCache.delete(cacheKeys.aiChatHistory(''));
  }

  // Batch requests for better performance
  async batch<T>(requests: Array<() => Promise<T>>): Promise<T[]> {
    const startTime = performance.now();
    
    try {
      const results = await Promise.all(requests.map(request => request()));
      
      const duration = performance.now() - startTime;
      trackCustomMetric('api_batch_request', duration);
      
      return results;
    } catch (error) {
      const duration = performance.now() - startTime;
      trackCustomMetric('api_batch_error', duration);
      throw error;
    }
  }

  // Prefetch data for better UX
  async prefetch(url: string, config: OptimizedRequestConfig = {}) {
    try {
      await this.get(url, { ...config, cache: true });
    } catch (error) {
      // Silently fail prefetch requests
      console.debug('Prefetch failed:', url, error);
    }
  }

  // Set auth token
  setAuthToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Remove auth token
  removeAuthToken() {
    delete this.client.defaults.headers.common['Authorization'];
  }

  // Get performance metrics
  getPerformanceMetrics() {
    return {
      queueSize: this.requestQueue.size,
      cacheStats: clientCache.getStats(),
    };
  }
}

// Create and export the optimized client
export const optimizedApiClient = new OptimizedApiClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
);

// Convenience methods for common API calls
export const api = {
  // Tasks
  getTasks: (userId: string) => 
    optimizedApiClient.get(`/tasks`, { 
      cache: true, 
      cacheTTL: cacheTTL.medium,
      cacheKey: cacheKeys.tasks(userId)
    }),
  
  getTodayTasks: (userId: string) => 
    optimizedApiClient.get(`/tasks/today`, { 
      cache: true, 
      cacheTTL: cacheTTL.short,
      cacheKey: cacheKeys.todayTasks(userId)
    }),

  createTask: (data: any) => 
    optimizedApiClient.post('/tasks', data),

  updateTask: (id: string, data: any) => 
    optimizedApiClient.put(`/tasks/${id}`, data),

  deleteTask: (id: string) => 
    optimizedApiClient.delete(`/tasks/${id}`),

  // Dashboard
  getDashboardStats: (userId: string) => 
    optimizedApiClient.get('/dashboard/stats', { 
      cache: true, 
      cacheTTL: cacheTTL.medium,
      cacheKey: cacheKeys.dashboardStats(userId)
    }),

  getDashboardStreak: (userId: string) => 
    optimizedApiClient.get('/dashboard/streak', { 
      cache: true, 
      cacheTTL: cacheTTL.long,
      cacheKey: cacheKeys.dashboardStreak(userId)
    }),

  getDashboardWeekly: (userId: string) => 
    optimizedApiClient.get('/dashboard/weekly', { 
      cache: true, 
      cacheTTL: cacheTTL.medium,
      cacheKey: cacheKeys.dashboardWeekly(userId)
    }),

  // AI Chat
  getChatHistory: (userId: string) => 
    optimizedApiClient.get('/ai/history', { 
      cache: true, 
      cacheTTL: cacheTTL.short,
      cacheKey: cacheKeys.aiChatHistory(userId)
    }),

  sendChatMessage: (message: string) => 
    optimizedApiClient.post('/ai/chat', { message }),

  // Auth
  login: (credentials: any) => 
    optimizedApiClient.post('/auth/login', credentials),

  register: (userData: any) => 
    optimizedApiClient.post('/auth/register', userData),

  refreshToken: () => 
    optimizedApiClient.post('/auth/refresh'),

  // Prefetch common data
  prefetchDashboard: (userId: string) => {
    optimizedApiClient.prefetch('/dashboard/stats', { 
      cache: true, 
      cacheKey: cacheKeys.dashboardStats(userId) 
    });
    optimizedApiClient.prefetch('/dashboard/streak', { 
      cache: true, 
      cacheKey: cacheKeys.dashboardStreak(userId) 
    });
  },

  prefetchTasks: (userId: string) => {
    optimizedApiClient.prefetch('/tasks', { 
      cache: true, 
      cacheKey: cacheKeys.tasks(userId) 
    });
    optimizedApiClient.prefetch('/tasks/today', { 
      cache: true, 
      cacheKey: cacheKeys.todayTasks(userId) 
    });
  },
};