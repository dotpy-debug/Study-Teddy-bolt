"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  BookOpen,
  Calendar,
  Target,
  TrendingUp,
  Users,
  Zap,
  CheckCircle,
  Clock,
  Brain
} from 'lucide-react';
import { OnboardingData } from '../onboarding-wizard';

interface WelcomeStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip?: () => void;
}

const features = [
  {
    icon: BookOpen,
    title: "Smart Study Planning",
    description: "AI-powered study schedules tailored to your learning style and goals"
  },
  {
    icon: Calendar,
    title: "Flexible Scheduling",
    description: "Organize your study time around your busy schedule"
  },
  {
    icon: Target,
    title: "Goal Tracking",
    description: "Set and achieve your academic milestones with our progress tracking"
  },
  {
    icon: TrendingUp,
    title: "Performance Analytics",
    description: "Detailed insights into your study patterns and improvement areas"
  },
  {
    icon: Brain,
    title: "Focus Sessions",
    description: "Pomodoro-style focused study sessions with break reminders"
  },
  {
    icon: Zap,
    title: "Smart Recommendations",
    description: "Get personalized study tips and resource suggestions"
  }
];

const benefits = [
  "Boost your productivity by up to 40%",
  "Better work-life balance",
  "Improved study retention",
  "Reduced academic stress",
  "Clear progress visibility"
];

export const WelcomeStep = ({ onNext }: WelcomeStepProps) => {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-4"
      >
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
          <BookOpen className="h-10 w-10 text-white" />
        </div>

        <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
          Welcome to StudyTeddy!
        </h2>

        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Your personal AI-powered study companion that helps you organize, plan,
          and optimize your learning journey for maximum success.
        </p>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h3 className="text-2xl font-semibold text-center mb-6 text-gray-900 dark:text-white">
          What you'll get with StudyTeddy
        </h3>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg flex-shrink-0">
                      <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Benefits Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6"
      >
        <h3 className="text-xl font-semibold text-center mb-4 text-gray-900 dark:text-white">
          Join thousands of students who have transformed their study habits
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                className="flex items-center space-x-3"
              >
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">5 min</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Setup time</div>
              <div className="mt-4">
                <div className="flex items-center justify-center space-x-2 text-yellow-500">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Quick & Easy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Getting Started Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="text-center space-y-6"
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
            Ready to get started?
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Let's set up your profile and preferences to create the perfect study environment for you.
            This will only take a few minutes and you can always change these settings later.
          </p>

          <div className="flex justify-center">
            <Button
              onClick={onNext}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3"
            >
              Let's Begin
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="ml-2"
              >
                →
              </motion.div>
            </Button>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="flex items-center justify-center space-x-8 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>10,000+ students</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Privacy protected</span>
          </div>
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Free to use</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};