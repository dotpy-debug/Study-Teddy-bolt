'use client';

import React, { useEffect, useState } from 'react';
import { Brain, Target, TrendingUp, Zap } from 'lucide-react';
import { TeddyAssistant } from '@/components/teddy/TeddyAssistant';
import { useTeddySafe } from '@/components/teddy/TeddyProviderSafe';

interface WelcomeHeaderProps {
  userName?: string;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ userName }) => {
  const { state, getContextualGreeting, showMessage, triggerEncouragement } = useTeddySafe();
  const [greeting, setGreeting] = useState<string>('');

  useEffect(() => {
    const contextualGreeting = getContextualGreeting();
    setGreeting(contextualGreeting.text);

    // Show Teddy's greeting after a short delay
    setTimeout(() => {
      showMessage(contextualGreeting.text, contextualGreeting.mood, 8000);
    }, 500);
  }, [getContextualGreeting, showMessage]);

  const handleTeddyClick = () => {
    triggerEncouragement();
  };

  return (
    <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-green-600 text-white rounded-2xl p-8 mb-8 overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-start gap-4 mb-4">
              {/* Teddy Assistant */}
              {state.isVisible && (
                <div className="animate-fade-in-up">
                  <TeddyAssistant
                    mood={state.currentMood}
                    message={state.currentMessage || undefined}
                    size="large"
                    onClick={handleTeddyClick}
                    className="shadow-2xl"
                  />
                </div>
              )}

              <h1 className="text-4xl lg:text-5xl font-bold leading-tight flex-1">
                {userName ? `Welcome back, ${userName}!` : 'Welcome to Your Study Space'}
                <br />
                <span className="bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent">
                  Learning Journey
                </span>
              </h1>
            </div>
            <p className="text-xl text-white/90 mb-6 max-w-2xl leading-relaxed">
              Transform your study habits with evidence-based cognitive psychology principles, 
              spaced repetition, and intelligent progress tracking designed for optimal learning outcomes.
            </p>
            
            {/* Key Features */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Spaced Repetition</div>
                  <div className="text-xs text-white/80">95% retention boost</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Smart Goals</div>
                  <div className="text-xs text-white/80">Adaptive planning</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Progress Tracking</div>
                  <div className="text-xs text-white/80">Visual analytics</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Focus Sessions</div>
                  <div className="text-xs text-white/80">Pomodoro technique</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
    </div>
  );
};