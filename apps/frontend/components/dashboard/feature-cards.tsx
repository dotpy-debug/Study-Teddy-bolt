'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Target, TrendingUp, Timer, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface FeatureCard {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  bgGradient: string;
}

const features: FeatureCard[] = [
  {
    id: 'spaced-repetition',
    title: 'Spaced Repetition',
    subtitle: 'Optimize memory retention with science-backed learning intervals',
    icon: <Brain className="h-6 w-6" />,
    href: '/study/spaced-repetition',
    color: 'text-purple-600 dark:text-purple-400',
    bgGradient: 'from-purple-500/10 to-purple-600/10',
  },
  {
    id: 'smart-goals',
    title: 'Smart Goals',
    subtitle: 'Set and track AI-powered study objectives with precision',
    icon: <Target className="h-6 w-6" />,
    href: '/goals',
    color: 'text-blue-600 dark:text-blue-400',
    bgGradient: 'from-blue-500/10 to-blue-600/10',
  },
  {
    id: 'progress-tracking',
    title: 'Progress Tracking',
    subtitle: 'Monitor your learning journey with detailed analytics',
    icon: <TrendingUp className="h-6 w-6" />,
    href: '/analytics',
    color: 'text-green-600 dark:text-green-400',
    bgGradient: 'from-green-500/10 to-green-600/10',
  },
  {
    id: 'focus-sessions',
    title: 'Focus Sessions',
    subtitle: 'Boost productivity with timed study blocks and breaks',
    icon: <Timer className="h-6 w-6" />,
    href: '/focus',
    color: 'text-orange-600 dark:text-orange-400',
    bgGradient: 'from-orange-500/10 to-orange-600/10',
  },
];

export function FeatureCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {features.map((feature, index) => (
        <Link
          key={feature.id}
          href={feature.href}
          className="group block slide-in"
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          <Card className={cn(
            "relative overflow-hidden border-0 shadow-lg transition-all duration-300",
            "hover:shadow-xl hover:-translate-y-1",
            "bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl",
            "border border-white/20 dark:border-gray-800/20",
            "before:absolute before:inset-0 before:opacity-0",
            `before:bg-gradient-to-br before:${feature.bgGradient}`,
            "before:transition-opacity before:duration-300",
            "hover:before:opacity-100",
            "card-lift glass"
          )}
          >
            <CardHeader className="relative z-10 pb-3">
              <div className={cn(
                "inline-flex p-3 rounded-lg mb-4",
                "bg-gradient-to-br",
                feature.bgGradient,
                "backdrop-blur-sm"
              )}>
                <div className={feature.color}>
                  {feature.icon}
                </div>
              </div>
              <CardTitle className="text-lg font-semibold flex items-center justify-between">
                {feature.title}
                <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed">
                {feature.subtitle}
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}