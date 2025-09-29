'use client';

import React from 'react';
import { useTeddy } from '@/contexts/teddy-context';
import { TeddyMoodSelector } from './TeddyAssistant';
import { personalityPresets } from './teddy-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Settings2, Eye, EyeOff, RefreshCw } from 'lucide-react';

export function TeddySettings() {
  const {
    state,
    setPersonalityType,
    toggleVisibility,
    resetTeddy,
    setMood,
    triggerCelebration,
    triggerEncouragement
  } = useTeddy();

  const handlePersonalityChange = (value: string) => {
    setPersonalityType(value as 'cheerleader' | 'coach' | 'friend');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Teddy Personality
          </CardTitle>
          <CardDescription>
            Choose how Study Teddy interacts with you during study sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={state.personalityType}
            onValueChange={handlePersonalityChange}
          >
            {Object.entries(personalityPresets).slice(0, 3).map(([key, personality]) => (
              <div key={key} className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value={key} id={key} />
                <Label htmlFor={key} className="cursor-pointer">
                  <div className="font-medium">{personality.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {personality.description}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Teddy Settings
          </CardTitle>
          <CardDescription>
            Customize your Study Teddy experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="visibility">Show Teddy</Label>
              <p className="text-sm text-muted-foreground">
                Display Teddy on your dashboard
              </p>
            </div>
            <Switch
              id="visibility"
              checked={state.isVisible}
              onCheckedChange={toggleVisibility}
            />
          </div>

          <div className="space-y-2">
            <Label>Current Mood</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Test different Teddy moods and expressions
            </p>
            <TeddyMoodSelector
              currentMood={state.currentMood}
              onMoodChange={setMood}
            />
          </div>

          <div className="space-y-2">
            <Label>Test Interactions</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Trigger different Teddy responses
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerCelebration('Test achievement unlocked')}
              >
                🎉 Celebration
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerEncouragement()}
              >
                💪 Encouragement
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMood('thinking', 'Processing your request...')}
              >
                🤔 Thinking
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMood('concerned', 'You\'ve been studying for a while!')}
              >
                😟 Concerned
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={resetTeddy}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Teddy
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teddy Stats</CardTitle>
          <CardDescription>
            Your interaction history with Study Teddy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Interactions</p>
              <p className="text-2xl font-bold">{state.interactionCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Study Streak</p>
              <p className="text-2xl font-bold">{state.studyStreak} days</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Personality</p>
              <p className="text-lg font-medium capitalize">{state.personalityType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Interaction</p>
              <p className="text-lg font-medium">
                {state.lastInteraction
                  ? new Date(state.lastInteraction).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}