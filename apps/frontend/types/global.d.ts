// Global type declarations for Study Teddy

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
  
  interface Error {
    digest?: string;
  }
}

// Extend NextRequest for missing properties
declare module 'next/server' {
  interface NextRequest {
    ip?: string;
  }
}

// Axios config extensions
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}

export {};
