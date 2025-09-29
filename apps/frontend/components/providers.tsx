'use client';

import { ReactNode } from 'react';
import { QueryProvider } from '@/components/providers/query-provider';
import { NotificationProvider } from '@/contexts/notification-context';
import { TeddyProvider } from '@/contexts/teddy-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <NotificationProvider>
        <TeddyProvider>
          {children}
        </TeddyProvider>
      </NotificationProvider>
    </QueryProvider>
  );
}