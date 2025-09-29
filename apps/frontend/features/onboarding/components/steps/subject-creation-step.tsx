"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Plus,
  X,
  Edit,
  Palette,
  Star,
  Calculator,
  Atom,
  Globe,
  Microscope,
  Languages,
  PenTool,
  Music,
  Gamepad2,
  Heart
} from 'lucide-react';
import { OnboardingData } from '../onboarding-wizard';

const subjectSchema = z.object({
  name: z.string().min(2, 'Subject name must be at least 2 characters').max(50, 'Subject name too long'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  icon: z.string().optional(),
  description: z.string().max(200, 'Description too long').optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  credits: z.number().min(0).max(20).optional(),
  instructor: z.string().max(50, 'Instructor name too long').optional(),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

interface SubjectCreationStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip?: () => void;
}

const DEFAULT_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#06B6D4', '#84CC16',
  '#F97316', '#64748B', '#DC2626', '#7C3AED'
];

const SUBJECT_ICONS = [
  { value: 'Calculator', icon: Calculator, label: 'Math' },
  { value: 'Atom', icon: Atom, label: 'Science' },
  { value: 'Globe', icon: Globe, label: 'Geography' },
  { value: 'Microscope', icon: Microscope, label: 'Biology' },
  { value: 'Languages', icon: Languages, label: 'Languages' },
  { value: 'PenTool', icon: PenTool, label: 'Art' },
  { value: 'Music', icon: Music, label: 'Music' },
  { value: 'BookOpen', icon: BookOpen, label: 'Literature' },
  { value: 'Gamepad2', icon: Gamepad2, label: 'Computer Science' },
  { value: 'Heart', icon: Heart, label: 'Health' },
];

const COMMON_SUBJECTS = [
  { name: 'Mathematics', color: '#6366F1', icon: 'Calculator', difficulty: 'medium' as const },
  { name: 'English Literature', color: '#8B5CF6', icon: 'BookOpen', difficulty: 'medium' as const },
  { name: 'Physics', color: '#EC4899', icon: 'Atom', difficulty: 'hard' as const },
  { name: 'Chemistry', color: '#EF4444', icon: 'Microscope', difficulty: 'hard' as const },
  { name: 'Biology', color: '#10B981', icon: 'Microscope', difficulty: 'medium' as const },
  { name: 'History', color: '#F59E0B', icon: 'Globe', difficulty: 'easy' as const },
  { name: 'Computer Science', color: '#06B6D4', icon: 'Gamepad2', difficulty: 'hard' as const },
  { name: 'Spanish', color: '#84CC16', icon: 'Languages', difficulty: 'medium' as const },
];

export const SubjectCreationStep = ({ data, updateData, onNext }: SubjectCreationStepProps) => {
  const [subjects, setSubjects] = useState(data.subjects || []);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: '',
      color: DEFAULT_COLORS[0],
      icon: '',
      description: '',
      difficulty: 'medium',
      credits: undefined,
      instructor: '',
    }
  });

  const selectedColor = watch('color');
  const selectedIcon = watch('icon');

  const addSubject = (formData: SubjectFormData) => {
    const newSubject = {
      ...formData,
      credits: formData.credits || undefined,
    };

    if (isEditing !== null) {
      const updatedSubjects = [...subjects];
      updatedSubjects[isEditing] = newSubject;
      setSubjects(updatedSubjects);
      setIsEditing(null);
    } else {
      setSubjects([...subjects, newSubject]);
    }

    reset();
    setShowForm(false);
  };

  const editSubject = (index: number) => {
    const subject = subjects[index];
    setValue('name', subject.name);
    setValue('color', subject.color);
    setValue('icon', subject.icon || '');
    setValue('description', subject.description || '');
    setValue('difficulty', subject.difficulty);
    setValue('credits', subject.credits || undefined);
    setValue('instructor', subject.instructor || '');
    setIsEditing(index);
    setShowForm(true);
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const addCommonSubject = (commonSubject: typeof COMMON_SUBJECTS[0]) => {
    const newSubject = {
      ...commonSubject,
      description: '',
      credits: undefined,
      instructor: '',
    };
    setSubjects([...subjects, newSubject]);
  };

  const handleContinue = () => {
    updateData({ subjects });
    onNext();
  };

  const cancelEditing = () => {
    setIsEditing(null);
    setShowForm(false);
    reset();
  };

  const getIconComponent = (iconName: string) => {
    const iconData = SUBJECT_ICONS.find(icon => icon.value === iconName);
    return iconData ? iconData.icon : BookOpen;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      <div className="text-center mb-8">
        <BookOpen className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Add your subjects
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Add 3-5 subjects you're currently studying. You can always modify these later.
        </p>
      </div>

      {/* Quick Add Common Subjects */}
      {subjects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Add Common Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {COMMON_SUBJECTS.map((subject, index) => {
                  const IconComponent = getIconComponent(subject.icon);
                  return (
                    <button
                      key={index}
                      onClick={() => addCommonSubject(subject)}
                      className="p-3 border rounded-lg hover:shadow-md transition-all text-left hover:border-blue-300"
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: subject.color + '20' }}
                        >
                          <IconComponent className="h-4 w-4" style={{ color: subject.color }} />
                        </div>
                        <span className="font-medium text-sm">{subject.name}</span>
                      </div>
                      <Badge className={`text-xs ${getDifficultyColor(subject.difficulty)}`}>
                        {subject.difficulty}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Current Subjects */}
      {subjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Subjects ({subjects.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {subjects.map((subject, index) => {
                  const IconComponent = getIconComponent(subject.icon || 'BookOpen');
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: subject.color + '20' }}
                        >
                          <IconComponent className="h-5 w-5" style={{ color: subject.color }} />
                        </div>
                        <div>
                          <h4 className="font-semibold">{subject.name}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={`text-xs ${getDifficultyColor(subject.difficulty)}`}>
                              {subject.difficulty}
                            </Badge>
                            {subject.credits && (
                              <span className="text-xs text-gray-500">
                                {subject.credits} credits
                              </span>
                            )}
                            {subject.instructor && (
                              <span className="text-xs text-gray-500">
                                {subject.instructor}
                              </span>
                            )}
                          </div>
                          {subject.description && (
                            <p className="text-xs text-gray-600 mt-1">{subject.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editSubject(index)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSubject(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Add Subject Button */}
      {!showForm && (
        <div className="text-center">
          <Button
            onClick={() => setShowForm(true)}
            variant="outline"
            size="lg"
            className="border-dashed border-2"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add {subjects.length === 0 ? 'Your First' : 'Another'} Subject
          </Button>
        </div>
      )}

      {/* Subject Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {isEditing !== null ? 'Edit Subject' : 'Add New Subject'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(addSubject)} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Subject Name *</Label>
                      <Input
                        id="name"
                        {...register('name')}
                        placeholder="e.g., Mathematics, Physics"
                      />
                      {errors.name && (
                        <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="difficulty">Difficulty Level *</Label>
                      <Select
                        value={watch('difficulty')}
                        onValueChange={(value) => setValue('difficulty', value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Description (optional)</Label>
                    <Textarea
                      {...register('description')}
                      placeholder="Brief description of the subject"
                      rows={2}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="instructor">Instructor (optional)</Label>
                      <Input
                        id="instructor"
                        {...register('instructor')}
                        placeholder="Professor/Teacher name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="credits">Credits (optional)</Label>
                      <Input
                        id="credits"
                        type="number"
                        min="0"
                        max="20"
                        {...register('credits', { valueAsNumber: true })}
                        placeholder="3"
                      />
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div>
                    <Label>Color</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <div
                        className="w-8 h-8 rounded-lg border-2 border-gray-300"
                        style={{ backgroundColor: selectedColor }}
                      />
                      <div className="grid grid-cols-6 gap-2">
                        {DEFAULT_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-6 h-6 rounded-md border-2 transition-all ${
                              selectedColor === color ? 'border-gray-800 scale-110' : 'border-gray-300 hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setValue('color', color)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Icon Selection */}
                  <div>
                    <Label>Icon (optional)</Label>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {SUBJECT_ICONS.map((iconData) => {
                        const IconComponent = iconData.icon;
                        return (
                          <button
                            key={iconData.value}
                            type="button"
                            onClick={() => setValue('icon', iconData.value)}
                            className={`p-2 rounded-lg border transition-all ${
                              selectedIcon === iconData.value
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <IconComponent className="h-5 w-5 mx-auto" />
                            <span className="text-xs mt-1 block">{iconData.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={cancelEditing}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {isEditing !== null ? 'Update Subject' : 'Add Subject'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue Button */}
      {subjects.length >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex justify-between items-center"
        >
          <div className="text-sm text-gray-500">
            Great! You have {subjects.length} subjects. You can add more anytime.
          </div>
          <Button onClick={handleContinue} className="px-8">
            Continue to Schedule Setup
          </Button>
        </motion.div>
      )}

      {subjects.length > 0 && subjects.length < 3 && (
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Add at least {3 - subjects.length} more subject{3 - subjects.length > 1 ? 's' : ''} to continue
          </p>
        </div>
      )}
    </motion.div>
  );
};