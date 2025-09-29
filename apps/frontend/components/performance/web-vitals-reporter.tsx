'use client';

import { useEffect } from 'react';
import { reportWebVitals, observeLongTasks } from '@/lib/web-vitals';
import { Analytics } from '@vercel/analytics/react';

export function WebVitalsReporter() {
  useEffect(() => {
    // Report Web Vitals
    reportWebVitals();

    // Observe long tasks in development
    if (process.env.NODE_ENV === 'development') {
      const cleanup = observeLongTasks();
      return cleanup;
    }
  }, []);

  return (
    <>
      <Analytics />
    </>
  );
}