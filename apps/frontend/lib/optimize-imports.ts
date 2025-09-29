/**
 * Import optimization utilities
 * Helps reduce bundle size by providing optimized import patterns
 */

// Icon imports - use specific icons instead of full library
export const icons = {
  // Common icons - preloaded
  Check: () => import('lucide-react/dist/esm/icons/check').then(m => m.Check),
  X: () => import('lucide-react/dist/esm/icons/x').then(m => m.X),
  ChevronRight: () => import('lucide-react/dist/esm/icons/chevron-right').then(m => m.ChevronRight),
  ChevronLeft: () => import('lucide-react/dist/esm/icons/chevron-left').then(m => m.ChevronLeft),

  // Lazy loaded icons
  Settings: () => import('lucide-react/dist/esm/icons/settings').then(m => m.Settings),
  User: () => import('lucide-react/dist/esm/icons/user').then(m => m.User),
  Calendar: () => import('lucide-react/dist/esm/icons/calendar').then(m => m.Calendar),
  Clock: () => import('lucide-react/dist/esm/icons/clock').then(m => m.Clock),
}

// Date functions - import only what's needed
export const dateFns = {
  format: () => import('date-fns/format').then(m => m.format),
  parseISO: () => import('date-fns/parseISO').then(m => m.parseISO),
  addDays: () => import('date-fns/addDays').then(m => m.addDays),
  subDays: () => import('date-fns/subDays').then(m => m.subDays),
  differenceInDays: () => import('date-fns/differenceInDays').then(m => m.differenceInDays),
  isAfter: () => import('date-fns/isAfter').then(m => m.isAfter),
  isBefore: () => import('date-fns/isBefore').then(m => m.isBefore),
}

// React Query - optimized imports
export const reactQuery = {
  useQuery: () => import('@tanstack/react-query').then(m => m.useQuery),
  useMutation: () => import('@tanstack/react-query').then(m => m.useMutation),
  useQueryClient: () => import('@tanstack/react-query').then(m => m.useQueryClient),
  QueryClient: () => import('@tanstack/react-query').then(m => m.QueryClient),
}

// Form utilities
export const formUtils = {
  useForm: () => import('react-hook-form').then(m => m.useForm),
  Controller: () => import('react-hook-form').then(m => m.Controller),
  useFormContext: () => import('react-hook-form').then(m => m.useFormContext),
  zodResolver: () => import('@hookform/resolvers/zod').then(m => m.zodResolver),
}

// Utility functions to help with tree shaking
export const treeShake = {
  // Remove unused exports from bundles
  removeUnused: (exports: Record<string, any>, used: string[]) => {
    return used.reduce((acc, key) => {
      if (key in exports) {
        acc[key] = exports[key]
      }
      return acc
    }, {} as Record<string, any>)
  },

  // Dynamic import helper
  dynamicImport: async (module: string, exportName?: string) => {
    const mod = await import(module)
    return exportName ? mod[exportName] : mod.default
  },

  // Conditional loading based on environment
  conditionalLoad: (condition: boolean, module: () => Promise<any>) => {
    if (condition) {
      return module()
    }
    return Promise.resolve(null)
  },
}

// Bundle splitting helpers
export const splitBundle = {
  // Split vendor chunks
  vendor: (packageName: string) => {
    return import(/* webpackChunkName: "[request]" */ `${packageName}`)
  },

  // Split by route
  route: (routeName: string) => {
    return import(/* webpackChunkName: "[request]" */ `@/app/${routeName}/page`)
  },

  // Split by feature
  feature: (featureName: string) => {
    return import(/* webpackChunkName: "[request]" */ `@/features/${featureName}`)
  },
}

// Preload critical resources
export const preloadCritical = () => {
  if (typeof window === 'undefined') return

  // Preload fonts
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'font'
  link.type = 'font/woff2'
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)

  // Preload critical CSS
  const cssLink = document.createElement('link')
  cssLink.rel = 'preload'
  cssLink.as = 'style'
  cssLink.href = '/_next/static/css/app.css'
  document.head.appendChild(cssLink)
}

// Resource hints for better performance
export const addResourceHints = () => {
  if (typeof window === 'undefined') return

  // DNS prefetch for external domains
  const dnsPrefetch = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']
  dnsPrefetch.forEach(domain => {
    const link = document.createElement('link')
    link.rel = 'dns-prefetch'
    link.href = domain
    document.head.appendChild(link)
  })

  // Preconnect to critical origins
  const preconnect = ['https://fonts.googleapis.com']
  preconnect.forEach(origin => {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = origin
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  })
}