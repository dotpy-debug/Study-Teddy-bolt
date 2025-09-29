"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Clock,
  BookOpen,
  Target,
  Zap,
  CheckCircle,
  Loader2,
  Lightbulb,
  TrendingUp,
  Users,
  CalendarDays,
  ArrowRight
} from 'lucide-react';
import { OnboardingData } from '../onboarding-wizard';

interface WeekGeneratorStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip?: () => void;
}

const STUDY_INTENSITY_OPTIONS = [
  {
    value: 'light',
    label: 'Light',
    description: 'Gentle pace, more breaks',
    hoursPerDay: '2-3 hours',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Balanced approach',
    hoursPerDay: '4-5 hours',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  },
  {
    value: 'intensive',
    label: 'Intensive',
    description: 'High focus, maximum productivity',
    hoursPerDay: '6+ hours',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  }
];

const FOCUS_AREAS = [
  'Assignment completion',
  'Exam preparation',
  'Reading and note-taking',
  'Problem solving practice',
  'Research and writing',
  'Review and revision',
  'Skill development',
  'Project work'
];

export const WeekGeneratorStep = ({ data, updateData, onNext }: WeekGeneratorStepProps) => {
  const [startDate, setStartDate] = useState(
    data.weekGeneration?.startDate || new Date().toISOString().split('T')[0]
  );
  const [includedSubjects, setIncludedSubjects] = useState<string[]>(
    data.weekGeneration?.includedSubjects || data.subjects?.map(s => s.name) || []
  );
  const [focusAreas, setFocusAreas] = useState<string[]>(
    data.weekGeneration?.focusAreas || []
  );
  const [studyIntensity, setStudyIntensity] = useState<'light' | 'moderate' | 'intensive'>(
    data.weekGeneration?.studyIntensity || 'moderate'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedWeek, setGeneratedWeek] = useState<any>(null);

  const subjects = data.subjects || [];
  const goals = data.goals || [];
  const schedule = data.schedule;

  const handleSubjectToggle = (subjectName: string) => {
    setIncludedSubjects(prev =>
      prev.includes(subjectName)
        ? prev.filter(s => s !== subjectName)
        : [...prev, subjectName]
    );
  };

  const handleFocusAreaToggle = (area: string) => {
    setFocusAreas(prev =>
      prev.includes(area)
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const simulateWeekGeneration = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate progress steps
    const steps = [
      { progress: 20, message: 'Analyzing your subjects...' },
      { progress: 40, message: 'Processing your schedule preferences...' },
      { progress: 60, message: 'Incorporating your goals...' },
      { progress: 80, message: 'Optimizing study sessions...' },
      { progress: 100, message: 'Finalizing your week plan...' }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setGenerationProgress(step.progress);
    }

    // Generate a mock week structure
    const weekPlan = {
      totalStudyHours: includedSubjects.length * (studyIntensity === 'light' ? 6 : studyIntensity === 'moderate' ? 8 : 12),
      sessionsPerDay: studyIntensity === 'light' ? 2 : studyIntensity === 'moderate' ? 3 : 4,
      subjects: includedSubjects.map(subjectName => {
        const subject = subjects.find(s => s.name === subjectName);
        return {
          name: subjectName,
          color: subject?.color || '#6366F1',
          hoursAllocated: studyIntensity === 'light' ? 6 : studyIntensity === 'moderate' ? 8 : 12,
          sessions: studyIntensity === 'light' ? 4 : studyIntensity === 'moderate' ? 6 : 8
        };
      }),
      focusAreas: focusAreas,
      dailySchedule: [
        { day: 'Monday', sessions: 3, totalHours: 4.5 },
        { day: 'Tuesday', sessions: 3, totalHours: 4.5 },
        { day: 'Wednesday', sessions: 2, totalHours: 3 },
        { day: 'Thursday', sessions: 3, totalHours: 4.5 },
        { day: 'Friday', sessions: 3, totalHours: 4.5 },
        { day: 'Saturday', sessions: 2, totalHours: 3 },
        { day: 'Sunday', sessions: 1, totalHours: 1.5 }
      ]
    };

    setGeneratedWeek(weekPlan);
    setIsGenerating(false);
  };

  const handleGenerate = async () => {
    await simulateWeekGeneration();
  };

  const handleContinue = () => {
    updateData({
      weekGeneration: {
        startDate,
        includedSubjects,
        focusAreas,
        studyIntensity,
      },
    });
    onNext();
  };

  const selectedIntensity = STUDY_INTENSITY_OPTIONS.find(option => option.value === studyIntensity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      <div className="text-center mb-8">
        <Calendar className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Generate your first week
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Let's create a personalized study schedule for your first week. You can always adjust it later.
        </p>
      </div>

      {!generatedWeek ? (
        <div className="space-y-6">
          {/* Week Start Date */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CalendarDays className="h-5 w-5" />
                <span>Week Starting Date</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <Label htmlFor="startDate">Choose when to start your study plan</Label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Subject Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Select Subjects to Include</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subjects.map((subject, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Checkbox
                      id={`subject-${index}`}
                      checked={includedSubjects.includes(subject.name)}
                      onCheckedChange={() => handleSubjectToggle(subject.name)}
                    />
                    <div className="flex items-center space-x-2 flex-1">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: subject.color }}
                      />
                      <Label htmlFor={`subject-${index}`} className="font-medium">
                        {subject.name}
                      </Label>
                      <Badge className={`text-xs ${
                        subject.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        subject.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {subject.difficulty}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {includedSubjects.length === 0 && (
                <p className="text-sm text-red-500 mt-2">Please select at least one subject</p>
              )}
            </CardContent>
          </Card>

          {/* Study Intensity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Study Intensity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {STUDY_INTENSITY_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => setStudyIntensity(option.value as any)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      studyIntensity === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold">{option.label}</h4>
                          <Badge className={option.color}>
                            {option.hoursPerDay}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {option.description}
                        </p>
                      </div>
                      {studyIntensity === option.value && (
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Focus Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Focus Areas (Optional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select areas you want to prioritize this week
              </p>
              <div className="grid grid-cols-2 gap-3">
                {FOCUS_AREAS.map((area, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`focus-${index}`}
                      checked={focusAreas.includes(area)}
                      onCheckedChange={() => handleFocusAreaToggle(area)}
                    />
                    <Label htmlFor={`focus-${index}`} className="text-sm">
                      {area}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <div className="text-center">
            <Button
              onClick={handleGenerate}
              disabled={includedSubjects.length === 0 || isGenerating}
              size="lg"
              className="px-8"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating Your Week...
                </>
              ) : (
                <>
                  <Lightbulb className="h-5 w-5 mr-2" />
                  Generate My Week Plan
                </>
              )}
            </Button>
          </div>

          {/* Generation Progress */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Creating your personalized schedule</span>
                        <span className="text-sm text-gray-500">{generationProgress}%</span>
                      </div>
                      <Progress value={generationProgress} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Generated Week Preview */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Your Week Plan is Ready!
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Here's a preview of your personalized study schedule
            </p>
          </div>

          {/* Week Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Week Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{generatedWeek.totalStudyHours}h</div>
                  <div className="text-sm text-gray-500">Total Study Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{includedSubjects.length}</div>
                  <div className="text-sm text-gray-500">Subjects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{generatedWeek.sessionsPerDay}</div>
                  <div className="text-sm text-gray-500">Avg Sessions/Day</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{selectedIntensity?.label}</div>
                  <div className="text-sm text-gray-500">Intensity</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subject Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Subject Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {generatedWeek.subjects.map((subject: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: subject.color }}
                      />
                      <span className="font-medium">{subject.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{subject.hoursAllocated}h</div>
                      <div className="text-sm text-gray-500">{subject.sessions} sessions</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Schedule Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Schedule Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {generatedWeek.dailySchedule.map((day: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                    <span className="font-medium">{day.day}</span>
                    <div className="flex items-center space-x-4 text-sm">
                      <span>{day.sessions} sessions</span>
                      <span className="text-gray-500">{day.totalHours}h</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setGeneratedWeek(null);
                setGenerationProgress(0);
              }}
            >
              Generate Different Plan
            </Button>
            <Button onClick={handleContinue} className="px-8">
              Complete Setup
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Planning Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4"
      >
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
          <TrendingUp className="h-4 w-4 mr-2" />
          Week Planning Tips
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
          <li>• Start with a manageable intensity - you can always increase it later</li>
          <li>• Include all your subjects for balanced progress</li>
          <li>• Focus areas help prioritize what's most important this week</li>
          <li>• Your schedule adapts to your availability preferences</li>
        </ul>
      </motion.div>
    </motion.div>
  );
};