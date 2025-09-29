'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Star,
  Download,
  Upload,
  MoreVertical,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Trash2,
  Heart,
  Play,
  Bookmark,
  RotateCcw,
  Settings,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import { FocusPresetCard } from './focus-preset-card';
import { PresetEditorDialog } from './preset-editor-dialog';
import { SortablePresetCard } from './sortable-preset-card';
import { EnhancedPresetEditor } from './enhanced-preset-editor';
import { usePresetStorage } from '../hooks/use-preset-storage';
import { usePresetFilter } from '../hooks/use-preset-filter';
import {
  FocusPreset,
  PresetCategory,
  PresetColor,
  PRESET_CATEGORIES,
  DEFAULT_PRESETS,
  DEFAULT_PRESET_COLORS,
} from '../types/preset';

interface FocusPresetManagerProps {
  onPresetSelect?: (preset: FocusPreset) => void;
  onPresetStart?: (preset: FocusPreset) => void;
  selectedPresetId?: string;
  activePresetId?: string;
  showQuickStart?: boolean;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type DialogType = 'create' | 'edit' | 'templates' | 'import' | 'export' | 'settings' | null;

export function FocusPresetManager({
  onPresetSelect,
  onPresetStart,
  selectedPresetId,
  activePresetId,
  showQuickStart = true,
  className,
}: FocusPresetManagerProps) {
  // Storage and filter hooks
  const {
    presets,
    isLoading,
    createPreset,
    updatePreset,
    deletePreset,
    toggleFavorite,
    recordUsage,
    reorderPresets,
    createFromTemplate,
    exportPresets,
    importPresets,
    resetToDefaults,
  } = usePresetStorage();

  const {
    filter,
    filteredPresets,
    updateFilter,
    clearFilter,
    showFavorites,
    showCategory,
    search,
    sortBy,
    filterOptions,
    filterStats,
  } = usePresetFilter(presets);

  // Component state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [editingPreset, setEditingPreset] = useState<FocusPreset | null>(null);
  const [deletingPreset, setDeletingPreset] = useState<FocusPreset | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Drag and drop setup
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Event handlers
  const handlePresetSelect = useCallback((preset: FocusPreset) => {
    onPresetSelect?.(preset);
  }, [onPresetSelect]);

  const handlePresetStart = useCallback((preset: FocusPreset) => {
    recordUsage(preset.id);
    onPresetStart?.(preset);
  }, [onPresetStart, recordUsage]);

  const handlePresetEdit = useCallback((preset: FocusPreset) => {
    setEditingPreset(preset);
    setActiveDialog('edit');
  }, []);

  const handlePresetDelete = useCallback((preset: FocusPreset) => {
    setDeletingPreset(preset);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deletingPreset) {
      deletePreset(deletingPreset.id);
      setDeletingPreset(null);
    }
  }, [deletingPreset, deletePreset]);

  const handlePresetSave = useCallback((presetData: Omit<FocusPreset, 'id' | 'isDefault' | 'createdAt' | 'updatedAt' | 'usageCount' | 'lastUsedAt'>) => {
    if (editingPreset) {
      updatePreset(editingPreset.id, presetData);
    } else {
      createPreset(presetData);
    }
    setActiveDialog(null);
    setEditingPreset(null);
  }, [editingPreset, updatePreset, createPreset]);

  const handleCreateFromTemplate = useCallback((templateId: string, customName?: string) => {
    const template = DEFAULT_PRESETS.find(t => t.templateId === templateId);
    if (template) {
      createFromTemplate(template, customName);
      setActiveDialog(null);
    }
  }, [createFromTemplate]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredPresets.findIndex(p => p.id === active.id);
      const newIndex = filteredPresets.findIndex(p => p.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderPresets(oldIndex, newIndex);
      }
    }
  }, [filteredPresets, reorderPresets]);

  const handleExport = useCallback(() => {
    const data = exportPresets();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focus-presets-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportPresets]);

  const handleImport = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = importPresets(data);

      // Show result notification here if needed
      console.log('Import result:', result);
      setActiveDialog(null);
      setImportFile(null);
    } catch (error) {
      console.error('Import failed:', error);
      // Show error notification here if needed
    }
  }, [importPresets]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Focus Presets
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your focus session presets
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 p-0"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setActiveDialog('create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Preset
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveDialog('templates')}>
                <Bookmark className="h-4 w-4 mr-2" />
                Template Library
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Presets
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveDialog('import')}>
                <Upload className="h-4 w-4 mr-2" />
                Import Presets
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={resetToDefaults}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => setActiveDialog('create')}>
            <Plus className="h-4 w-4 mr-2" />
            New Preset
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search presets..."
            value={filter.search || ''}
            onChange={(e) => search(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {/* Category Filter */}
          <Select
            value={filter.category || ''}
            onValueChange={(value) => updateFilter({ category: value as PresetCategory || undefined })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {PRESET_CATEGORIES.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {filter.sortOrder === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => sortBy('name', 'asc')}>
                Name (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => sortBy('name', 'desc')}>
                Name (Z-A)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => sortBy('created', 'desc')}>
                Newest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => sortBy('created', 'asc')}>
                Oldest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => sortBy('usage', 'desc')}>
                Most Used
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => sortBy('lastUsed', 'desc')}>
                Recently Used
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Filters */}
          <Button
            variant={filter.favorites ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter({ favorites: !filter.favorites })}
          >
            <Star className={cn('h-4 w-4', filter.favorites && 'fill-current')} />
          </Button>

          {/* Clear Filters */}
          {filterStats.isFiltered && (
            <Button variant="ghost" size="sm" onClick={clearFilter}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filter Stats */}
      {filterStats.isFiltered && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filterStats.filtered} of {filterStats.total} presets
        </div>
      )}

      {/* Quick Actions Bar */}
      {showQuickStart && (
        <div className="flex gap-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={() => showFavorites()}
          >
            <Heart className="h-4 w-4 mr-2" />
            Favorites ({filterStats.favorites})
          </Button>
          {PRESET_CATEGORIES.map(category => {
            const count = filterStats.byCategory[category] || 0;
            if (count === 0) return null;

            return (
              <Button
                key={category}
                variant="outline"
                size="sm"
                onClick={() => showCategory(category)}
              >
                {category} ({count})
              </Button>
            );
          })}
        </div>
      )}

      {/* Presets Grid/List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext
          items={filteredPresets.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-2'
            )}
          >
            <AnimatePresence>
              {filteredPresets.map((preset) => (
                <SortablePresetCard
                  key={preset.id}
                  preset={preset}
                  isSelected={selectedPresetId === preset.id}
                  isActive={activePresetId === preset.id}
                  onSelect={handlePresetSelect}
                  onEdit={handlePresetEdit}
                  onDelete={handlePresetDelete}
                  onStart={handlePresetStart}
                  onToggleFavorite={toggleFavorite}
                  viewMode={viewMode}
                  showStats={true}
                  isDragDisabled={filterStats.isFiltered}
                />
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty State */}
      {filteredPresets.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <Search className="h-full w-full" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {filterStats.isFiltered ? 'No presets found' : 'No presets yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {filterStats.isFiltered
              ? 'Try adjusting your search or filters'
              : 'Create your first focus preset to get started'}
          </p>
          {!filterStats.isFiltered && (
            <Button onClick={() => setActiveDialog('create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Preset
            </Button>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <EnhancedPresetEditor
        open={activeDialog === 'create' || activeDialog === 'edit'}
        onOpenChange={(open) => {
          if (!open) {
            setActiveDialog(null);
            setEditingPreset(null);
          }
        }}
        preset={editingPreset}
        onSave={handlePresetSave}
      />

      {/* Template Library Dialog */}
      <Dialog
        open={activeDialog === 'templates'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preset Templates</DialogTitle>
            <DialogDescription>
              Choose from our curated collection of focus session templates
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {DEFAULT_PRESETS.map((template) => (
              <Card key={template.templateId} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge variant="secondary" className={DEFAULT_PRESET_COLORS[template.color].badge}>
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {template.description}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between text-sm mb-3">
                    <span>Focus: {template.focusDuration}m</span>
                    <span>Break: {template.shortBreakDuration}m</span>
                    <span>Long: {template.longBreakDuration}m</span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleCreateFromTemplate(template.templateId)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={activeDialog === 'import'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Presets</DialogTitle>
            <DialogDescription>
              Import presets from a previously exported file
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="import-file">Select Import File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActiveDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => importFile && handleImport(importFile)}
                disabled={!importFile}
              >
                Import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPreset} onOpenChange={() => setDeletingPreset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPreset?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}