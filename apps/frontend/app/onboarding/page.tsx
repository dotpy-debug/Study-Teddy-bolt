"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { OnboardingWizard, OnboardingData } from '@/features/onboarding/components/onboarding-wizard';
import { handleOnboardingCompletion } from '@/features/onboarding/services/onboarding-api';

export default function OnboardingPage() {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);

  const handleOnboardingComplete = async (data: OnboardingData) => {
    setIsCompleting(true);

    try {
      // Show loading toast
      const loadingToast = toast.loading('Setting up your StudyTeddy profile...');

      // Process onboarding data with API integration
      const success = await handleOnboardingCompletion(data);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (success) {
        // Show success message
        toast.success('Welcome to StudyTeddy! Your profile is ready.', {
          duration: 4000,
        });

        // Clear any saved onboarding progress
        localStorage.removeItem('onboarding-progress');

        // Redirect to dashboard after successful onboarding
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        throw new Error('Failed to complete onboarding');
      }
    } catch (error) {
      console.error('Onboarding completion error:', error);

      toast.error('Something went wrong during setup. Please try again.', {
        duration: 5000,
      });

      // Don't redirect on error, let user retry
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <OnboardingWizard
        onComplete={handleOnboardingComplete}
        // You can pass initial data if the user is resuming onboarding
        // initialData={savedOnboardingData}
      />

      {/* Loading overlay when completing onboarding */}
      {isCompleting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Setting up your profile...
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              This won't take long. We're creating your personalized study environment.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}