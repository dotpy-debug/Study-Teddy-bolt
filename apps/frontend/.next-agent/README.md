# Study Teddy Next.js Development Agent

An intelligent development assistant specifically designed for the Study Teddy Next.js application.

## Features

### 🚀 Code Generation
- **Component Generator**: Create React components with TypeScript, accessibility, and best practices
- **Page Generator**: Generate Next.js pages with metadata, layouts, and routing
- **API Route Generator**: Create API endpoints with authentication, validation, and error handling

### 🔍 Code Auditing
- **Performance Analysis**: Bundle size analysis, code splitting recommendations
- **Security Audit**: Check for security headers, environment variables, exposed secrets
- **Accessibility Check**: Semantic HTML, ARIA labels, alt attributes
- **SEO Optimization**: Metadata, structured data, sitemaps
- **TypeScript Quality**: Type safety, interface usage, any type detection

### ⚡ Automation
- **Performance Monitoring**: Automated bundle analysis and optimization suggestions
- **Best Practices Enforcement**: Automated checks for Next.js conventions
- **Test Generation**: Automatic test file creation with components

## Installation

The agent is already configured for your Study Teddy project. To use the generators:

```bash
# Make scripts executable
chmod +x .next-agent/scripts/*.js

# Add to package.json scripts
npm run generate    # Interactive code generator
npm run audit       # Run best practices audit
```

## Usage

### Component Generation

```bash
node .next-agent/scripts/generate.js
```

Then select "Generate Component" and follow the prompts:

- **Component name**: TaskCard, UserProfile, etc.
- **Type**: ui (reusable), feature (business logic), layout (structure)
- **Props**: Custom properties interface
- **ForwardRef**: For ref forwarding
- **Icon**: Lucide React icons
- **State**: Local state management

**Example Output:**
```tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

export interface TaskCardProps {
  className?: string;
  children?: React.ReactNode;
  completed?: boolean;
  onToggle?: () => void;
}

export const TaskCard = React.forwardRef<
  HTMLDivElement,
  TaskCardProps
>(({ className, children, completed, onToggle, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'relative p-4 border rounded-lg',
        completed && 'opacity-60',
        className
      )}
      {...props}
    >
      <button
        onClick={onToggle}
        className="absolute top-2 right-2"
        aria-label={completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        <CheckCircle className={cn(
          'h-5 w-5',
          completed ? 'text-green-600' : 'text-gray-400'
        )} />
      </button>
      {children}
    </div>
  );
});

TaskCard.displayName = 'TaskCard';
```

### Page Generation

Generate complete Next.js pages with:
- Proper metadata for SEO
- TypeScript interfaces
- Authentication guards
- Server-side data fetching
- Responsive layouts

### API Route Generation

Create REST endpoints with:
- Authentication middleware
- Request validation with Zod
- Error handling
- Database integration
- TypeScript types

### Best Practices Audit

```bash
node .next-agent/scripts/audit.js
```

**Audit Checks:**
- ✅ Project structure organization
- ⚡ Performance optimizations
- 🔒 Security configurations
- ♿ Accessibility compliance
- 🎯 SEO optimizations
- 📝 TypeScript quality

**Sample Report:**
```
📊 Audit Report
================

⚠️ Warnings (Should Fix):
  • Consider adding security headers in next.config.ts
  • Found 12 uses of 'any' type - consider using specific types

💡 Suggestions (Consider):
  • Use more semantic HTML elements
  • Add metadata to more pages for better SEO
  • Consider adding structured data

📈 Overall Score: 85/100
👍 Good! Consider addressing the suggestions above.
```

## Configuration

The agent uses `.next-agent/config.json` for project-specific settings:

```json
{
  "framework": {
    "name": "Next.js",
    "version": "15.5.3",
    "features": ["app-router", "server-components", "typescript"]
  },
  "rules": {
    "typescript": { "strict": true },
    "components": { "implementAccessibility": true },
    "performance": { "enableCodeSplitting": true }
  }
}
```

## Templates

The agent uses Handlebars templates for consistent code generation:

- `component.tsx.template` - React component template
- `page.tsx.template` - Next.js page template
- `api-route.ts.template` - API route template

### Custom Templates

You can modify templates to match your team's conventions:

```handlebars
{{#if hasProps}}
export interface {{componentName}}Props {
  {{#each props}}
  {{name}}{{#if optional}}?{{/if}}: {{type}};
  {{/each}}
}
{{/if}}
```

## Integration with Study Teddy

The agent is specifically configured for Study Teddy's architecture:

- **Tailwind CSS**: Utility-first styling
- **Shadcn/ui**: Component library integration
- **NextAuth.js**: Authentication patterns
- **Drizzle ORM**: Database integration
- **Accessibility**: WCAG compliance built-in

## Automation Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "generate": "node .next-agent/scripts/generate.js",
    "audit": "node .next-agent/scripts/audit.js",
    "agent:component": "node .next-agent/scripts/generate.js --component",
    "agent:page": "node .next-agent/scripts/generate.js --page",
    "agent:api": "node .next-agent/scripts/generate.js --api"
  }
}
```

## Best Practices Enforced

### Components
- TypeScript interfaces for all props
- forwardRef for DOM access
- Accessibility attributes (ARIA labels, roles)
- Error boundaries and loading states
- Consistent naming conventions

### Pages
- Metadata for SEO
- Proper error handling
- Loading states
- Responsive design
- Server-side rendering optimization

### API Routes
- Authentication middleware
- Request validation
- Proper HTTP status codes
- Error handling and logging
- Rate limiting considerations

### Performance
- Code splitting with dynamic imports
- Image optimization
- Bundle analysis
- Core Web Vitals monitoring
- Caching strategies

## Contributing

To extend the agent:

1. Add new templates in `.next-agent/templates/`
2. Extend `generate.js` with new generators
3. Add audit rules in `audit.js`
4. Update configuration in `config.json`

## Troubleshooting

**Permission Issues:**
```bash
chmod +x .next-agent/scripts/*.js
```

**Template Errors:**
Check Handlebars syntax in template files

**Audit Failures:**
Review the generated report in `.next-agent/audit-report.json`

## Future Enhancements

- [ ] AI-powered code suggestions
- [ ] Integration with VS Code extension
- [ ] Automated testing generation
- [ ] Performance regression detection
- [ ] Security vulnerability scanning
- [ ] Dependency update automation