# Onboarding Feature

A comprehensive onboarding flow for StudyTeddy that guides new users through setting up their personalized study environment.

## Overview

The onboarding wizard consists of 8 steps that collect user information to create a personalized study experience:

1. **Welcome** - Introduction to StudyTeddy features
2. **Profile Setup** - Name, avatar, timezone, and preferences
3. **Academic Info** - School, grade level, semester details
4. **Subject Creation** - Add 3-5 subjects with details
5. **Schedule Setup** - Study hours and availability preferences
6. **Goal Setting** - Define academic and personal objectives
7. **Week Generation** - Create personalized first week plan
8. **Completion** - Success celebration and next steps

## Features

### ✨ Core Features
- **Progressive Wizard** - Step-by-step guided experience
- **Save & Resume** - Automatic progress saving to localStorage
- **Smart Validation** - Form validation at each step
- **Responsive Design** - Works on all device sizes
- **Animated Transitions** - Smooth transitions between steps
- **Skip Options** - Optional steps can be skipped
- **Smart Defaults** - Sensible default values and suggestions

### 🎨 UI/UX Features
- **Progress Indicator** - Visual progress bar and step navigation
- **Interactive Elements** - Hover effects, animations, and feedback
- **Dark Mode Support** - Respects user theme preferences
- **Accessibility** - Keyboard navigation and screen reader support
- **Loading States** - Clear feedback during processing

### 📊 Data Collection
- **Profile Information** - Personal preferences and settings
- **Academic Context** - Educational background and current status
- **Subject Management** - Detailed subject information with colors and difficulty
- **Schedule Preferences** - Study hours, availability, and session preferences
- **Goal Tracking** - SMART goals with priorities and deadlines
- **Week Planning** - Automated schedule generation

## File Structure

```
features/onboarding/
├── components/
│   ├── onboarding-wizard.tsx      # Main wizard component
│   └── steps/
│       ├── welcome-step.tsx       # Welcome and introduction
│       ├── profile-setup-step.tsx # Profile and preferences
│       ├── academic-info-step.tsx # Academic background
│       ├── subject-creation-step.tsx # Subject management
│       ├── schedule-setup-step.tsx   # Schedule preferences
│       ├── goal-setting-step.tsx     # Goal definition
│       ├── week-generator-step.tsx   # Week plan generation
│       └── completion-step.tsx       # Success and next steps
├── hooks/
│   └── useOnboardingProgress.ts   # Progress management hook
├── services/
│   └── onboarding-api.ts         # API integration
├── types/
│   └── index.ts                  # TypeScript definitions
├── index.ts                      # Main exports
└── README.md                     # This documentation
```

## Usage

### Basic Implementation

```tsx
import { OnboardingWizard, OnboardingData } from '@/features/onboarding';

function OnboardingPage() {
  const handleComplete = (data: OnboardingData) => {
    // Process onboarding data
    console.log('Onboarding completed:', data);
  };

  return (
    <OnboardingWizard
      onComplete={handleComplete}
      initialData={savedData} // Optional: resume from saved progress
    />
  );
}
```

### With API Integration

```tsx
import { handleOnboardingCompletion } from '@/features/onboarding/services/onboarding-api';

const handleComplete = async (data: OnboardingData) => {
  const success = await handleOnboardingCompletion(data);
  if (success) {
    router.push('/dashboard');
  }
};
```

## Data Structure

### OnboardingData Interface

```typescript
interface OnboardingData {
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
```

## API Integration

The onboarding system includes comprehensive API integration for:

- **Profile Updates** - Save user profile information
- **Subject Creation** - Bulk create user subjects
- **Goal Setting** - Set up user goals
- **Schedule Preferences** - Save study schedule preferences
- **Week Generation** - Generate personalized study plans
- **Progress Saving** - Save/resume onboarding progress

### API Endpoints

```typescript
// Complete onboarding
POST /api/onboarding/complete

// Update profile
PUT /api/user/profile

// Create subjects
POST /api/subjects/bulk-create

// Set goals
POST /api/goals/bulk-create

// Save schedule preferences
PUT /api/user/schedule-preferences

// Generate week plan
POST /api/schedule/generate-week

// Save/load progress
POST /api/onboarding/progress
GET /api/onboarding/progress
```

## Customization

### Adding New Steps

1. Create a new step component in `components/steps/`
2. Add the step configuration to the `STEPS` array in `onboarding-wizard.tsx`
3. Add the step to the `renderStep()` function
4. Update the `OnboardingData` interface if needed

### Styling

The onboarding flow uses:
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **shadcn/ui** components for consistency
- **Lucide React** for icons

### Validation

Each step includes comprehensive validation using:
- **React Hook Form** for form management
- **Zod** for schema validation
- **Custom validation** for complex requirements

## Accessibility

The onboarding flow includes:
- **Keyboard Navigation** - Full keyboard support
- **Screen Reader Support** - Proper ARIA labels and descriptions
- **Focus Management** - Logical focus flow
- **High Contrast** - Works with system accessibility settings
- **Reduced Motion** - Respects prefers-reduced-motion

## Testing

To test the onboarding flow:

1. Visit `/onboarding` in your application
2. Complete each step with valid data
3. Test the skip functionality on optional steps
4. Test the save/resume functionality by refreshing mid-flow
5. Test form validation with invalid inputs
6. Test responsive design on different screen sizes

## Integration with Backend

The onboarding system is designed to work with your existing backend:

1. **Authentication** - Assumes user is already authenticated
2. **API Calls** - Makes structured API calls to save data
3. **Error Handling** - Graceful error handling with user feedback
4. **Progress Tracking** - Saves progress for resume functionality

## Future Enhancements

Potential improvements:
- **Tutorial Mode** - Interactive feature walkthrough
- **Import Options** - Import data from external sources
- **Advanced Validation** - Real-time availability checking
- **Social Features** - Connect with classmates
- **AI Suggestions** - Smart subject and goal recommendations
- **Analytics** - Track onboarding completion rates and drop-off points