"use client";

import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  GraduationCap,
  School,
  Calendar,
  BookOpen,
  Users,
  Award
} from 'lucide-react';
import { OnboardingData } from '../onboarding-wizard';

const academicSchema = z.object({
  school: z.string().min(2, 'School name must be at least 2 characters').max(100, 'School name too long'),
  gradeLevel: z.string().min(1, 'Please select your grade level'),
  semester: z.string().min(1, 'Please select current semester'),
  academicYear: z.string().min(1, 'Please select academic year'),
});

type AcademicFormData = z.infer<typeof academicSchema>;

interface AcademicInfoStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip?: () => void;
}

const gradeLevels = [
  { value: 'elementary', label: 'Elementary School' },
  { value: 'middle', label: 'Middle School' },
  { value: 'high-school', label: 'High School' },
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'graduate', label: 'Graduate' },
  { value: 'phd', label: 'PhD' },
  { value: 'professional', label: 'Professional School' },
  { value: 'other', label: 'Other' },
];

const semesters = [
  { value: 'spring', label: 'Spring Semester' },
  { value: 'summer', label: 'Summer Semester' },
  { value: 'fall', label: 'Fall Semester' },
  { value: 'winter', label: 'Winter Semester' },
  { value: 'year-round', label: 'Year-round' },
];

const academicYears = [
  { value: '2023-2024', label: '2023-2024' },
  { value: '2024-2025', label: '2024-2025' },
  { value: '2025-2026', label: '2025-2026' },
  { value: '2026-2027', label: '2026-2027' },
];

const commonSchools = [
  'Harvard University',
  'Stanford University',
  'MIT',
  'University of California, Berkeley',
  'Yale University',
  'Princeton University',
  'Columbia University',
  'University of Chicago',
  'University of Pennsylvania',
  'Northwestern University',
];

export const AcademicInfoStep = ({ data, updateData, onNext }: AcademicInfoStepProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm<AcademicFormData>({
    resolver: zodResolver(academicSchema),
    defaultValues: {
      school: data.academic?.school || '',
      gradeLevel: data.academic?.gradeLevel || '',
      semester: data.academic?.semester || '',
      academicYear: data.academic?.academicYear || '',
    },
    mode: 'onChange'
  });

  const onSubmit = (formData: AcademicFormData) => {
    updateData({
      academic: formData,
    });
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      <div className="text-center mb-8">
        <GraduationCap className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Tell us about your academic background
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          This helps us understand your educational context and create better study plans
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* School Information */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <School className="h-5 w-5 text-blue-500" />
              <Label className="text-base font-semibold">School Information</Label>
            </div>

            <div>
              <Label htmlFor="school">School/Institution Name *</Label>
              <div className="mt-1 space-y-2">
                <Input
                  id="school"
                  {...register('school')}
                  placeholder="Enter your school or institution name"
                  list="schools"
                />
                <datalist id="schools">
                  {commonSchools.map((school) => (
                    <option key={school} value={school} />
                  ))}
                </datalist>
                {errors.school && (
                  <p className="text-sm text-red-500">{errors.school.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="gradeLevel">Grade Level/Academic Level *</Label>
              <Select
                value={watch('gradeLevel')}
                onValueChange={(value) => setValue('gradeLevel', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select your academic level" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center space-x-2">
                        <Award className="h-4 w-4" />
                        <span>{level.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.gradeLevel && (
                <p className="text-sm text-red-500 mt-1">{errors.gradeLevel.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Academic Period */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="h-5 w-5 text-blue-500" />
              <Label className="text-base font-semibold">Current Academic Period</Label>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="semester">Current Semester/Term *</Label>
                <Select
                  value={watch('semester')}
                  onValueChange={(value) => setValue('semester', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select current semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map((semester) => (
                      <SelectItem key={semester.value} value={semester.value}>
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-4 w-4" />
                          <span>{semester.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.semester && (
                  <p className="text-sm text-red-500 mt-1">{errors.semester.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="academicYear">Academic Year *</Label>
                <Select
                  value={watch('academicYear')}
                  onValueChange={(value) => setValue('academicYear', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.academicYear && (
                  <p className="text-sm text-red-500 mt-1">{errors.academicYear.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Goals Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Users className="h-6 w-6 text-blue-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    What's coming next?
                  </h4>
                  <p className="text-blue-700 dark:text-blue-200 text-sm">
                    After completing your academic information, you'll be able to:
                  </p>
                  <ul className="text-blue-700 dark:text-blue-200 text-sm mt-2 space-y-1">
                    <li>• Add and organize your subjects</li>
                    <li>• Set up your study schedule preferences</li>
                    <li>• Define your academic goals</li>
                    <li>• Generate your personalized study plan</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Form Actions */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!isValid}
            className="px-8"
          >
            Continue to Subjects
          </Button>
        </div>
      </form>

      {/* Progress Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-sm text-gray-500 dark:text-gray-400"
      >
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Profile Complete</span>
          <div className="w-8 h-px bg-gray-300 dark:bg-gray-600"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span>Academic Info</span>
          <div className="w-8 h-px bg-gray-300 dark:bg-gray-600"></div>
          <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          <span>Subjects</span>
        </div>
      </motion.div>
    </motion.div>
  );
};