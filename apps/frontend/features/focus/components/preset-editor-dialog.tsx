'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Timer, Palette } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FocusPreset } from './focus-preset-card';
import { cn } from '@/lib/utils';

const presetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  focusDuration: z.number().min(1, 'Must be at least 1 minute').max(120, 'Maximum 120 minutes'),
  shortBreakDuration: z.number().min(1, 'Must be at least 1 minute').max(30, 'Maximum 30 minutes'),
  longBreakDuration: z.number().min(1, 'Must be at least 1 minute').max(60, 'Maximum 60 minutes'),
  sessionsBeforeLongBreak: z.number().min(2, 'Must be at least 2').max(10, 'Maximum 10'),
  color: z.enum(['blue', 'green', 'purple', 'orange', 'red']),
});

type PresetFormData = z.infer<typeof presetSchema>;

interface PresetEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset?: FocusPreset | null;
  onSave: (preset: Omit<FocusPreset, 'id' | 'isDefault'>) => void;
}

const colorOptions = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
] as const;

export function PresetEditorDialog({
  open,
  onOpenChange,
  preset,
  onSave,
}: PresetEditorDialogProps) {
  const form = useForm<PresetFormData>({
    resolver: zodResolver(presetSchema),
    defaultValues: {
      name: '',
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessionsBeforeLongBreak: 4,
      color: 'blue',
    },
  });

  // Reset form when preset changes
  useEffect(() => {
    if (preset) {
      form.reset({
        name: preset.name,
        focusDuration: preset.focusDuration,
        shortBreakDuration: preset.shortBreakDuration,
        longBreakDuration: preset.longBreakDuration,
        sessionsBeforeLongBreak: preset.sessionsBeforeLongBreak,
        color: preset.color,
      });
    } else {
      form.reset({
        name: '',
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        sessionsBeforeLongBreak: 4,
        color: 'blue',
      });
    }
  }, [preset, form]);

  const onSubmit = (data: PresetFormData) => {
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            {preset ? 'Edit Preset' : 'Create New Preset'}
          </DialogTitle>
          <DialogDescription>
            Customize your focus session timing to match your productivity style.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preset Name</FormLabel>
                  <FormControl>
                    <motion.div
                      whileFocus={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Input
                        placeholder="e.g., Deep Work, Study Session"
                        {...field}
                      />
                    </motion.div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duration Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="focusDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Focus Duration</FormLabel>
                    <FormControl>
                      <motion.div
                        whileFocus={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Input
                          type="number"
                          placeholder="25"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </motion.div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Minutes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shortBreakDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Break</FormLabel>
                    <FormControl>
                      <motion.div
                        whileFocus={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Input
                          type="number"
                          placeholder="5"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </motion.div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Minutes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="longBreakDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Long Break</FormLabel>
                    <FormControl>
                      <motion.div
                        whileFocus={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Input
                          type="number"
                          placeholder="15"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </motion.div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Minutes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sessionsBeforeLongBreak"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sessions to Long Break</FormLabel>
                    <FormControl>
                      <motion.div
                        whileFocus={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Input
                          type="number"
                          placeholder="4"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </motion.div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Count
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Color Selection */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Color Theme
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      {colorOptions.map((option) => (
                        <motion.button
                          key={option.value}
                          type="button"
                          onClick={() => field.onChange(option.value)}
                          className={cn(
                            'w-8 h-8 rounded-full border-2 transition-all duration-200',
                            option.class,
                            field.value === option.value
                              ? 'border-gray-900 dark:border-white scale-110'
                              : 'border-gray-300 dark:border-gray-600'
                          )}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          aria-label={option.label}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button type="submit">
                  {preset ? 'Update Preset' : 'Create Preset'}
                </Button>
              </motion.div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}