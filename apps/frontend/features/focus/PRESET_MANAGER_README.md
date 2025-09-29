# Focus Preset Manager

A comprehensive focus session preset management system built with React, TypeScript, and modern UI libraries.

## Overview

The Focus Preset Manager provides a complete solution for managing focus session presets with features like drag-and-drop reordering, search and filtering, import/export functionality, preset templates, and local storage persistence.

## Features

### ✨ Core Features
- **Grid and List View Modes** - Switch between visual layouts
- **Drag & Drop Reordering** - Rearrange presets with @dnd-kit
- **Advanced Search & Filtering** - Search by name, category, tags, or favorites
- **Import/Export** - Backup and share preset collections
- **Template Library** - Pre-built templates for common use cases
- **Local Storage** - Automatic persistence across sessions
- **Favorite Presets** - Mark frequently used presets
- **Usage Statistics** - Track preset usage and performance
- **Categories & Tags** - Organize presets with metadata
- **Responsive Design** - Works on all screen sizes

### 🎯 Preset Properties
- Focus duration (1-120 minutes)
- Short break duration (1-30 minutes)
- Long break duration (1-60 minutes)
- Sessions before long break (2-10 sessions)
- Color themes (Blue, Green, Purple, Orange, Red)
- Categories (Study, Work, Creative, Personal, Other)
- Custom descriptions and tags
- Favorite status
- Usage tracking

## Quick Start

### Basic Usage

```tsx
import { FocusPresetManager } from '@/features/focus';

function MyApp() {
  const handlePresetStart = (preset) => {
    // Start focus session with preset settings
    console.log('Starting session:', preset);
  };

  return (
    <FocusPresetManager
      onPresetStart={handlePresetStart}
      showQuickStart={true}
    />
  );
}
```

### Advanced Integration

```tsx
import {
  FocusPresetManager,
  usePresetStorage,
  usePresetFilter
} from '@/features/focus';

function AdvancedExample() {
  const { presets, createPreset, updatePreset } = usePresetStorage();
  const { filteredPresets, search, showFavorites } = usePresetFilter(presets);

  return (
    <div>
      {/* Custom filtering UI */}
      <input
        placeholder="Search presets..."
        onChange={(e) => search(e.target.value)}
      />
      <button onClick={showFavorites}>Show Favorites</button>

      {/* Main preset manager */}
      <FocusPresetManager
        onPresetSelect={(preset) => console.log('Selected:', preset)}
        onPresetStart={(preset) => console.log('Started:', preset)}
      />
    </div>
  );
}
```

## Components

### FocusPresetManager
Main component that provides the complete preset management interface.

**Props:**
- `onPresetSelect?: (preset: FocusPreset) => void` - Called when preset is selected
- `onPresetStart?: (preset: FocusPreset) => void` - Called when preset is started
- `selectedPresetId?: string` - ID of currently selected preset
- `activePresetId?: string` - ID of currently active preset
- `showQuickStart?: boolean` - Show quick action buttons (default: true)
- `className?: string` - Additional CSS classes

### SortablePresetCard
Enhanced preset card with drag-and-drop support and additional features.

### EnhancedPresetEditor
Advanced preset editor with support for descriptions, tags, categories, and favorites.

## Hooks

### usePresetStorage
Manages preset persistence and CRUD operations.

```tsx
const {
  presets,
  createPreset,
  updatePreset,
  deletePreset,
  toggleFavorite,
  recordUsage,
  exportPresets,
  importPresets,
  resetToDefaults
} = usePresetStorage();
```

### usePresetFilter
Provides filtering and sorting capabilities.

```tsx
const {
  filteredPresets,
  updateFilter,
  clearFilter,
  search,
  showFavorites,
  filterStats
} = usePresetFilter(presets);
```

## Default Templates

The system includes 5 built-in templates:

1. **Pomodoro** - Classic 25/5/15 timing (Study)
2. **Deep Work** - Extended 90/15/30 timing (Work)
3. **Quick Focus** - Short 15/3/10 timing (Personal)
4. **Creative Flow** - Balanced 45/10/20 timing (Creative)
5. **Study Marathon** - Extended 50/10/25 timing (Study)

## Data Persistence

Presets are automatically saved to localStorage with the following keys:
- `focus-presets` - Main preset data
- `focus-preset-usage` - Usage statistics
- `focus-preset-settings` - User preferences

## Import/Export Format

```json
{
  "presets": [
    {
      "id": "preset_123",
      "name": "My Preset",
      "focusDuration": 25,
      "shortBreakDuration": 5,
      "longBreakDuration": 15,
      "sessionsBeforeLongBreak": 4,
      "color": "blue",
      "category": "Study",
      "description": "Custom preset description",
      "tags": ["productivity", "study"],
      "isFavorite": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "usageCount": 0
    }
  ],
  "templates": [...],
  "exportedAt": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## Customization

### Styling
The components use Tailwind CSS classes and can be customized via:
- Custom CSS classes through `className` props
- Tailwind utility classes
- CSS-in-JS for dynamic theming

### Color Themes
Available preset colors: `blue`, `green`, `purple`, `orange`, `red`

Each color has predefined variants for:
- Background colors
- Border colors
- Accent colors
- Text colors
- Badge styles

## Accessibility

- Full keyboard navigation support
- ARIA labels and descriptions
- Screen reader compatibility
- Focus management
- High contrast support

## Performance

- Virtualized scrolling for large preset lists
- Debounced search input
- Memoized filter operations
- Lazy loading of non-critical features
- Optimized re-renders with React.memo

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

- React 18+
- TypeScript 4.5+
- @dnd-kit/core & @dnd-kit/sortable (drag & drop)
- framer-motion (animations)
- react-hook-form (forms)
- zod (validation)
- date-fns (date formatting)
- Radix UI (components)
- Tailwind CSS (styling)

## File Structure

```
features/focus/
├── components/
│   ├── focus-preset-manager.tsx      # Main component
│   ├── sortable-preset-card.tsx      # Draggable cards
│   ├── enhanced-preset-editor.tsx    # Advanced editor
│   └── index.ts                      # Component exports
├── hooks/
│   ├── use-preset-storage.ts         # Storage management
│   ├── use-preset-filter.ts          # Filtering logic
│   └── index.ts                      # Hook exports
├── types/
│   ├── preset.ts                     # Type definitions
│   └── index.ts                      # Type exports
├── examples/
│   └── preset-manager-example.tsx    # Usage examples
└── index.ts                          # Main exports
```

## Contributing

When adding new features:

1. Update type definitions in `types/preset.ts`
2. Add corresponding storage logic in `use-preset-storage.ts`
3. Update filtering logic if needed in `use-preset-filter.ts`
4. Enhance UI components as required
5. Update exports in `index.ts` files
6. Add tests for new functionality

## Troubleshooting

### Common Issues

**Presets not saving:**
- Check localStorage quotas
- Verify browser storage permissions
- Check for JSON serialization errors

**Drag & drop not working:**
- Ensure @dnd-kit dependencies are installed
- Check for conflicting touch events
- Verify drag is not disabled

**Performance issues:**
- Reduce preset count for testing
- Check for infinite re-renders
- Profile component updates

**Import/export errors:**
- Validate JSON format
- Check file size limits
- Verify data structure

## License

This component is part of the Study Teddy application and follows the project's licensing terms.