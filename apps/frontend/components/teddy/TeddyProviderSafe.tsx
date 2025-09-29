'use client';

import { useTeddy } from '@/contexts/teddy-context';
import { TeddyMood } from './TeddyAssistant';

// Safe wrapper for using Teddy context that provides default values when context is not available
export function useTeddySafe() {
  try {
    return useTeddy();
  } catch (error) {
    // Return mock implementation when TeddyProvider is not available
    return {
      state: {
        currentMood: 'idle' as TeddyMood,
        currentMessage: null,
        isVisible: false,
        interactionCount: 0,
        lastInteraction: null,
        messageHistory: [],
        studyStreak: 0,
        personalityType: 'friend' as const
      },
      setMood: () => {},
      showMessage: () => {},
      hideMessage: () => {},
      toggleVisibility: () => {},
      getContextualGreeting: () => ({
        text: 'Welcome!',
        mood: 'idle' as TeddyMood,
        timestamp: new Date(),
        type: 'greeting' as const
      }),
      triggerCelebration: () => {},
      triggerEncouragement: () => {},
      updateStudyStreak: () => {},
      setPersonalityType: () => {},
      resetTeddy: () => {}
    };
  }
}