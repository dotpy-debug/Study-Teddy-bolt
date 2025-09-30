# TypeScript Migration Checklist

## ✅ Completed
- [x] Fixed package dependencies (zod, @types/node, class-validator)
- [x] Created tsconfig.json files for packages
- [x] Fixed critical type issues in key files
- [x] Created temporary ESLint config with relaxed rules
- [x] Restored corrupted api-client.ts file

## 🔄 Next Steps (Priority Order)

### Phase 1: Critical Fixes
1. **Run type checking**: `bun run typecheck`
2. **Fix remaining package type errors**: Focus on packages/config, packages/shared, packages/validators
3. **Install missing dependencies**: `bun install` in root and all packages

### Phase 2: Frontend Fixes
1. **Replace 'any' types gradually**: Start with API response types
2. **Fix React component props**: Add proper TypeScript interfaces
3. **Fix hook return types**: Ensure custom hooks have proper return types

### Phase 3: Backend Fixes
1. **Fix test files**: Many errors are in test files with mock objects
2. **Add proper database types**: Replace 'any' with proper Drizzle types
3. **Fix service layer types**: Ensure services have proper input/output types

## 🛠️ Commands to Run

```bash
# Install all dependencies
bun install

# Type check with current issues
bun run typecheck

# Use temporary ESLint config for now
npx eslint . --config eslint.config.temp.js

# Build to test compilation
bun run build:packages
```

## 📁 Files to Prioritize

### High Priority (Blocking compilation)
- packages/config/src/env.ts
- packages/shared/src/schemas.ts
- packages/validators/src/auth.validator.ts

### Medium Priority (Many errors)
- apps/frontend/lib/api-client.ts ✅ (Fixed)
- apps/frontend/hooks/use-*.ts
- apps/backend/test/*.ts

### Low Priority (Warnings)
- Unused variables
- React unescaped entities
- Import/export style issues

## 🎯 Success Criteria
- [ ] `bun run typecheck` passes without errors
- [ ] `bun run build` completes successfully
- [ ] All packages compile without TypeScript errors
- [ ] Tests can run without type errors