"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Clock,
  Calendar,
  Coffee,
  Brain,
  Sun,
  Moon,
  Sunset,
  Plus,
  X,
  AlertCircle
} from 'lucide-react';
import { OnboardingData } from '../onboarding-wizard';

const scheduleSchema = z.object({
  dailyStudyHours: z.number().min(1, 'At least 1 hour per day').max(16, 'Maximum 16 hours per day'),
  weeklyStudyHours: z.number().min(7, 'At least 7 hours per week').max(80, 'Maximum 80 hours per week'),
  breakDuration: z.number().min(5, 'At least 5 minutes').max(60, 'Maximum 60 minutes'),
  focusSessionLength: z.number().min(15, 'At least 15 minutes').max(180, 'Maximum 180 minutes'),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface ScheduleSetupStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip?: () => void;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00`, label: `${hour}:00` };
});

interface TimeSlot {
  start: string;
  end: string;
}

export const ScheduleSetupStep = ({ data, updateData, onNext, onSkip }: ScheduleSetupStepProps) => {
  const [availability, setAvailability] = useState<{ [key: string]: TimeSlot[] }>(
    data.schedule?.availability || {}
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      dailyStudyHours: data.schedule?.studyHours?.daily || 4,
      weeklyStudyHours: data.schedule?.studyHours?.weekly || 28,
      breakDuration: data.schedule?.breakDuration || 15,
      focusSessionLength: data.schedule?.focusSessionLength || 50,
    },
    mode: 'onChange'
  });

  const dailyHours = watch('dailyStudyHours');
  const weeklyHours = watch('weeklyStudyHours');
  const breakDuration = watch('breakDuration');
  const focusSession = watch('focusSessionLength');

  const addTimeSlot = (day: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), { start: '09:00', end: '12:00' }]
    }));
  };

  const removeTimeSlot = (day: string, index: number) => {
    setAvailability(prev => ({
      ...prev,
      [day]: prev[day]?.filter((_, i) => i !== index) || []
    }));
  };

  const updateTimeSlot = (day: string, index: number, field: 'start' | 'end', value: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: prev[day]?.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      ) || []
    }));
  };

  const getTimeIcon = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 6 && hour < 12) return Sun;
    if (hour >= 12 && hour < 18) return Sun;
    if (hour >= 18 && hour < 22) return Sunset;
    return Moon;
  };

  const onSubmit = (formData: ScheduleFormData) => {
    updateData({
      schedule: {
        studyHours: {
          daily: formData.dailyStudyHours,
          weekly: formData.weeklyStudyHours,
        },
        availability,
        breakDuration: formData.breakDuration,
        focusSessionLength: formData.focusSessionLength,
      },
    });
    onNext();
  };

  const handleSkip = () => {
    // Set reasonable defaults
    updateData({
      schedule: {
        studyHours: {
          daily: 4,
          weekly: 28,
        },
        availability: {
          monday: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }],
          tuesday: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }],
          wednesday: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }],
          thursday: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }],
          friday: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }],
        },
        breakDuration: 15,
        focusSessionLength: 50,
      },
    });
    onSkip?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      <div className="text-center mb-8">
        <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Set up your study schedule
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Tell us when you're available to study so we can create the perfect schedule for you
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Study Hours Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Study Hours Preference</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Daily Study Hours: {dailyHours} hours</Label>
                <div className="mt-2">
                  <Slider
                    value={[dailyHours]}
                    onValueChange={(value) => setValue('dailyStudyHours', value[0])}
                    min={1}
                    max={12}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1h</span>
                    <span>12h</span>
                  </div>
                </div>
                {errors.dailyStudyHours && (
                  <p className="text-sm text-red-500 mt-1">{errors.dailyStudyHours.message}</p>
                )}
              </div>

              <div>
                <Label>Weekly Study Hours: {weeklyHours} hours</Label>
                <div className="mt-2">
                  <Slider
                    value={[weeklyHours]}
                    onValueChange={(value) => setValue('weeklyStudyHours', value[0])}
                    min={7}
                    max={70}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>7h</span>
                    <span>70h</span>
                  </div>
                </div>
                {errors.weeklyStudyHours && (
                  <p className="text-sm text-red-500 mt-1">{errors.weeklyStudyHours.message}</p>
                )}
              </div>
            </div>

            {weeklyHours < dailyHours * 7 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
              >
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-700 dark:text-yellow-300">
                  Weekly hours should be at least {dailyHours * 7} hours based on your daily target
                </span>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Focus Session Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Coffee className="h-5 w-5" />
              <span>Focus & Break Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Focus Session Length: {focusSession} minutes</Label>
                <div className="mt-2">
                  <Slider
                    value={[focusSession]}
                    onValueChange={(value) => setValue('focusSessionLength', value[0])}
                    min={15}
                    max={120}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>15min</span>
                    <span>2h</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 25-50 minutes (Pomodoro technique)
                </p>
              </div>

              <div>
                <Label>Break Duration: {breakDuration} minutes</Label>
                <div className="mt-2">
                  <Slider
                    value={[breakDuration]}
                    onValueChange={(value) => setValue('breakDuration', value[0])}
                    min={5}
                    max={30}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>5min</span>
                    <span>30min</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Availability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Weekly Availability (Optional)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Set your preferred study times for each day. This helps us create a personalized schedule.
            </p>

            <div className="space-y-4">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{day.label}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addTimeSlot(day.key)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Time
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {availability[day.key]?.map((slot, index) => {
                      const StartIcon = getTimeIcon(slot.start);
                      const EndIcon = getTimeIcon(slot.end);

                      return (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2 flex-1">
                            <StartIcon className="h-4 w-4 text-gray-400" />
                            <Select
                              value={slot.start}
                              onValueChange={(value) => updateTimeSlot(day.key, index, 'start', value)}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_SLOTS.map((time) => (
                                  <SelectItem key={time.value} value={time.value}>
                                    {time.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <span className="text-gray-400">to</span>

                            <EndIcon className="h-4 w-4 text-gray-400" />
                            <Select
                              value={slot.end}
                              onValueChange={(value) => updateTimeSlot(day.key, index, 'end', value)}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_SLOTS.map((time) => (
                                  <SelectItem key={time.value} value={time.value}>
                                    {time.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTimeSlot(day.key, index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}

                    {!availability[day.key]?.length && (
                      <p className="text-sm text-gray-500 italic">No study times set for this day</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={handleSkip}>
            Skip this step
          </Button>
          <Button type="submit" disabled={!isValid} className="px-8">
            Continue to Goals
          </Button>
        </div>
      </form>

      {/* Study Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4"
      >
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Study Schedule Tips
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
          <li>• Consistency is key - try to study at the same times each day</li>
          <li>• Break longer study sessions into focused chunks with breaks</li>
          <li>• Consider your natural energy levels when scheduling</li>
          <li>• Leave buffer time between sessions for transitions</li>
        </ul>
      </motion.div>
    </motion.div>
  );
};