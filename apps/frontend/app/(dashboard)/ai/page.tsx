'use client';

import { Suspense } from 'react';
import { AIChatInterface } from '@/components/ai/ai-chat-interface';

export default function AIPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading AI...</div>}>
      <AIChatInterface />
    </Suspense>
  );
}