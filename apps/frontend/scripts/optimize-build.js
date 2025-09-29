#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🚀 Starting optimized build process...\n')

// Step 1: Clean previous builds
console.log('1️⃣ Cleaning previous builds...')
try {
  execSync('rm -rf .next', { stdio: 'inherit' })
  execSync('rm -rf node_modules/.cache', { stdio: 'inherit' })
} catch (e) {
  // Ignore errors if directories don't exist
}

// Step 2: Update package.json to remove heavy dependencies
console.log('2️⃣ Optimizing dependencies...')
const packageJsonPath = path.join(__dirname, '..', 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

// Dependencies to remove (heavy and potentially unused)
const depsToRemove = [
  '@radix-ui/react-alert-dialog',
  '@radix-ui/react-avatar',
  '@radix-ui/react-checkbox',
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-label',
  '@radix-ui/react-popover',
  '@radix-ui/react-progress',
  '@radix-ui/react-radio-group',
  '@radix-ui/react-scroll-area',
  '@radix-ui/react-select',
  '@radix-ui/react-separator',
  '@radix-ui/react-switch',
  '@radix-ui/react-tabs',
  '@radix-ui/react-tooltip',
  '@dnd-kit/core',
  '@dnd-kit/sortable',
  '@dnd-kit/utilities',
  '@hello-pangea/dnd',
  'framer-motion',
  'recharts',
  'react-day-picker',
  'react-hot-toast',
  'sonner',
  'date-fns',
  '@sentry/integrations',
  '@sentry/node',
  '@sentry/react',
  '@sentry/webpack-plugin',
  '@tanstack/react-query-devtools',
  'axios',
  'nodemailer',
  '@types/nodemailer',
  'critters',
  'color-convert',
  'concat-map',
  'balanced-match',
]

// Keep only essential dependencies
const essentialDeps = {
  '@auth/drizzle-adapter': packageJson.dependencies['@auth/drizzle-adapter'],
  '@hookform/resolvers': packageJson.dependencies['@hookform/resolvers'],
  '@studyteddy/shared': packageJson.dependencies['@studyteddy/shared'],
  '@tanstack/react-query': packageJson.dependencies['@tanstack/react-query'],
  '@vercel/analytics': packageJson.dependencies['@vercel/analytics'],
  'arctic': packageJson.dependencies['arctic'],
  'better-auth': packageJson.dependencies['better-auth'],
  'class-variance-authority': packageJson.dependencies['class-variance-authority'],
  'clsx': packageJson.dependencies['clsx'],
  'drizzle-orm': packageJson.dependencies['drizzle-orm'],
  'lucide-react': packageJson.dependencies['lucide-react'],
  'next': packageJson.dependencies['next'],
  'pg': packageJson.dependencies['pg'],
  'postgres': packageJson.dependencies['postgres'],
  'react': packageJson.dependencies['react'],
  'react-dom': packageJson.dependencies['react-dom'],
  'react-hook-form': packageJson.dependencies['react-hook-form'],
  'tailwind-merge': packageJson.dependencies['tailwind-merge'],
  'web-vitals': packageJson.dependencies['web-vitals'],
  'zod': packageJson.dependencies['zod'],
}

// Create optimized package.json
const optimizedPackageJson = {
  ...packageJson,
  dependencies: essentialDeps,
}

// Step 3: Set environment variables for production build
console.log('3️⃣ Setting production environment variables...')
process.env.NODE_ENV = 'production'
process.env.NEXT_TELEMETRY_DISABLED = '1'
process.env.ANALYZE = 'false'
process.env.SENTRY_ENABLED = 'false' // Disable Sentry for smaller bundle

// Step 4: Copy optimized Next.js config
console.log('4️⃣ Using optimized Next.js configuration...')
const configSource = path.join(__dirname, '..', 'next.config.optimized.js')
const configDest = path.join(__dirname, '..', 'next.config.js.backup')
const currentConfig = path.join(__dirname, '..', 'next.config.js')

// Backup current config
if (fs.existsSync(currentConfig)) {
  fs.renameSync(currentConfig, configDest)
}

// Use optimized config
if (fs.existsSync(configSource)) {
  fs.copyFileSync(configSource, currentConfig)
}

// Step 5: Build with optimizations
console.log('5️⃣ Building with aggressive optimizations...')
try {
  execSync('bunx next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=4096',
      NEXT_SHARP_PATH: require.resolve('sharp'),
    },
  })
} catch (error) {
  console.error('Build failed:', error.message)
  // Restore original config
  if (fs.existsSync(configDest)) {
    fs.renameSync(configDest, currentConfig)
  }
  process.exit(1)
}

// Step 6: Analyze bundle size
console.log('6️⃣ Analyzing bundle size...')
const buildManifest = path.join(__dirname, '..', '.next', 'build-manifest.json')
if (fs.existsSync(buildManifest)) {
  const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'))
  console.log('Build manifest:', JSON.stringify(manifest, null, 2))
}

// Step 7: Generate size report
console.log('7️⃣ Generating size report...')
try {
  execSync('bunx next-bundle-analyzer', { stdio: 'inherit' })
} catch (e) {
  // Ignore if analyzer is not available
}

// Step 8: Restore original config (optional)
console.log('8️⃣ Cleaning up...')
if (fs.existsSync(configDest)) {
  // Keep optimized config for production
  // fs.renameSync(configDest, currentConfig)
  fs.unlinkSync(configDest) // Remove backup
}

console.log('\n✅ Optimized build complete!')
console.log('📊 Check .next/analyze/ for detailed bundle analysis')

// Print final stats
try {
  const stats = execSync('du -sh .next/static', { encoding: 'utf8' })
  console.log(`📦 Static assets size: ${stats}`)
} catch (e) {
  // Ignore on Windows
}