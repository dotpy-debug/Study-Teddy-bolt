@echo off
echo Starting frontend bundle optimizations...
echo ================================================

REM Step 1: Backup current files
echo Creating backups...
copy next.config.js next.config.js.original >nul 2>&1
copy package.json package.json.original >nul 2>&1
copy app\layout.tsx app\layout.tsx.original >nul 2>&1
copy components\providers.tsx components\providers.tsx.original >nul 2>&1
copy postcss.config.mjs postcss.config.mjs.original >nul 2>&1

REM Step 2: Apply optimized configurations
echo Applying optimized configurations...
copy next.config.optimized.js next.config.js >nul 2>&1
copy postcss.config.optimized.js postcss.config.mjs >nul 2>&1

REM Step 3: Update layout to use optimized version
echo Updating layout for optimization...
copy app\layout-optimized.tsx app\layout.tsx >nul 2>&1

REM Step 4: Update providers to use optimized version
echo Updating providers for lazy loading...
copy components\providers-optimized.tsx components\providers.tsx >nul 2>&1

REM Step 5: Clean node_modules and reinstall
echo Cleaning and reinstalling dependencies...
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul
del bun.lockb 2>nul
rmdir /s /q .next 2>nul

REM Step 6: Install only production dependencies
echo Installing production dependencies only...
call bun install --production

REM Step 7: Build with optimizations
echo Building with optimizations...
set NODE_ENV=production
set ANALYZE=false
call bun run build

REM Step 8: Show results
echo Bundle optimization complete!
echo Check .next\analyze for detailed reports

pause