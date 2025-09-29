/**
 * Optimized UI component exports with lazy loading
 * Only export critical components directly, lazy load the rest
 */

// Critical components - loaded immediately
export { Button } from './button'
export { Input } from './input'
export { Label } from './label'

// Lazy load heavy UI components
import dynamic from 'next/dynamic'

// Forms
export const Form = dynamic(() => import('./form').then(mod => ({ default: mod.Form })), {
  ssr: false
})

export const Select = dynamic(() => import('./select').then(mod => ({ default: mod.Select })), {
  ssr: false
})

export const Checkbox = dynamic(() => import('./checkbox').then(mod => ({ default: mod.Checkbox })), {
  ssr: false
})

export const RadioGroup = dynamic(() => import('./radio-group').then(mod => ({ default: mod.RadioGroup })), {
  ssr: false
})

// Dialogs and Modals
export const Dialog = dynamic(() => import('./dialog').then(mod => ({ default: mod.Dialog })), {
  ssr: false
})

export const AlertDialog = dynamic(() => import('./alert-dialog').then(mod => ({ default: mod.AlertDialog })), {
  ssr: false
})

export const Sheet = dynamic(() => import('./sheet').then(mod => ({ default: mod.Sheet })), {
  ssr: false
})

// Data Display
export const Table = dynamic(() => import('./table').then(mod => ({ default: mod.Table })), {
  ssr: false
})

export const Card = dynamic(() => import('./card').then(mod => ({ default: mod.Card })), {
  ssr: false
})

export const Avatar = dynamic(() => import('./avatar').then(mod => ({ default: mod.Avatar })), {
  ssr: false
})

// Navigation
export const Tabs = dynamic(() => import('./tabs').then(mod => ({ default: mod.Tabs })), {
  ssr: false
})

export const DropdownMenu = dynamic(() => import('./dropdown-menu').then(mod => ({ default: mod.DropdownMenu })), {
  ssr: false
})

export const NavigationMenu = dynamic(() => import('./navigation-menu').then(mod => ({ default: mod.NavigationMenu })), {
  ssr: false
})

// Feedback
export const Progress = dynamic(() => import('./progress').then(mod => ({ default: mod.Progress })), {
  ssr: false
})

export const Toast = dynamic(() => import('./toast').then(mod => ({ default: mod.Toast })), {
  ssr: false
})

export const Tooltip = dynamic(() => import('./tooltip').then(mod => ({ default: mod.Tooltip })), {
  ssr: false
})

// Complex Components
export const Calendar = dynamic(() => import('./calendar').then(mod => ({ default: mod.Calendar })), {
  ssr: false,
  loading: () => <div className="h-64 w-64 bg-gray-100 animate-pulse rounded" />
})

export const DataTable = dynamic(() => import('./data-table').then(mod => ({ default: mod.DataTable })), {
  ssr: false,
  loading: () => <div className="h-96 w-full bg-gray-100 animate-pulse rounded" />
})

/**
 * Utility to preload components for better performance
 * Call this after initial page load for frequently used components
 */
export const preloadUIComponents = () => {
  if (typeof window !== 'undefined') {
    // Preload commonly used components
    setTimeout(() => {
      import('./dialog')
      import('./form')
      import('./card')
      import('./dropdown-menu')
    }, 2000)
  }
}