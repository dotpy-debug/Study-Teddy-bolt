'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { aiApi } from '@/lib/api/ai';
import { Button as UIButton } from '@/components/ui/button';

interface HistoryItem {
  id: string;
  message: string;
  aiResponse: string;
  createdAt: string;
}

export function AIChatInterface() {
  const [messages, setMessages] = useState<HistoryItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async () => {
    const res = await aiApi.getHistory(20);
    if (res.data) {
      // map to HistoryItem shape if needed
      setMessages(
        res.data.map((h: any) => ({
          id: h.id,
          message: h.message,
          aiResponse: h.aiResponse,
          createdAt: h.createdAt,
        }))
      );
    }
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const temp: HistoryItem = {
      id: 'temp',
      message: input,
      aiResponse: 'Thinking... ',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, temp]);
    const toSend = input;
    setInput('');
    setLoading(true);
    try {
      const res = await aiApi.chat({ message: toSend });
      if (res.data) {
        setMessages((prev) => prev.map((m) => (m.id === 'temp' ? {
          id: res.data.id || Date.now().toString(),
          message: toSend,
          aiResponse: (res.data as any).aiResponse || (res.data as any).content || '',
          createdAt: new Date().toISOString(),
        } : m)));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== 'temp'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="text-sm font-medium">AI Tutor</div>
        <div className="flex items-center gap-2">
          <UIButton
            variant="outline"
            size="sm"
            onClick={async () => {
              const res = await aiApi.exportHistory('json');
              if (res.data) {
                const url = URL.createObjectURL(res.data);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'ai-history.json';
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
          >
            Export JSON
          </UIButton>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="bg-blue-50 rounded-lg p-3 flex-1">
                <p className="text-sm">{m.message}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-gray-50 rounded-lg p-3 flex-1">
                <p className="text-sm whitespace-pre-wrap">{m.aiResponse}</p>
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask a question..."
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()}>
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
}


