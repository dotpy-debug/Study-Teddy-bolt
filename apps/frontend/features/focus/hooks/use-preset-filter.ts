'use client';

import { useMemo, useState, useCallback } from 'react';
import { FocusPreset, PresetFilter, PresetCategory, PresetColor } from '../types/preset';

export function usePresetFilter(presets: FocusPreset[]) {
  const [filter, setFilter] = useState<PresetFilter>({
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Update filter
  const updateFilter = useCallback((updates: Partial<PresetFilter>) => {
    setFilter(prev => ({ ...prev, ...updates }));
  }, []);

  // Clear filter
  const clearFilter = useCallback(() => {
    setFilter({
      search: '',
      sortBy: 'name',
      sortOrder: 'asc',
    });
  }, []);

  // Filtered and sorted presets
  const filteredPresets = useMemo(() => {
    let result = [...presets];

    // Apply search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      result = result.filter(preset =>
        preset.name.toLowerCase().includes(searchLower) ||
        preset.description?.toLowerCase().includes(searchLower) ||
        preset.category.toLowerCase().includes(searchLower) ||
        preset.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply category filter
    if (filter.category) {
      result = result.filter(preset => preset.category === filter.category);
    }

    // Apply favorites filter
    if (filter.favorites) {
      result = result.filter(preset => preset.isFavorite);
    }

    // Apply color filter
    if (filter.color) {
      result = result.filter(preset => preset.color === filter.color);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (filter.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'usage':
          comparison = a.usageCount - b.usageCount;
          break;
        case 'lastUsed':
          const aLastUsed = a.lastUsedAt?.getTime() || 0;
          const bLastUsed = b.lastUsedAt?.getTime() || 0;
          comparison = aLastUsed - bLastUsed;
          break;
        default:
          comparison = 0;
      }

      return filter.sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [presets, filter]);

  // Get available filter options based on current presets
  const filterOptions = useMemo(() => {
    const categories = new Set<PresetCategory>();
    const colors = new Set<PresetColor>();
    const tags = new Set<string>();

    presets.forEach(preset => {
      categories.add(preset.category);
      colors.add(preset.color);
      preset.tags?.forEach(tag => tags.add(tag));
    });

    return {
      categories: Array.from(categories).sort(),
      colors: Array.from(colors).sort(),
      tags: Array.from(tags).sort(),
    };
  }, [presets]);

  // Quick filter functions
  const showFavorites = useCallback(() => {
    updateFilter({ favorites: true });
  }, [updateFilter]);

  const showCategory = useCallback((category: PresetCategory) => {
    updateFilter({ category });
  }, [updateFilter]);

  const showColor = useCallback((color: PresetColor) => {
    updateFilter({ color });
  }, [updateFilter]);

  const search = useCallback((query: string) => {
    updateFilter({ search: query });
  }, [updateFilter]);

  const sortBy = useCallback((sortBy: PresetFilter['sortBy'], sortOrder?: PresetFilter['sortOrder']) => {
    updateFilter({ sortBy, sortOrder: sortOrder || 'asc' });
  }, [updateFilter]);

  // Filter statistics
  const filterStats = useMemo(() => {
    const total = presets.length;
    const filtered = filteredPresets.length;
    const favorites = presets.filter(p => p.isFavorite).length;
    const byCategory = presets.reduce((acc, preset) => {
      acc[preset.category] = (acc[preset.category] || 0) + 1;
      return acc;
    }, {} as Record<PresetCategory, number>);

    return {
      total,
      filtered,
      favorites,
      byCategory,
      isFiltered: filtered !== total,
    };
  }, [presets, filteredPresets]);

  return {
    // Current filter state
    filter,
    filteredPresets,

    // Filter actions
    updateFilter,
    clearFilter,

    // Quick actions
    showFavorites,
    showCategory,
    showColor,
    search,
    sortBy,

    // Options and stats
    filterOptions,
    filterStats,
  };
}