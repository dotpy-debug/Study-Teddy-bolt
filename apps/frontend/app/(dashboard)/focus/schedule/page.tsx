'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDays, format, isBefore, isToday } from 'date-fns';
import { CalendarDays, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/contexts/notification-context';
import { FocusPreset } from '../../../features/focus/components/focus-preset-card';
import { cn } from '@/lib/utils';

const scheduleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  date: z.date({
    required_error: 'Please select a date',
  }),
  time: z.string().min(1, 'Please select a time'),
  duration: z.number().min(15, 'Minimum 15 minutes').max(240, 'Maximum 4 hours'),
  presetId: z.string().optional(),
  taskId: z.string().optional(),
  subjectId: z.string().optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
  reminderMinutes: z.number().min(0).max(1440).optional(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

// Mock data - replace with real API calls
const defaultPresets: FocusPreset[] = [
  {
    id: '1',
    name: 'Pomodoro Classic',
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    color: 'blue',
    isDefault: true,
  },
  {
    id: '2',
    name: 'Deep Work',
    focusDuration: 90,
    shortBreakDuration: 20,
    longBreakDuration: 30,
    sessionsBeforeLongBreak: 2,
    color: 'purple',
  },
];

const timeSlots = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30',
];

const reminderOptions = [
  { value: 0, label: 'No reminder' },
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

export default function ScheduleFocusPage() {
  const { showSuccess, showError } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      title: '',
      duration: 25,
      reminderMinutes: 15,
      notes: '',
    },
  });

  const selectedDate = form.watch('date');
  const selectedTime = form.watch('time');
  const selectedDuration = form.watch('duration');

  // Check for conflicts when date, time, or duration changes
  React.useEffect(() => {
    if (selectedDate && selectedTime && selectedDuration) {
      // Simulate conflict detection
      const mockConflicts: string[] = [];

      // Example: conflict if scheduling during typical meal times
      const hour = parseInt(selectedTime.split(':')[0]);
      if ((hour >= 12 && hour <= 13) || (hour >= 18 && hour <= 19)) {
        mockConflicts.push(`Conflicts with typical meal time (${selectedTime})`);
      }

      // Example: conflict if scheduling too late
      if (hour >= 22) {
        mockConflicts.push('Late evening session may affect sleep');
      }

      setConflicts(mockConflicts);
    }
  }, [selectedDate, selectedTime, selectedDuration]);

  const onSubmit = async (data: ScheduleFormData) => {
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Scheduling focus session:', data);

      showSuccess(
        `Focus session "${data.title}" scheduled for ${format(data.date, 'MMM dd')} at ${data.time}`,
        'Session Scheduled!'
      );

      // Reset form
      form.reset();
      setConflicts([]);

    } catch (error) {
      showError('Failed to schedule focus session. Please try again.', 'Scheduling Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Schedule Focus Session
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Plan your focused work time in advance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Session Details
              </CardTitle>
            </CardHeader>

            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Title</FormLabel>
                        <FormControl>
                          <motion.div
                            whileFocus={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Input
                              placeholder="e.g., Math Study Session, Project Work"
                              {...field}
                            />
                          </motion.div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date and Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP')
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  isBefore(date, new Date()) && !isToday(date)
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60">
                              {timeSlots.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Duration and Preset */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (minutes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="25"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="presetId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preset (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose preset" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {defaultPresets.map((preset) => (
                                <SelectItem key={preset.id} value={preset.id}>
                                  {preset.name} ({preset.focusDuration}min)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Reminder */}
                  <FormField
                    control={form.control}
                    name="reminderMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reminder</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Set reminder" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {reminderOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any notes about this session..."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Add goals, materials needed, or other reminders
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <motion.div
                          className="h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      {isSubmitting ? 'Scheduling...' : 'Schedule Session'}
                    </Button>
                  </motion.div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Preview and Conflicts */}
        <div className="space-y-6">
          {/* Session Preview */}
          {selectedDate && selectedTime && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Session Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {selectedTime} ({selectedDuration} minutes)
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Conflicts */}
          {conflicts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-orange-200 dark:border-orange-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <AlertTriangle className="h-5 w-5" />
                    Potential Conflicts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {conflicts.map((conflict, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Badge variant="secondary" className="w-full justify-start text-xs p-2">
                          {conflict}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>• Schedule sessions during your peak energy hours</p>
              <p>• Leave buffer time between sessions</p>
              <p>• Set realistic durations for better consistency</p>
              <p>• Use reminders to stay on track</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}