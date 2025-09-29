export interface OnboardingData {
  profile: {
    name: string;
    avatar?: string;
    timezone: string;
    preferences: {
      theme: 'light' | 'dark' | 'system';
      notifications: boolean;
      emailUpdates: boolean;
    };
  };
  academic: {
    school: string;
    gradeLevel: string;
    semester: string;
    academicYear: string;
  };
  subjects: Array<{
    name: string;
    color: string;
    icon?: string;
    description?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    credits?: number;
    instructor?: string;
  }>;
  schedule: {
    studyHours: {
      daily: number;
      weekly: number;
    };
    availability: {
      [key: string]: { start: string; end: string }[];
    };
    breakDuration: number;
    focusSessionLength: number;
  };
  goals: Array<{
    title: string;
    description: string;
    type: 'academic' | 'personal' | 'career';
    priority: 'low' | 'medium' | 'high';
    deadline?: string;
  }>;
  weekGeneration: {
    startDate: string;
    includedSubjects: string[];
    focusAreas: string[];
    studyIntensity: 'light' | 'moderate' | 'intensive';
  };
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  optional: boolean;
}

export interface StepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip?: () => void;
}

export interface OnboardingProgress {
  currentStep: number;
  completedSteps: number[];
  data: Partial<OnboardingData>;
}