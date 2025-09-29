"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import step components
import { WelcomeStep } from './steps/welcome-step';
import { ProfileSetupStep } from './steps/profile-setup-step';
import { AcademicInfoStep } from './steps/academic-info-step';
import { SubjectCreationStep } from './steps/subject-creation-step';
import { ScheduleSetupStep } from './steps/schedule-setup-step';
import { GoalSettingStep } from './steps/goal-setting-step';
import { WeekGeneratorStep } from './steps/week-generator-step';
import { CompletionStep } from './steps/completion-step';

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

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Get started with StudyTeddy',
    optional: false,
  },
  {
    id: 'profile',
    title: 'Profile Setup',
    description: 'Tell us about yourself',
    optional: false,
  },
  {
    id: 'academic',
    title: 'Academic Info',
    description: 'Your educational background',
    optional: false,
  },
  {
    id: 'subjects',
    title: 'Subjects',
    description: 'Add your subjects',
    optional: false,
  },
  {
    id: 'schedule',
    title: 'Schedule',
    description: 'Set your availability',
    optional: true,
  },
  {
    id: 'goals',
    title: 'Goals',
    description: 'Define your objectives',
    optional: true,
  },
  {
    id: 'week-generation',
    title: 'Week Planning',
    description: 'Generate your first week',
    optional: false,
  },
  {
    id: 'completion',
    title: 'Complete',
    description: 'All set!',
    optional: false,
  },
];

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
  initialData?: Partial<OnboardingData>;
}

export const OnboardingWizard = ({ onComplete, initialData }: OnboardingWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>(
    initialData || {}
  );
  const [isAnimating, setIsAnimating] = useState(false);

  // Save progress to localStorage
  useEffect(() => {
    localStorage.setItem('onboarding-progress', JSON.stringify({
      currentStep,
      completedSteps: Array.from(completedSteps),
      data: onboardingData,
    }));
  }, [currentStep, completedSteps, onboardingData]);

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('onboarding-progress');
    if (saved) {
      try {
        const { currentStep: savedStep, completedSteps: savedCompleted, data } = JSON.parse(saved);
        if (savedStep !== undefined) setCurrentStep(savedStep);
        if (savedCompleted) setCompletedSteps(new Set(savedCompleted));
        if (data) setOnboardingData(data);
      } catch (error) {
        console.warn('Failed to load onboarding progress:', error);
      }
    }
  }, []);

  const updateData = (stepData: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({
      ...prev,
      ...stepData,
    }));
  };

  const markStepComplete = (stepIndex: number) => {
    setCompletedSteps(prev => new Set([...prev, stepIndex]));
  };

  const goToStep = async (stepIndex: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentStep(stepIndex);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      markStepComplete(currentStep);
      goToStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const skipStep = () => {
    if (STEPS[currentStep].optional) {
      nextStep();
    }
  };

  const handleComplete = () => {
    markStepComplete(currentStep);
    localStorage.removeItem('onboarding-progress');
    onComplete(onboardingData as OnboardingData);
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const currentStepConfig = STEPS[currentStep];

  const renderStep = () => {
    const stepProps = {
      data: onboardingData,
      updateData,
      onNext: nextStep,
      onSkip: STEPS[currentStep].optional ? skipStep : undefined,
    };

    switch (currentStepConfig.id) {
      case 'welcome':
        return <WelcomeStep {...stepProps} />;
      case 'profile':
        return <ProfileSetupStep {...stepProps} />;
      case 'academic':
        return <AcademicInfoStep {...stepProps} />;
      case 'subjects':
        return <SubjectCreationStep {...stepProps} />;
      case 'schedule':
        return <ScheduleSetupStep {...stepProps} />;
      case 'goals':
        return <GoalSettingStep {...stepProps} />;
      case 'week-generation':
        return <WeekGeneratorStep {...stepProps} />;
      case 'completion':
        return <CompletionStep {...stepProps} onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome to StudyTeddy
            </h1>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Step {currentStep + 1} of {STEPS.length}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{currentStepConfig.title}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
          </div>
        </div>

        {/* Step Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2 overflow-x-auto pb-2">
            {STEPS.map((step, index) => (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                disabled={index > currentStep && !completedSteps.has(index)}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-lg transition-all text-sm whitespace-nowrap",
                  index === currentStep
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                    : completedSteps.has(index)
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800"
                    : index < currentStep
                    ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed"
                )}
              >
                {completedSteps.has(index) ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2",
                    index === currentStep ? "border-blue-500 bg-blue-500" : "border-gray-300"
                  )} />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="shadow-lg">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">
                    {currentStepConfig.title}
                  </CardTitle>
                  <CardDescription className="text-lg">
                    {currentStepConfig.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderStep()}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Footer */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center space-x-2">
              {STEPS[currentStep].optional && (
                <Button variant="ghost" onClick={skipStep}>
                  Skip this step
                </Button>
              )}

              {currentStep === STEPS.length - 1 ? (
                <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
                  Complete Setup
                  <CheckCircle className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={nextStep}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};