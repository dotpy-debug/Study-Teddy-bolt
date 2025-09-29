import { useState, useEffect } from 'react';
import { OnboardingData, OnboardingProgress } from '../types';

const STORAGE_KEY = 'onboarding-progress';

export function useOnboardingProgress() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);

  // Load progress from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsedProgress = JSON.parse(saved);
        setProgress(parsedProgress);
      } catch (error) {
        console.warn('Failed to parse onboarding progress:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const saveProgress = (newProgress: OnboardingProgress) => {
    setProgress(newProgress);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
  };

  const clearProgress = () => {
    setProgress(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateStep = (currentStep: number, completedSteps: number[], data: Partial<OnboardingData>) => {
    const newProgress: OnboardingProgress = {
      currentStep,
      completedSteps,
      data,
    };
    saveProgress(newProgress);
  };

  return {
    progress,
    saveProgress,
    clearProgress,
    updateStep,
  };
}