'use client';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ClientCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly maxSize = 100;

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      maxSize: this.maxSize,
      usage: Math.round((this.cache.size / this.maxSize) * 100),
    };
  }

  // Cleanup expired entries
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Global cache instance
export const clientCache = new ClientCache();

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    const cleaned = clientCache.cleanup();
    if (cleaned > 0) {
      console.debug(`[Cache] Cleaned up ${cleaned} expired entries`);
    }
  }, 5 * 60 * 1000);
}

// Cache key generators
export const cacheKeys = {
  tasks: (userId: string) => `tasks:${userId}`,
  todayTasks: (userId: string) => `today-tasks:${userId}`,
  dashboardStats: (userId: string) => `dashboard-stats:${userId}`,
  dashboardStreak: (userId: string) => `dashboard-streak:${userId}`,
  dashboardWeekly: (userId: string) => `dashboard-weekly:${userId}`,
  aiChatHistory: (userId: string) => `ai-chat-history:${userId}`,
  userProfile: (userId: string) => `user-profile:${userId}`,
};

// Cache TTL constants (in milliseconds)
export const cacheTTL = {
  short: 1 * 60 * 1000,      // 1 minute
  medium: 5 * 60 * 1000,     // 5 minutes
  long: 15 * 60 * 1000,      // 15 minutes
  veryLong: 60 * 60 * 1000,  // 1 hour
};

// Utility functions for common caching patterns
export function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = cacheTTL.medium
): Promise<T> {
  const cached = clientCache.get<T>(key);
  
  if (cached) {
    return Promise.resolve(cached);
  }

  return fetchFn().then(data => {
    clientCache.set(key, data, ttl);
    return data;
  });
}

export function invalidateCache(pattern: string): void {
  const keysToDelete: string[] = [];
  
  for (const key of clientCache['cache'].keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => clientCache.delete(key));
}

import { useState, useEffect } from 'react';

// React hook for cache management
export function useCacheStats() {
  const [stats, setStats] = useState(clientCache.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(clientCache.getStats());
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    ...stats,
    clear: () => {
      clientCache.clear();
      setStats(clientCache.getStats());
    },
    cleanup: () => {
      const cleaned = clientCache.cleanup();
      setStats(clientCache.getStats());
      return cleaned;
    },
  };
}