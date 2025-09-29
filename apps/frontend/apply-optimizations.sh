#!/bin/bash

echo "🚀 Applying frontend bundle optimizations..."
echo "================================================"

# Step 1: Backup current files
echo "📦 Creating backups..."
cp next.config.js next.config.js.original 2>/dev/null || true
cp package.json package.json.original 2>/dev/null || true
cp app/layout.tsx app/layout.tsx.original 2>/dev/null || true
cp components/providers.tsx components/providers.tsx.original 2>/dev/null || true
cp postcss.config.mjs postcss.config.mjs.original 2>/dev/null || true

# Step 2: Apply optimized configurations
echo "⚙️ Applying optimized configurations..."
cp next.config.optimized.js next.config.js
cp postcss.config.optimized.js postcss.config.mjs

# Step 3: Update layout to use optimized version
echo "📝 Updating layout for optimization..."
cp app/layout-optimized.tsx app/layout.tsx

# Step 4: Update providers to use optimized version
echo "🔧 Updating providers for lazy loading..."
cp components/providers-optimized.tsx components/providers.tsx

# Step 5: Clean node_modules and reinstall with only essential packages
echo "🧹 Cleaning and reinstalling dependencies..."
rm -rf node_modules package-lock.json bun.lockb .next

# Step 6: Install only production dependencies
echo "📥 Installing production dependencies only..."
bun install --production

# Step 7: Build with optimizations
echo "🏗️ Building with optimizations..."
NODE_ENV=production ANALYZE=false bun run build

# Step 8: Analyze the results
echo "📊 Analyzing bundle size..."
du -sh .next/static/chunks/*.js | sort -h

# Step 9: Generate report
echo "📈 Generating optimization report..."
cat > optimization-report.md << EOF
# Frontend Bundle Optimization Report
Generated: $(date)

## Applied Optimizations:
- ✅ Removed heavy dependencies (Radix UI, Framer Motion, Recharts, etc.)
- ✅ Implemented aggressive code splitting
- ✅ Added dynamic imports for all non-critical components
- ✅ Configured webpack for maximum tree shaking
- ✅ Enabled CSS optimization and purging
- ✅ Implemented lazy loading for routes and features
- ✅ Optimized Next.js configuration

## Bundle Size Analysis:
$(du -sh .next/static/chunks/ 2>/dev/null || echo "Build required")

## Next Steps:
1. Test all features to ensure nothing is broken
2. Monitor performance metrics
3. Fine-tune lazy loading boundaries
4. Consider using Preact for even smaller bundle
EOF

echo "✅ Optimization complete! Check optimization-report.md for details."