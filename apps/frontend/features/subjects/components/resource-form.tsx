"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  BookOpenIcon,
  FileTextIcon,
  PlayIcon,
  LinkIcon,
  FileIcon,
  WrenchIcon,
  MoreHorizontalIcon,
  XIcon,
  PlusIcon,
} from 'lucide-react';
import { Resource, ResourceType, CreateResourceData, UpdateResourceData } from '../types';

const resourceSchema = z.object({
  type: z.enum(['book', 'article', 'video', 'website', 'document', 'tool', 'other']),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  url: z.string().url('Invalid URL').optional().or(z.literal('')),
  description: z.string().max(500, 'Description too long').optional(),
  category: z.string().max(50, 'Category too long').optional().or(z.literal('')),
  isRequired: z.boolean(),
});

interface ResourceFormProps {
  resource?: Resource;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateResourceData | UpdateResourceData) => void;
  isLoading?: boolean;
}

const RESOURCE_TYPES: Array<{ value: ResourceType; label: string; icon: React.ComponentType<any> }> = [
  { value: 'book', label: 'Book', icon: BookOpenIcon },
  { value: 'article', label: 'Article', icon: FileTextIcon },
  { value: 'video', label: 'Video', icon: PlayIcon },
  { value: 'website', label: 'Website', icon: LinkIcon },
  { value: 'document', label: 'Document', icon: FileIcon },
  { value: 'tool', label: 'Tool', icon: WrenchIcon },
  { value: 'other', label: 'Other', icon: MoreHorizontalIcon },
];

const COMMON_CATEGORIES = [
  'Textbook',
  'Reference',
  'Tutorial',
  'Documentation',
  'Practice',
  'Research',
  'Assignment',
  'Study Guide',
  'Lecture',
  'Project',
];

export const ResourceForm = ({
  resource,
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: ResourceFormProps) => {
  const [tags, setTags] = useState<string[]>(resource?.tags || []);
  const [newTag, setNewTag] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateResourceData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      type: resource?.type || 'book',
      title: resource?.title || '',
      url: resource?.url || '',
      description: resource?.description || '',
      category: resource?.category || '',
      isRequired: resource?.isRequired || false,
    },
  });

  const selectedType = watch('type');
  const isRequired = watch('isRequired');

  useEffect(() => {
    if (isOpen) {
      if (resource) {
        reset({
          type: resource.type,
          title: resource.title,
          url: resource.url || '',
          description: resource.description || '',
          category: resource.category || '',
          isRequired: resource.isRequired,
        });
        setTags(resource.tags || []);
      } else {
        reset({
          type: 'book',
          title: '',
          url: '',
          description: '',
          category: '',
          isRequired: false,
        });
        setTags([]);
      }
    }
  }, [isOpen, resource, reset]);

  const handleFormSubmit = (data: CreateResourceData) => {
    const formData = {
      ...data,
      tags,
      url: data.url || undefined,
      category: data.category || undefined,
      description: data.description || undefined,
    };
    onSubmit(formData);
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const needsUrl = ['website', 'video', 'document'].includes(selectedType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {resource ? 'Edit Resource' : 'Add New Resource'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Resource Type */}
          <div className="space-y-2">
            <Label>Resource Type *</Label>
            <Select value={selectedType} onValueChange={(value) => setValue('type', value as ResourceType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select resource type" />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Resource title"
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={watch('category')}
                onValueChange={(value) => setValue('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or type category" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                {...register('category')}
                placeholder="Or type custom category"
                className="mt-2"
              />
            </div>
          </div>

          {/* URL */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="url">URL</Label>
              {needsUrl && <span className="text-red-500">*</span>}
            </div>
            <Input
              id="url"
              {...register('url')}
              placeholder="https://..."
              type="url"
            />
            {errors.url && (
              <p className="text-sm text-red-500">{errors.url.message}</p>
            )}
            {needsUrl && (
              <p className="text-xs text-muted-foreground">
                URL is required for {selectedType} resources
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Brief description of the resource..."
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags</Label>

            {/* Existing Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add New Tag */}
            <div className="flex gap-2">
              <Input
                placeholder="Add tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTag}
                disabled={!newTag.trim() || tags.includes(newTag.trim())}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Required Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Required Resource</Label>
              <p className="text-sm text-muted-foreground">
                Mark this resource as required for studying this subject
              </p>
            </div>
            <Switch
              checked={isRequired}
              onCheckedChange={(checked) => setValue('isRequired', checked)}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : resource ? 'Update Resource' : 'Add Resource'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};