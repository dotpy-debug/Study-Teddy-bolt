# Bun Migration Guide

This guide covers the migration from npm/yarn/pnpm to Bun with the latest package versions.

## What's Changed

### Package Manager
- **Before**: npm/yarn/pnpm
- **After**: Bun (latest version)
- All `package.json` files now specify `"packageManager": "bun@latest"`

### Scripts Updated
All scripts now use `bunx` for running CLI tools:
- `bunx next` instead of `node ../../node_modules/next/dist/bin/next`
- `bunx nest` instead of `bunx @nestjs/cli`
- `bunx tsc` instead of `node ../../node_modules/typescript/bin/tsc`
- `bunx eslint` instead of `bun eslint`

### Major Version Updates

#### Root Dependencies
- `@typescript-eslint/*`: ^8.44.1 → ^8.20.0
- `concurrently`: ^8.2.2 → ^9.1.0
- `husky`: ^8.0.3 → ^9.1.7
- `turbo`: ^1.13.4 → ^2.3.4
- `@types/node`: ^20.0.0 → ^22.10.7

#### Backend Dependencies
- `@bull-board/*`: ^5.14.2 → ^6.0.0
- `@nestjs/*`: ^11.0.1 → ^11.0.8
- `bullmq`: ^5.1.5 → ^5.36.0
- `ioredis`: ^5.3.2 → ^5.4.2
- `mammoth`: ^1.7.2 → ^1.8.0

#### Frontend Dependencies
- `react`: ^18.3.1 → ^19.0.0
- `react-dom`: ^18.3.1 → ^19.0.0
- `@types/react`: ^18 → ^19.0.2
- `@types/react-dom`: ^18 → ^19.0.2
- `tailwindcss`: ^4 → ^4.0.0

#### Shared Packages
- `zod`: ^3.23.8 → ^4.1.8
- `typescript`: ^5.9.2 → ^5.7.3

## Migration Steps

### 1. Clean Installation
```bash
# Remove old lock files and node_modules
rm -f package-lock.json yarn.lock pnpm-lock.yaml
rm -rf node_modules

# Install with Bun
bun install
```

### 2. Build Shared Packages
```bash
# Build all shared packages first
bun run build --filter="@studyteddy/*"
```

### 3. Run Development
```bash
# Start all services
bun run dev

# Or start individual services
bun run dev --filter="@studyteddy/backend"
bun run dev --filter="@studyteddy/frontend"
```

### 4. Testing
```bash
# Run all tests
bun run test

# Run type checking
bun run typecheck

# Run linting
bun run lint
```

## Breaking Changes to Watch For

### React 19
- Some React types may have changed
- Check for any deprecated React features
- Update testing utilities if needed

### Zod 4.x
- Some API changes in Zod validation
- Check schema definitions for compatibility

### Turbo 2.x
- Updated configuration format (already handled)
- Improved caching and performance

### NestJS 11.x
- Latest features and improvements
- Check for any deprecated decorators or methods

## Performance Benefits

### Bun Advantages
- **Faster installs**: Up to 10x faster than npm
- **Better TypeScript support**: Native TypeScript execution
- **Improved bundling**: Built-in bundler and test runner
- **Memory efficiency**: Lower memory usage

### Expected Improvements
- Faster development server startup
- Quicker test execution
- Reduced build times
- Better hot reload performance

## Troubleshooting

### Common Issues

1. **Type Errors**: React 19 types may cause some issues
   ```bash
   # Fix by updating component types
   bunx tsc --noEmit
   ```

2. **Build Failures**: Shared packages need to be built first
   ```bash
   bun run build --filter="@studyteddy/*"
   ```

3. **Test Issues**: Update test configurations if needed
   ```bash
   bun run test --verbose
   ```

### Rollback Plan
If issues arise, you can temporarily rollback:
```bash
# Restore old package.json files from git
git checkout HEAD~1 -- package.json apps/*/package.json packages/*/package.json

# Reinstall with previous package manager
npm install  # or yarn/pnpm
```

## Next Steps

1. **Test thoroughly**: Run all tests and manual testing
2. **Update CI/CD**: Update deployment scripts to use Bun
3. **Monitor performance**: Check for any performance regressions
4. **Update documentation**: Update README and development guides

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [React 19 Migration Guide](https://react.dev/blog/2024/04/25/react-19)
- [Zod 4.x Changes](https://github.com/colinhacks/zod/releases)
- [NestJS 11 Features](https://docs.nestjs.com/)