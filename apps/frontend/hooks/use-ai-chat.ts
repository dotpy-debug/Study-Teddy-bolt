'use client';

import { useState, useEffect } from 'react';
import { aiApi } from '@/lib/api/ai';
import type { AIChat, ChatRequest } from '@/types';

export const useAIChat = () => {
  const [messages, setMessages] = useState<AIChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      setError(null);
      const history = await aiApi.getHistory(20); // Load last 20 messages
      setMessages(history);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load chat history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const sendMessage = async (message: string): Promise<AIChat> => {
    if (!message.trim()) {
      throw new Error('Message cannot be empty');
    }

    try {
      setLoading(true);
      setError(null);

      const response = await aiApi.chat({ message });
      setMessages(prev => [...prev, response]);

      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to send message';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const generatePracticeQuestions = async (
    topic: string,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<AIChat> => {
    try {
      setLoading(true);
      setError(null);

      const response = await aiApi.generatePractice({ topic, difficulty });
      setMessages(prev => [...prev, response]);

      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to generate practice questions';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const explainConcept = async (concept: string): Promise<AIChat> => {
    try {
      setLoading(true);
      setError(null);

      const response = await aiApi.explainConcept({ concept });
      setMessages(prev => [...prev, response]);

      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to explain concept';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (id: string): Promise<void> => {
    try {
      await aiApi.deleteMessage(id);
      setMessages(prev => prev.filter(msg => msg.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete message');
      throw err;
    }
  };

  const clearError = () => setError(null);

  useEffect(() => {
    loadHistory();
  }, []);

  return {
    messages,
    loading,
    historyLoading,
    error,
    sendMessage,
    generatePracticeQuestions,
    explainConcept,
    deleteMessage,
    clearError,
    refreshHistory: loadHistory,
  };
};