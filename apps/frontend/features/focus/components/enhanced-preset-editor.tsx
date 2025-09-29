'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Timer, Palette, Tag, FileText, Bookmark, X } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { FocusPreset, PresetCategory, PresetColor, PRESET_CATEGORIES } from '../types/preset';
import { cn } from '@/lib/utils';

const enhancedPresetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  description: z.string().max(200, 'Description too long').optional(),
  focusDuration: z.number().min(1, 'Must be at least 1 minute').max(120, 'Maximum 120 minutes'),
  shortBreakDuration: z.number().min(1, 'Must be at least 1 minute').max(30, 'Maximum 30 minutes'),
  longBreakDuration: z.number().min(1, 'Must be at least 1 minute').max(60, 'Maximum 60 minutes'),
  sessionsBeforeLongBreak: z.number().min(2, 'Must be at least 2').max(10, 'Maximum 10'),
  color: z.enum(['blue', 'green', 'purple', 'orange', 'red']),
  category: z.enum(['Study', 'Work', 'Creative', 'Personal', 'Other']),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
});

type EnhancedPresetFormData = z.infer<typeof enhancedPresetSchema>;

interface EnhancedPresetEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset?: FocusPreset | null;
  onSave: (preset: Omit<FocusPreset, 'id' | 'isDefault' | 'createdAt' | 'updatedAt' | 'usageCount' | 'lastUsedAt'>) => void;
}

const colorOptions = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
] as const;

const commonTags = [
  'Productivity', 'Study', 'Work', 'Creative', 'Focus', 'Deep Work',
  'Pomodoro', 'Quick', 'Marathon', 'Flow', 'Learning', 'Writing',
  'Coding', 'Design', 'Research', 'Planning'
];

export function EnhancedPresetEditor({
  open,
  onOpenChange,
  preset,
  onSave,
}: EnhancedPresetEditorProps) {
  const [tagInput, setTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState(commonTags);

  const form = useForm<EnhancedPresetFormData>({
    resolver: zodResolver(enhancedPresetSchema),
    defaultValues: {
      name: '',
      description: '',
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessionsBeforeLongBreak: 4,
      color: 'blue',
      category: 'Study',
      tags: [],
      isFavorite: false,
    },
  });

  // Reset form when preset changes
  useEffect(() => {
    if (preset) {
      form.reset({
        name: preset.name,
        description: preset.description || '',
        focusDuration: preset.focusDuration,
        shortBreakDuration: preset.shortBreakDuration,
        longBreakDuration: preset.longBreakDuration,
        sessionsBeforeLongBreak: preset.sessionsBeforeLongBreak,
        color: preset.color,
        category: preset.category,
        tags: preset.tags || [],
        isFavorite: preset.isFavorite || false,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        sessionsBeforeLongBreak: 4,
        color: 'blue',
        category: 'Study',
        tags: [],
        isFavorite: false,
      });
    }
  }, [preset, form]);

  const onSubmit = (data: EnhancedPresetFormData) => {
    onSave(data);
    onOpenChange(false);
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !form.getValues('tags')?.includes(trimmedTag)) {
      const currentTags = form.getValues('tags') || [];
      form.setValue('tags', [...currentTags, trimmedTag]);
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            {preset ? 'Edit Preset' : 'Create New Preset'}
          </DialogTitle>
          <DialogDescription>
            {preset
              ? 'Modify your focus session preset to better suit your needs.'
              : 'Create a custom focus session preset tailored to your productivity style.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>

              {/* Name and Favorite */}
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-1">
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

                <FormField
                  control={form.control}
                  name="isFavorite"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-end">
                      <FormLabel className="flex items-center gap-2">
                        <Bookmark className="h-4 w-4" />
                        Favorite
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Description (Optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what this preset is best used for..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Help yourself remember when to use this preset
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category and Color */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRESET_CATEGORIES.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                        <div className="flex gap-2 p-2 border rounded-md">
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
              </div>
            </div>

            {/* Timing Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Timing Settings</h3>

              {/* Focus and Short Break */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="focusDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Focus Duration</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="25"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                            min
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Time to focus before a break
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
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="5"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                            min
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Regular break duration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Long Break Settings */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="longBreakDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Long Break</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="15"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                            min
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Extended break duration
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
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="4"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                            sessions
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Focus sessions before long break
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tags (Optional)
              </h3>

              {/* Current Tags */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Tags</FormLabel>
                    <div className="min-h-[2.5rem] p-3 border rounded-md">
                      <AnimatePresence>
                        {field.value && field.value.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {field.value.map((tag, index) => (
                              <motion.div
                                key={tag}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                              >
                                <Badge
                                  variant="secondary"
                                  className="flex items-center gap-1 pr-1"
                                >
                                  {tag}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 hover:bg-red-100"
                                    onClick={() => removeTag(tag)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </Badge>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No tags added yet</p>
                        )}
                      </AnimatePresence>
                    </div>
                  </FormItem>
                )}
              />

              {/* Add Tags */}
              <div className="space-y-2">
                <Label>Add Tags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type tag and press Enter..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addTag(tagInput)}
                    disabled={!tagInput.trim()}
                  >
                    Add
                  </Button>
                </div>

                {/* Suggested Tags */}
                <div className="flex flex-wrap gap-1">
                  {commonTags
                    .filter(tag => !form.getValues('tags')?.includes(tag))
                    .slice(0, 8)
                    .map(tag => (
                      <Button
                        key={tag}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => addTag(tag)}
                      >
                        + {tag}
                      </Button>
                    ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
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