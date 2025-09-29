"use client";

import { useState, useMemo, useCallback, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PlusIcon,
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  UploadIcon,
  SortAscIcon,
  SortDescIcon,
  GripVerticalIcon,
  BookOpenIcon,
  StarIcon,
  FolderIcon,
  TagIcon,
  ListIcon,
  GridIcon,
} from 'lucide-react';
import { useSubjectResources, useSubjectResourceOperations } from '../hooks/useSubjects';
import { useToast } from '@/hooks/use-toast';
import { Resource, ResourceType, CreateResourceData, UpdateResourceData, ResourceQueryParams } from '../types';
import { ResourceItem } from './resource-item';
import { ResourceForm } from './resource-form';
import { cn } from '@/lib/utils';

interface SubjectResourcesProps {
  subjectId: string;
}

interface SortableResourceItemProps {
  resource: Resource;
  onEdit: (resource: Resource) => void;
  onDelete: (resourceId: string) => void;
}

// Sortable wrapper for ResourceItem
const SortableResourceItem = ({ resource, onEdit, onDelete }: SortableResourceItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: resource.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ResourceItem
        resource={resource}
        onEdit={onEdit}
        onDelete={onDelete}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

export const SubjectResources = ({ subjectId }: SubjectResourcesProps) => {
  const { toast } = useToast();
  const { data: resources, isLoading } = useSubjectResources(subjectId);
  const {
    createResource,
    updateResource,
    deleteResource,
    reorderResources,
    isLoading: isOperationLoading,
  } = useSubjectResourceOperations(subjectId);

  // State management
  const [localResources, setLocalResources] = useState<Resource[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<ResourceType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string | 'all'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'type' | 'required' | 'created'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showRequiredOnly, setShowRequiredOnly] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize and update local resources from hook data
  useEffect(() => {
    if (resources.length > 0) {
      setLocalResources(resources.sort((a, b) => a.order - b.order));
    }
  }, [resources]);

  // Computed values
  const availableCategories = useMemo(() => {
    const categories = new Set(localResources.map(r => r.category).filter(Boolean));
    return Array.from(categories).sort();
  }, [localResources]);

  const availableTags = useMemo(() => {
    const tags = new Set(localResources.flatMap(r => r.tags));
    return Array.from(tags).sort();
  }, [localResources]);

  // Filtered and sorted resources
  const filteredResources = useMemo(() => {
    const filtered = localResources.filter(resource => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = resource.title.toLowerCase().includes(searchLower) ||
          resource.description?.toLowerCase().includes(searchLower) ||
          resource.tags.some(tag => tag.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Type filter
      if (selectedType !== 'all' && resource.type !== selectedType) return false;

      // Category filter
      if (selectedCategory !== 'all' && resource.category !== selectedCategory) return false;

      // Tag filter
      if (selectedTag !== 'all' && !resource.tags.includes(selectedTag)) return false;

      // Required filter
      if (showRequiredOnly && !resource.isRequired) return false;

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'required':
          comparison = Number(b.isRequired) - Number(a.isRequired);
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [localResources, searchTerm, selectedType, selectedCategory, selectedTag, showRequiredOnly, sortBy, sortOrder]);

  // Resource operations
  const handleAddResource = async (data: CreateResourceData) => {
    createResource(data, {
      onSuccess: () => {
        setIsFormOpen(false);
      }
    });
  };

  const handleEditResource = async (data: UpdateResourceData) => {
    if (!editingResource) return;

    updateResource(
      { resourceId: editingResource.id, data },
      {
        onSuccess: () => {
          setEditingResource(undefined);
          setIsFormOpen(false);
        }
      }
    );
  };

  const handleDeleteResource = async (resourceId: string) => {
    deleteResource(resourceId);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = localResources.findIndex(r => r.id === active.id);
      const newIndex = localResources.findIndex(r => r.id === over.id);

      const reorderedResources = arrayMove(localResources, oldIndex, newIndex);
      setLocalResources(reorderedResources);
      reorderResources(reorderedResources);
    }
  };

  const openAddForm = () => {
    setEditingResource(undefined);
    setIsFormOpen(true);
  };

  const openEditForm = (resource: Resource) => {
    setEditingResource(resource);
    setIsFormOpen(true);
  };

  const exportResources = () => {
    const dataStr = JSON.stringify(localResources, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `subject-${subjectId}-resources.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importResources = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedResources = JSON.parse(e.target?.result as string) as Resource[];

        // Validate and merge with existing resources
        let addedCount = 0;

        for (const importedResource of importedResources) {
          if (!localResources.find(r => r.title === importedResource.title)) {
            const resourceData: CreateResourceData = {
              type: importedResource.type,
              title: importedResource.title,
              url: importedResource.url,
              description: importedResource.description,
              tags: importedResource.tags || [],
              category: importedResource.category,
              isRequired: importedResource.isRequired || false,
            };

            createResource(resourceData);
            addedCount++;
          }
        }

        toast({
          title: 'Resources imported',
          description: `${addedCount} new resources have been imported.`,
        });
      } catch (error) {
        toast({
          title: 'Import failed',
          description: 'Failed to parse the imported file. Please check the format.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedTag('all');
    setShowRequiredOnly(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Study Resources</h2>
          <p className="text-muted-foreground">
            Manage books, articles, videos, and other learning materials
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={openAddForm} className="flex-shrink-0">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Resource
          </Button>

          <Button variant="outline" onClick={exportResources} disabled={localResources.length === 0}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export
          </Button>

          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={importResources}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline">
              <UploadIcon className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={selectedType} onValueChange={(value) => setSelectedType(value as ResourceType | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="book">Books</SelectItem>
                  <SelectItem value="article">Articles</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="website">Websites</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="tool">Tools</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tag</Label>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {availableTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Sort By</Label>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                    <SelectItem value="required">Required</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAscIcon className="h-4 w-4" /> : <SortDescIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={showRequiredOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowRequiredOnly(!showRequiredOnly)}
            >
              <StarIcon className="h-4 w-4 mr-1" />
              Required Only
            </Button>

            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant={viewMode === 'grid' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <GridIcon className="h-4 w-4" />
            </Button>

            <Button
              variant={viewMode === 'list' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || selectedType !== 'all' || selectedCategory !== 'all' || selectedTag !== 'all' || showRequiredOnly) && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary">Search: {searchTerm}</Badge>
              )}
              {selectedType !== 'all' && (
                <Badge variant="secondary">Type: {selectedType}</Badge>
              )}
              {selectedCategory !== 'all' && (
                <Badge variant="secondary">Category: {selectedCategory}</Badge>
              )}
              {selectedTag !== 'all' && (
                <Badge variant="secondary">Tag: {selectedTag}</Badge>
              )}
              {showRequiredOnly && (
                <Badge variant="secondary">Required Only</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resources Display */}
      {filteredResources.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredResources.map(r => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={cn(
              viewMode === 'grid'
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-3"
            )}>
              {filteredResources.map((resource) => (
                <SortableResourceItem
                  key={resource.id}
                  resource={resource}
                  onEdit={openEditForm}
                  onDelete={handleDeleteResource}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {resources.length === 0 ? 'No resources yet' : 'No resources match your filters'}
            </h3>
            <p className="text-gray-500 mb-4">
              {resources.length === 0
                ? 'Add study materials, books, articles, and other resources for this subject.'
                : 'Try adjusting your search terms or filters to find resources.'
              }
            </p>
            {resources.length === 0 ? (
              <Button onClick={openAddForm}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Your First Resource
              </Button>
            ) : (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {localResources.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{localResources.length}</div>
                <div className="text-sm text-muted-foreground">Total Resources</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{localResources.filter(r => r.isRequired).length}</div>
                <div className="text-sm text-muted-foreground">Required</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{availableCategories.length}</div>
                <div className="text-sm text-muted-foreground">Categories</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{availableTags.length}</div>
                <div className="text-sm text-muted-foreground">Tags</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Resource Form */}
      <ResourceForm
        resource={editingResource}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingResource(undefined);
        }}
        onSubmit={editingResource ? handleEditResource : handleAddResource}
        isLoading={isOperationLoading}
      />
    </div>
  );
};