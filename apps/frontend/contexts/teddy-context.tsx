'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface TeddyState {
  personalityType: 'cheerleader' | 'coach' | 'friend';
  isVisible: boolean;
  currentMood?: string;
  interactionCount: number;
  studyStreak: number;
  lastInteraction?: string | null;
}

interface TeddyContextValue {
  state: TeddyState;
  setPersonalityType: (p: TeddyState['personalityType']) => void;
  toggleVisibility: () => void;
  setMood: (mood: string, note?: string) => void;
  resetTeddy: () => void;
  triggerCelebration: (msg?: string) => void;
  triggerEncouragement: () => void;
}

const TeddyContext = createContext<TeddyContextValue | undefined>(undefined);

export function TeddyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TeddyState>({
    personalityType: 'coach',
    isVisible: true,
    currentMood: 'neutral',
    interactionCount: 0,
    studyStreak: 0,
    lastInteraction: null,
  });

  const value: TeddyContextValue = {
    state,
    setPersonalityType: (p) => setState((s) => ({ ...s, personalityType: p })),
    toggleVisibility: () => setState((s) => ({ ...s, isVisible: !s.isVisible })),
    setMood: (mood) => setState((s) => ({ ...s, currentMood: mood, interactionCount: s.interactionCount + 1, lastInteraction: new Date().toISOString() })),
    resetTeddy: () => setState({ personalityType: 'coach', isVisible: true, currentMood: 'neutral', interactionCount: 0, studyStreak: 0, lastInteraction: null }),
    triggerCelebration: () => setState((s) => ({ ...s, interactionCount: s.interactionCount + 1 })),
    triggerEncouragement: () => setState((s) => ({ ...s, interactionCount: s.interactionCount + 1 })),
  };
  return <TeddyContext.Provider value={value}>{children}</TeddyContext.Provider>;
}

export function useTeddy() {
  const ctx = useContext(TeddyContext);
  if (!ctx) throw new Error('useTeddy must be used within TeddyProvider');
  return ctx;
}