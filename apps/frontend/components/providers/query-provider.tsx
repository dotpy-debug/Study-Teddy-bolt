'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient, devtools, queryErrorHandler } from '@/lib/react-query';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Use the global query client, but allow for server-side rendering
  const [client] = useState(() => queryClient);

  // Set up global error handler
  client.setDefaultOptions({
    queries: {
      ...client.getDefaultOptions().queries,
      throwOnError: queryErrorHandler,
    },
    mutations: {
      ...client.getDefaultOptions().mutations,
      throwOnError: queryErrorHandler,
    },
  });

  return (
    <QueryClientProvider client={client}>
      {children}
      {devtools.enabled && (
        <ReactQueryDevtools
          initialIsOpen={devtools.initialIsOpen}
          position={devtools.position}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}