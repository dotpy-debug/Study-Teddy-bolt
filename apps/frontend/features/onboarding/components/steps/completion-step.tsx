"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle,
  PartyPopper,
  BookOpen,
  Calendar,
  Target,
  Zap,
  ArrowRight,
  Star,
  Trophy,
  Users,
  TrendingUp,
  Clock,
  Brain
} from 'lucide-react';
import { OnboardingData } from '../onboarding-wizard';

interface CompletionStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip?: () => void;
  onComplete: () => void;
}

const achievements = [
  {
    icon: CheckCircle,
    title: 'Profile Setup Complete',
    description: 'Your personal preferences are configured'
  },
  {
    icon: BookOpen,
    title: 'Subjects Added',
    description: 'Your study subjects are organized and ready'
  },
  {
    icon: Calendar,
    title: 'Schedule Configured',
    description: 'Your availability and study times are set'
  },
  {
    icon: Target,
    title: 'Goals Defined',
    description: 'Your academic objectives are clearly outlined'
  },
  {
    icon: Zap,
    title: 'Week Plan Generated',
    description: 'Your first personalized study week is ready'
  }
];

const nextSteps = [
  {
    icon: Calendar,
    title: 'View Your Dashboard',
    description: 'See your upcoming study sessions and progress',
    action: 'Go to Dashboard'
  },
  {
    icon: Clock,
    title: 'Start Your First Session',
    description: 'Begin studying with your generated schedule',
    action: 'Start Studying'
  },
  {
    icon: Target,
    title: 'Track Your Progress',
    description: 'Monitor your goals and academic achievements',
    action: 'View Progress'
  },
  {
    icon: Brain,
    title: 'Use Focus Mode',
    description: 'Distraction-free study sessions with timers',
    action: 'Try Focus Mode'
  }
];

const features = [
  'Smart study scheduling',
  'Progress tracking',
  'Goal management',
  'Focus sessions',
  'Performance analytics',
  'Study reminders'
];

export const CompletionStep = ({ data, onComplete }: CompletionStepProps) => {
  const profile = data.profile;
  const subjects = data.subjects || [];
  const goals = data.goals || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      {/* Celebration Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-center space-y-4"
      >
        <div className="relative mx-auto w-24 h-24 mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-1 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center">
            <Trophy className="h-12 w-12 text-yellow-500" />
          </div>
        </div>

        <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
          Congratulations, {profile?.name}! 🎉
        </h2>

        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          You've successfully set up StudyTeddy! Your personalized study companion is ready to help you achieve your academic goals.
        </p>
      </motion.div>

      {/* Setup Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-4 flex items-center">
              <CheckCircle className="h-6 w-6 mr-2" />
              Setup Complete
            </h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement, index) => (
                <motion.div
                  key={achievement.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                  className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg"
                >
                  <achievement.icon className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      {achievement.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {achievement.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Your Setup Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Your StudyTeddy Setup
            </h3>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{subjects.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Subjects Added</div>
                <div className="mt-2 space-y-1">
                  {subjects.slice(0, 3).map((subject, index) => (
                    <div key={index} className="flex items-center justify-center space-x-1">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: subject.color }}
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {subject.name}
                      </span>
                    </div>
                  ))}
                  {subjects.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{subjects.length - 3} more
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">{goals.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Goals Set</div>
                <div className="mt-2 space-y-1">
                  {goals.slice(0, 2).map((goal, index) => (
                    <div key={index} className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {goal.title}
                    </div>
                  ))}
                  {goals.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{goals.length - 2} more
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {data.schedule?.studyHours?.daily || 4}h
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Daily Study Hours</div>
                <div className="mt-2">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {data.schedule?.focusSessionLength || 50} min sessions
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {data.schedule?.breakDuration || 15} min breaks
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* What's Next */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              What's Next?
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              {nextSteps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.9 + index * 0.1 }}
                  className="p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
                >
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                      <step.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        {step.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {step.description}
                      </p>
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {step.action} →
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Available Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.0 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Star className="h-5 w-5 mr-2 text-yellow-500" />
          Features Available to You
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.1 + index * 0.05 }}
              className="flex items-center space-x-2 text-sm"
            >
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-gray-700 dark:text-gray-300">{feature}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Success Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center"
      >
        <div className="p-4">
          <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">10,000+</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Students helped</div>
        </div>
        <div className="p-4">
          <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">40%</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg. improvement</div>
        </div>
        <div className="p-4">
          <Clock className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">2.5M</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Study hours tracked</div>
        </div>
        <div className="p-4">
          <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">95%</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Goal achievement</div>
        </div>
      </motion.div>

      {/* Complete Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.4 }}
        className="text-center pt-6"
      >
        <Button
          onClick={onComplete}
          size="lg"
          className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-12 py-4 text-lg"
        >
          Enter StudyTeddy
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          Ready to transform your study habits? Let's begin your journey!
        </p>
      </motion.div>

      {/* Confetti Animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 0.5 }}
        className="fixed inset-0 pointer-events-none z-50"
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{
              opacity: 0,
              y: -100,
              x: Math.random() * window.innerWidth,
              rotate: 0
            }}
            animate={{
              opacity: [0, 1, 0],
              y: window.innerHeight + 100,
              rotate: 360 * 3
            }}
            transition={{
              duration: 3,
              delay: Math.random() * 2,
              repeat: Infinity,
              repeatDelay: 5
            }}
            className="absolute"
          >
            <PartyPopper className="h-6 w-6 text-yellow-400" />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};