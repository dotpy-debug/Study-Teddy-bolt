# Frontend Bundle Size Optimization Guide

## 🎯 Goal: Reduce bundle from 772KB to under 250KB

## 📊 Current Status
- **Before Optimization**: 564KB First Load JS
- **Target**: Under 250KB
- **Reduction Required**: >55%

## 🚀 Optimization Strategy

### 1. Dependencies Optimization
We've removed/replaced heavy dependencies:

**Removed:**
- All @radix-ui components (150KB+)
- framer-motion (80KB+)
- recharts (100KB+)
- date-fns (when not tree-shaken properly)
- react-day-picker
- @dnd-kit packages
- Sentry packages (for production)
- axios (replaced with native fetch)

**Kept Essential:**
- React & React-DOM
- Next.js core
- Minimal UI (lucide-react icons)
- Form handling (react-hook-form)
- Database (drizzle-orm, pg)
- Authentication (better-auth)

### 2. Code Splitting Implementation

#### Dynamic Imports for Routes
```typescript
// Before
import Dashboard from './dashboard/page'

// After
const Dashboard = dynamic(() => import('./dashboard/page'), {
  ssr: false,
  loading: () => <LoadingSkeleton />
})
```

#### Lazy Loading Components
```typescript
// Use the lazy-load utility
import { lazyLoad, clientOnly } from '@/lib/lazy-load'

const HeavyComponent = lazyLoad(() => import('./HeavyComponent'))
const ClientOnlyComponent = clientOnly(() => import('./ClientOnly'))
```

### 3. Next.js Configuration Optimizations

Key optimizations in `next.config.optimized.js`:
- Aggressive webpack chunking (max 100KB per chunk)
- Tree shaking enabled
- CSS optimization with PurgeCSS
- Modular imports for all libraries
- Disabled source maps in production
- Image optimization settings
- Framework/vendor code splitting

### 4. Implementation Steps

#### Quick Start (Automated)
```bash
# Windows
cd apps/frontend
apply-optimizations.bat

# Linux/Mac
cd apps/frontend
chmod +x apply-optimizations.sh
./apply-optimizations.sh
```

#### Manual Implementation

1. **Backup current setup:**
```bash
cp next.config.js next.config.js.backup
cp package.json package.json.backup
```

2. **Apply optimized config:**
```bash
cp next.config.optimized.js next.config.js
cp postcss.config.optimized.js postcss.config.mjs
```

3. **Update components:**
```bash
cp app/layout-optimized.tsx app/layout.tsx
cp components/providers-optimized.tsx components/providers.tsx
```

4. **Clean and rebuild:**
```bash
rm -rf node_modules .next
bun install --production
NODE_ENV=production bun run build
```

### 5. Component Optimization Patterns

#### Pattern 1: Lazy Load Heavy Components
```typescript
// dashboard/page.tsx
import dynamic from 'next/dynamic'

const Charts = dynamic(() => import('@/components/Charts'), {
  ssr: false,
  loading: () => <div>Loading charts...</div>
})

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Charts /> {/* Loaded only when needed */}
    </div>
  )
}
```

#### Pattern 2: Route-Based Code Splitting
```typescript
// app/settings/page.tsx
export default async function SettingsPage() {
  // This entire route is split into its own bundle
  const SettingsForm = await import('./SettingsForm')
  return <SettingsForm.default />
}
```

#### Pattern 3: Conditional Loading
```typescript
// Only load analytics in production
if (process.env.NODE_ENV === 'production') {
  import('@vercel/analytics').then(({ Analytics }) => {
    // Initialize analytics
  })
}
```

### 6. Monitoring & Verification

#### Check Bundle Size
```bash
# Build and analyze
ANALYZE=true bun run build

# Check output
# Look for "First Load JS" in build output
# Should be under 250KB
```

#### View Bundle Analysis
Open `.next/analyze/client.html` in browser to see:
- Which packages are largest
- Opportunities for further optimization
- Duplicate code detection

### 7. Performance Budget

Configure in `performance-budget.config.js`:
```javascript
module.exports = {
  budgets: [
    {
      type: 'bundle',
      name: 'main',
      maximumSize: '100kb'
    },
    {
      type: 'bundle',
      name: 'vendor',
      maximumSize: '150kb'
    }
  ]
}
```

### 8. Testing After Optimization

Critical paths to test:
- [ ] Authentication flow works
- [ ] Dashboard loads correctly
- [ ] Forms submit properly
- [ ] Navigation works
- [ ] API calls function
- [ ] Lazy loaded components appear

### 9. Rollback if Needed

If issues occur:
```bash
# Restore original files
cp next.config.js.original next.config.js
cp package.json.original package.json
cp app/layout.tsx.original app/layout.tsx
cp components/providers.tsx.original components/providers.tsx

# Rebuild
rm -rf .next node_modules
bun install
bun run build
```

### 10. Advanced Optimizations (If Still Over 250KB)

#### Option 1: Use Preact in Production
```javascript
// next.config.js
webpack: (config, { dev, isServer }) => {
  if (!dev && !isServer) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
    }
  }
  return config
}
```

#### Option 2: Remove More Dependencies
- Replace `react-hook-form` with native form handling
- Remove `zod` and use manual validation
- Replace `tailwind-merge` with custom utility
- Use CSS modules instead of CSS-in-JS

#### Option 3: Server Components Only
- Move all logic to server components
- Use forms with server actions
- Eliminate client-side state management

### 11. Continuous Monitoring

Add to CI/CD pipeline:
```yaml
- name: Check Bundle Size
  run: |
    npm run build
    # Fail if bundle exceeds 250KB
    node scripts/check-bundle-size.js
```

## 📈 Expected Results

After implementing all optimizations:
- **Main bundle**: ~80KB
- **Vendor bundle**: ~120KB
- **Route chunks**: 10-30KB each
- **Total First Load**: <250KB

## 🔧 Maintenance

1. **Before adding new dependencies:**
   - Check bundle size impact
   - Look for lighter alternatives
   - Consider dynamic import

2. **Regular audits:**
   - Run bundle analyzer monthly
   - Remove unused code
   - Update optimization configs

3. **Performance monitoring:**
   - Track Core Web Vitals
   - Monitor user experience metrics
   - Set up alerts for regression

## 🎉 Success Metrics

- ✅ First Load JS under 250KB
- ✅ Time to Interactive < 3s
- ✅ Lighthouse Performance Score > 95
- ✅ Core Web Vitals all green
- ✅ Fast 3G load time < 5s

## 📚 Resources

- [Next.js Optimization Docs](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Bundle Analyzer Guide](https://github.com/vercel/next.js/tree/canary/packages/next-bundle-analyzer)
- [Webpack Bundle Optimization](https://webpack.js.org/guides/code-splitting/)
- [Web.dev Performance Guide](https://web.dev/performance/)