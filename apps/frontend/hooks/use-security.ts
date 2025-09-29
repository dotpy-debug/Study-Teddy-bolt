import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClientRateLimit, containsMaliciousContent } from '@/lib/utils/security';

// Global rate limiter instance
const rateLimiter = new ClientRateLimit();

export function useSecurity() {
  const router = useRouter();

  // Check for malicious content in user inputs
  const validateInput = useCallback((input: string, fieldName: string = 'input'): boolean => {
    if (containsMaliciousContent(input)) {
      console.warn(`Malicious content detected in ${fieldName}:`, input);
      return false;
    }
    return true;
  }, []);

  // Rate limiting for API calls
  const checkRateLimit = useCallback((key: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
    return rateLimiter.isAllowed(key, maxRequests, windowMs);
  }, []);

  // Secure navigation with validation
  const secureNavigate = useCallback((path: string) => {
    // Validate the path to prevent open redirects
    if (path.startsWith('/') && !path.startsWith('//')) {
      router.push(path);
    } else {
      console.warn('Invalid navigation path blocked:', path);
    }
  }, [router]);

  // Clear sensitive data on component unmount
  const clearSensitiveData = useCallback(() => {
    // Clear any sensitive data from memory
    rateLimiter.clear();
  }, []);

  // Security event listeners
  useEffect(() => {
    // Detect if developer tools are open (basic detection)
    const detectDevTools = () => {
      const threshold = 160;
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        console.warn('Developer tools detected');
        // In production, you might want to take additional security measures
      }
    };

    // Detect right-click context menu (optional security measure)
    const handleContextMenu = (e: MouseEvent) => {
      if (process.env.NODE_ENV === 'production') {
        e.preventDefault();
        return false;
      }
    };

    // Detect key combinations that might be used for debugging
    const handleKeyDown = (e: KeyboardEvent) => {
      if (process.env.NODE_ENV === 'production') {
        // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
            (e.ctrlKey && e.key === 'U')) {
          e.preventDefault();
          return false;
        }
      }
    };

    // Add event listeners
    window.addEventListener('resize', detectDevTools);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('resize', detectDevTools);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      clearSensitiveData();
    };
  }, [clearSensitiveData]);

  return {
    validateInput,
    checkRateLimit,
    secureNavigate,
    clearSensitiveData,
  };
}

// Hook for form security
export function useFormSecurity() {
  const { validateInput } = useSecurity();

  const validateFormData = useCallback((formData: Record<string, any>): boolean => {
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string' && !validateInput(value, key)) {
        return false;
      }
    }
    return true;
  }, [validateInput]);

  const sanitizeFormData = useCallback((formData: Record<string, any>): Record<string, any> => {
    const sanitized = { ...formData };
    
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        // Basic sanitization - trim and limit length
        sanitized[key] = value.trim().substring(0, 1000);
      }
    }
    
    return sanitized;
  }, []);

  return {
    validateFormData,
    sanitizeFormData,
  };
}