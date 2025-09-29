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
  Target,
  Plus,
  X,
  Edit,
  Calendar,
  Trophy,
  BookOpen,
  User,
  Briefcase,
  Star,
  Clock,
  ChevronRight
} from 'lucide-react';
import { OnboardingData } from '../onboarding-wizard';

const goalSchema = z.object({
  title: z.string().min(3, 'Goal title must be at least 3 characters').max(100, 'Title too long'),
  description: z.string().max(300, 'Description too long').optional(),
  type: z.enum(['academic', 'personal', 'career']),
  priority: z.enum(['low', 'medium', 'high']),
  deadline: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalSettingStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip?: () => void;
}

const GOAL_TYPES = [
  { value: 'academic', label: 'Academic', icon: BookOpen, description: 'Study and learning related goals' },
  { value: 'personal', label: 'Personal', icon: User, description: 'Personal development and skills' },
  { value: 'career', label: 'Career', icon: Briefcase, description: 'Professional and career objectives' },
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low Priority', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  { value: 'medium', label: 'Medium Priority', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'high', label: 'High Priority', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
];

const SUGGESTED_GOALS = [
  {
    title: 'Improve GPA to 3.5+',
    type: 'academic' as const,
    priority: 'high' as const,
    description: 'Focus on consistent study habits and better test preparation'
  },
  {
    title: 'Complete all assignments on time',
    type: 'academic' as const,
    priority: 'medium' as const,
    description: 'Develop better time management and planning skills'
  },
  {
    title: 'Learn a new programming language',
    type: 'personal' as const,
    priority: 'medium' as const,
    description: 'Expand technical skills for personal and professional growth'
  },
  {
    title: 'Build a strong academic portfolio',
    type: 'career' as const,
    priority: 'high' as const,
    description: 'Create projects and achievements for future career opportunities'
  },
  {
    title: 'Develop better study habits',
    type: 'personal' as const,
    priority: 'high' as const,
    description: 'Create consistent daily routines for more effective learning'
  },
  {
    title: 'Prepare for graduate school',
    type: 'career' as const,
    priority: 'medium' as const,
    description: 'Research programs, prepare applications, and build qualifications'
  },
];

export const GoalSettingStep = ({ data, updateData, onNext, onSkip }: GoalSettingStepProps) => {
  const [goals, setGoals] = useState(data.goals || []);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'academic',
      priority: 'medium',
      deadline: '',
    }
  });

  const selectedType = watch('type');
  const selectedPriority = watch('priority');

  const addGoal = (formData: GoalFormData) => {
    const newGoal = {
      ...formData,
      deadline: formData.deadline || undefined,
    };

    if (isEditing !== null) {
      const updatedGoals = [...goals];
      updatedGoals[isEditing] = newGoal;
      setGoals(updatedGoals);
      setIsEditing(null);
    } else {
      setGoals([...goals, newGoal]);
    }

    reset();
    setShowForm(false);
  };

  const editGoal = (index: number) => {
    const goal = goals[index];
    setValue('title', goal.title);
    setValue('description', goal.description || '');
    setValue('type', goal.type);
    setValue('priority', goal.priority);
    setValue('deadline', goal.deadline || '');
    setIsEditing(index);
    setShowForm(true);
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const addSuggestedGoal = (suggestedGoal: typeof SUGGESTED_GOALS[0]) => {
    setGoals([...goals, suggestedGoal]);
  };

  const handleContinue = () => {
    updateData({ goals });
    onNext();
  };

  const handleSkip = () => {
    // Set some default goals
    updateData({
      goals: [
        {
          title: 'Improve study consistency',
          description: 'Maintain regular study habits and complete assignments on time',
          type: 'academic' as const,
          priority: 'high' as const,
        },
        {
          title: 'Achieve academic targets',
          description: 'Work towards better grades and understanding of course material',
          type: 'academic' as const,
          priority: 'medium' as const,
        },
      ],
    });
    onSkip?.();
  };

  const cancelEditing = () => {
    setIsEditing(null);
    setShowForm(false);
    reset();
  };

  const getTypeIcon = (type: string) => {
    const typeData = GOAL_TYPES.find(t => t.value === type);
    return typeData ? typeData.icon : Target;
  };

  const getPriorityColor = (priority: string) => {
    const priorityData = PRIORITY_LEVELS.find(p => p.value === priority);
    return priorityData ? priorityData.color : 'bg-gray-100 text-gray-800';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      <div className="text-center mb-8">
        <Target className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Set your goals
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Define what you want to achieve. Goals help us create focused study plans that align with your objectives.
        </p>
      </div>

      {/* Suggested Goals */}
      {goals.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Start with Suggested Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {SUGGESTED_GOALS.map((goal, index) => {
                  const TypeIcon = getTypeIcon(goal.type);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-all"
                    >
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex items-center space-x-2">
                          <TypeIcon className="h-5 w-5 text-blue-500" />
                          <Badge className={`text-xs ${getPriorityColor(goal.priority)}`}>
                            {goal.priority}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{goal.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {goal.description}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addSuggestedGoal(goal)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Current Goals */}
      {goals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Goals ({goals.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {goals.map((goal, index) => {
                  const TypeIcon = getTypeIcon(goal.type);
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-start justify-between p-4 border rounded-lg hover:shadow-md transition-all"
                    >
                      <div className="flex items-start space-x-3 flex-1">
                        <TypeIcon className="h-5 w-5 text-blue-500 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold">{goal.title}</h4>
                            <Badge className={`text-xs ${getPriorityColor(goal.priority)}`}>
                              {goal.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {goal.type}
                            </Badge>
                          </div>
                          {goal.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {goal.description}
                            </p>
                          )}
                          {goal.deadline && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              <span>Due: {new Date(goal.deadline).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editGoal(index)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGoal(index)}
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

      {/* Add Goal Button */}
      {!showForm && (
        <div className="text-center">
          <Button
            onClick={() => setShowForm(true)}
            variant="outline"
            size="lg"
            className="border-dashed border-2"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add {goals.length === 0 ? 'Your First' : 'Another'} Goal
          </Button>
        </div>
      )}

      {/* Goal Form */}
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
                  {isEditing !== null ? 'Edit Goal' : 'Add New Goal'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(addGoal)} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Goal Title *</Label>
                    <Input
                      id="title"
                      {...register('title')}
                      placeholder="e.g., Improve my GPA to 3.5"
                    />
                    {errors.title && (
                      <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      {...register('description')}
                      placeholder="Describe what you want to achieve and why it's important to you"
                      rows={3}
                    />
                    {errors.description && (
                      <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Goal Type *</Label>
                      <Select
                        value={selectedType}
                        onValueChange={(value) => setValue('type', value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select goal type" />
                        </SelectTrigger>
                        <SelectContent>
                          {GOAL_TYPES.map((type) => {
                            const IconComponent = type.icon;
                            return (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center space-x-2">
                                  <IconComponent className="h-4 w-4" />
                                  <div>
                                    <div>{type.label}</div>
                                    <div className="text-xs text-gray-500">{type.description}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Priority Level *</Label>
                      <Select
                        value={selectedPriority}
                        onValueChange={(value) => setValue('priority', value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_LEVELS.map((priority) => (
                            <SelectItem key={priority.value} value={priority.value}>
                              <div className="flex items-center space-x-2">
                                <Star className="h-4 w-4" />
                                <span>{priority.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="deadline">Target Deadline (optional)</Label>
                    <Input
                      id="deadline"
                      type="date"
                      {...register('deadline')}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={cancelEditing}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {isEditing !== null ? 'Update Goal' : 'Add Goal'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={handleSkip}>
          Skip this step
        </Button>

        <Button onClick={handleContinue} className="px-8">
          Continue to Week Planning
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Goal Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4"
      >
        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center">
          <Trophy className="h-4 w-4 mr-2" />
          SMART Goals Tips
        </h4>
        <ul className="text-sm text-green-700 dark:text-green-200 space-y-1">
          <li>• <strong>Specific:</strong> Define exactly what you want to achieve</li>
          <li>• <strong>Measurable:</strong> Include metrics to track progress</li>
          <li>• <strong>Achievable:</strong> Set realistic and attainable goals</li>
          <li>• <strong>Relevant:</strong> Align with your broader academic objectives</li>
          <li>• <strong>Time-bound:</strong> Set deadlines to create urgency</li>
        </ul>
      </motion.div>
    </motion.div>
  );
};