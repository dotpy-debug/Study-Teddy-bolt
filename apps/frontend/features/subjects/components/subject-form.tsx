"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, XIcon, ExternalLinkIcon } from 'lucide-react';
import { CreateSubjectData, UpdateSubjectData, Subject, ResourceLink } from '../types';
import { useSubjectOperations } from '../hooks/useSubjects';

const subjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  icon: z.string().max(50, 'Icon identifier too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
});

const resourceLinkSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  url: z.string().url('Invalid URL'),
  description: z.string().max(300, 'Description too long').optional(),
});

interface SubjectFormProps {
  subject?: Subject;
  onSubmit: () => void;
  onCancel: () => void;
}

const DEFAULT_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#06B6D4', '#84CC16',
  '#F97316', '#64748B', '#DC2626', '#7C3AED'
];

export const SubjectForm = ({ subject, onSubmit, onCancel }: SubjectFormProps) => {
  const { createSubject, updateSubject, isLoading } = useSubjectOperations();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<CreateSubjectData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: subject?.name || '',
      color: subject?.color || '#6366F1',
      icon: subject?.icon || '',
      description: subject?.description || '',
    }
  });

  const [resources, setResources] = useState<ResourceLink[]>(
    subject?.resources?.links || []
  );
  const [resourceNotes, setResourceNotes] = useState(
    subject?.resources?.notes || ''
  );
  const [newResource, setNewResource] = useState<Partial<ResourceLink>>({});

  const selectedColor = watch('color');

  const handleFormSubmit = (data: CreateSubjectData) => {
    const formData = {
      ...data,
      resources: {
        links: resources,
        notes: resourceNotes
      }
    };

    if (subject) {
      updateSubject(
        { id: subject.id, data: formData },
        { onSuccess: onSubmit }
      );
    } else {
      createSubject(formData, { onSuccess: onSubmit });
    }
  };

  const addResource = () => {
    if (newResource.title && newResource.url) {
      const result = resourceLinkSchema.safeParse(newResource);
      if (result.success) {
        setResources([...resources, result.data]);
        setNewResource({});
      }
    }
  };

  const removeResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Subject Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Mathematics, Physics, Computer Science"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Brief description of the subject..."
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="icon">Icon Identifier (optional)</Label>
            <Input
              id="icon"
              {...register('icon')}
              placeholder="e.g., BookOpen, Calculator, Atom"
            />
            {errors.icon && (
              <p className="text-sm text-red-500 mt-1">{errors.icon.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Color Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Color</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full border-2 border-gray-300"
                style={{ backgroundColor: selectedColor }}
              />
              <span className="text-sm font-medium">{selectedColor}</span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color ? 'border-gray-800 scale-110' : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setValue('color', color)}
                />
              ))}
            </div>

            <div>
              <Label htmlFor="customColor">Custom Color</Label>
              <Input
                id="customColor"
                type="color"
                {...register('color')}
                className="w-20 h-10 p-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Study Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Resources */}
          {resources.length > 0 && (
            <div className="space-y-2">
              <Label>Resource Links</Label>
              {resources.map((resource, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 border rounded-lg"
                >
                  <ExternalLinkIcon className="h-4 w-4 text-gray-400" />
                  <div className="flex-1">
                    <div className="font-medium">{resource.title}</div>
                    <div className="text-sm text-gray-500 truncate">
                      {resource.url}
                    </div>
                    {resource.description && (
                      <div className="text-sm text-gray-600 mt-1">
                        {resource.description}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeResource(index)}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Resource */}
          <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
            <Label>Add Resource Link</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Resource title"
                value={newResource.title || ''}
                onChange={(e) =>
                  setNewResource({ ...newResource, title: e.target.value })
                }
              />
              <Input
                placeholder="https://..."
                value={newResource.url || ''}
                onChange={(e) =>
                  setNewResource({ ...newResource, url: e.target.value })
                }
              />
            </div>
            <Input
              placeholder="Description (optional)"
              value={newResource.description || ''}
              onChange={(e) =>
                setNewResource({ ...newResource, description: e.target.value })
              }
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addResource}
              disabled={!newResource.title || !newResource.url}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </div>

          {/* Resource Notes */}
          <div>
            <Label htmlFor="resourceNotes">Additional Notes</Label>
            <Textarea
              id="resourceNotes"
              placeholder="General notes about study materials, textbooks, etc."
              value={resourceNotes}
              onChange={(e) => setResourceNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : subject ? 'Update Subject' : 'Create Subject'}
        </Button>
      </div>
    </form>
  );
};