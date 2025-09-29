// Main onboarding components
export { OnboardingWizard } from './components/onboarding-wizard';

// Step components
export { WelcomeStep } from './components/steps/welcome-step';
export { ProfileSetupStep } from './components/steps/profile-setup-step';
export { AcademicInfoStep } from './components/steps/academic-info-step';
export { SubjectCreationStep } from './components/steps/subject-creation-step';
export { ScheduleSetupStep } from './components/steps/schedule-setup-step';
export { GoalSettingStep } from './components/steps/goal-setting-step';
export { WeekGeneratorStep } from './components/steps/week-generator-step';
export { CompletionStep } from './components/steps/completion-step';

// Types
export type {
  OnboardingData,
  OnboardingStep,
  StepProps,
  OnboardingProgress,
} from './types';

// Hooks
export { useOnboardingProgress } from './hooks/useOnboardingProgress';