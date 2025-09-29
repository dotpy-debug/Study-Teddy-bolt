#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function toPascalCase(str) {
  return str.replace(/(?:^|[-_])(\w)/g, (_, c) => c.toUpperCase());
}

function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function toCamelCase(str) {
  return str.replace(/(?:^|[-_])(\w)/g, (match, letter, index) =>
    index === 0 ? letter.toLowerCase() : letter.toUpperCase()
  );
}

async function generateComponent() {
  console.log('\n🚀 Component Generator for Study Teddy\n');

  const name = await question('Component name (e.g., TaskCard): ');
  const type = await question('Component type (ui/feature/layout): ');
  const hasProps = await question('Has custom props? (y/n): ');
  const needsForwardRef = await question('Needs forwardRef? (y/n): ');
  const hasIcon = await question('Has icon? (y/n): ');
  const hasState = await question('Has state? (y/n): ');

  const componentName = toPascalCase(name);
  const fileName = toKebabCase(name);
  const dirPath = path.join(process.cwd(), 'components', type);
  const filePath = path.join(dirPath, `${fileName}.tsx`);

  // Ensure directory exists
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Generate component content
  let content = `'use client';\n\n`;

  if (needsForwardRef === 'y') {
    content += `import * as React from 'react';\n`;
  } else {
    content += `import React from 'react';\n`;
  }

  content += `import { cn } from '@/lib/utils';\n`;

  if (hasIcon === 'y') {
    const iconName = await question('Icon name from lucide-react: ');
    content += `import { ${iconName} } from 'lucide-react';\n`;
  }

  if (hasProps === 'y') {
    content += `\nexport interface ${componentName}Props {\n`;
    content += `  className?: string;\n`;
    content += `  children?: React.ReactNode;\n`;
    content += `}\n`;
  }

  content += `\nexport `;

  if (needsForwardRef === 'y') {
    content += `const ${componentName} = React.forwardRef<\n`;
    content += `  HTMLDivElement,\n`;
    content += `  ${componentName}Props\n`;
    content += `>(({ className, children, ...props }, ref) => {\n`;
  } else {
    content += `function ${componentName}({\n`;
    content += `  className,\n`;
    content += `  children,\n`;
    content += `  ...props\n`;
    content += `}: ${componentName}Props) {\n`;
  }

  if (hasState === 'y') {
    content += `  const [isLoading, setIsLoading] = React.useState(false);\n\n`;
  }

  content += `  return (\n`;
  content += `    <div\n`;
  if (needsForwardRef === 'y') {
    content += `      ref={ref}\n`;
  }
  content += `      className={cn(\n`;
  content += `        'relative',\n`;
  content += `        className\n`;
  content += `      )}\n`;
  content += `      {...props}\n`;
  content += `    >\n`;
  content += `      {children}\n`;
  content += `    </div>\n`;
  content += `  );\n`;

  if (needsForwardRef === 'y') {
    content += `});\n\n`;
    content += `${componentName}.displayName = '${componentName}';\n`;
  } else {
    content += `}\n`;
  }

  // Write file
  fs.writeFileSync(filePath, content);

  console.log(`\n✅ Component created: ${filePath}`);
  console.log(`📁 Import with: import { ${componentName} } from '@/components/${type}/${fileName}';`);

  // Generate test file
  const testDir = path.join(process.cwd(), '__tests__', 'components', type);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testContent = `import { render, screen } from '@testing-library/react';
import { ${componentName} } from '@/components/${type}/${fileName}';

describe('${componentName}', () => {
  it('renders without crashing', () => {
    render(<${componentName}>Test content</${componentName}>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <${componentName} className="custom-class">Test</${componentName}>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
`;

  const testPath = path.join(testDir, `${fileName}.test.tsx`);
  fs.writeFileSync(testPath, testContent);

  console.log(`✅ Test created: ${testPath}`);
}

async function generatePage() {
  console.log('\n📄 Page Generator for Study Teddy\n');

  const route = await question('Route path (e.g., dashboard/analytics): ');
  const title = await question('Page title: ');
  const isProtected = await question('Is protected route? (y/n): ');
  const hasServerData = await question('Fetch server data? (y/n): ');

  const routeParts = route.split('/');
  const fileName = routeParts[routeParts.length - 1];
  const dirPath = path.join(process.cwd(), 'app');

  // Create route directories
  let currentPath = dirPath;
  for (const part of routeParts) {
    if (isProtected === 'y' && part === routeParts[0]) {
      currentPath = path.join(currentPath, `(dashboard)`);
    }
    currentPath = path.join(currentPath, part);
    if (!fs.existsSync(currentPath)) {
      fs.mkdirSync(currentPath, { recursive: true });
    }
  }

  const filePath = path.join(currentPath, 'page.tsx');

  let content = '';

  if (hasServerData === 'y') {
    content += `import { Metadata } from 'next';\n\n`;
  } else {
    content += `'use client';\n\n`;
  }

  content += `export const metadata: Metadata = {\n`;
  content += `  title: '${title} | Study Teddy',\n`;
  content += `  description: '${title} page for Study Teddy application',\n`;
  content += `};\n\n`;

  const pageName = toPascalCase(fileName) + 'Page';

  content += `export default function ${pageName}() {\n`;
  content += `  return (\n`;
  content += `    <div className="container mx-auto px-4 py-8">\n`;
  content += `      <h1 className="text-3xl font-bold mb-6">${title}</h1>\n`;
  content += `      <p className="text-muted-foreground mb-8">\n`;
  content += `        This is the ${title.toLowerCase()} page.\n`;
  content += `      </p>\n`;
  content += `      {/* Add your content here */}\n`;
  content += `    </div>\n`;
  content += `  );\n`;
  content += `}\n`;

  fs.writeFileSync(filePath, content);

  console.log(`\n✅ Page created: ${filePath}`);
  console.log(`🌐 Available at: http://localhost:3000/${route}`);
}

async function generateApiRoute() {
  console.log('\n🔌 API Route Generator for Study Teddy\n');

  const route = await question('API route path (e.g., tasks/[id]): ');
  const methods = await question('HTTP methods (GET,POST,PUT,DELETE): ');
  const hasAuth = await question('Requires authentication? (y/n): ');
  const hasValidation = await question('Has request validation? (y/n): ');

  const routeParts = route.split('/');
  let currentPath = path.join(process.cwd(), 'app', 'api');

  for (const part of routeParts) {
    currentPath = path.join(currentPath, part);
    if (!fs.existsSync(currentPath)) {
      fs.mkdirSync(currentPath, { recursive: true });
    }
  }

  const filePath = path.join(currentPath, 'route.ts');

  let content = `import { NextRequest, NextResponse } from 'next/server';\n`;

  if (hasAuth === 'y') {
    content += `import { auth } from '@/lib/auth';\n`;
  }

  if (hasValidation === 'y') {
    content += `import { z } from 'zod';\n`;
  }

  content += `\n`;

  if (hasValidation === 'y') {
    content += `const requestSchema = z.object({\n`;
    content += `  // Add your validation schema here\n`;
    content += `});\n\n`;
  }

  const methodList = methods.split(',').map(m => m.trim().toUpperCase());

  for (const method of methodList) {
    content += `export async function ${method}(request: NextRequest) {\n`;
    content += `  try {\n`;

    if (hasAuth === 'y') {
      content += `    const session = await auth();\n`;
      content += `    if (!session?.user) {\n`;
      content += `      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });\n`;
      content += `    }\n\n`;
    }

    if (method === 'GET') {
      content += `    // Handle GET request\n`;
      content += `    const data = { message: 'GET request successful' };\n`;
      content += `    return NextResponse.json(data);\n`;
    } else if (method === 'POST') {
      content += `    const body = await request.json();\n`;
      if (hasValidation === 'y') {
        content += `    const validatedData = requestSchema.parse(body);\n`;
      }
      content += `    // Handle POST request\n`;
      content += `    return NextResponse.json({ message: 'Created successfully' }, { status: 201 });\n`;
    } else {
      content += `    // Handle ${method} request\n`;
      content += `    return NextResponse.json({ message: '${method} successful' });\n`;
    }

    content += `  } catch (error) {\n`;
    content += `    console.error('${method} error:', error);\n`;
    content += `    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });\n`;
    content += `  }\n`;
    content += `}\n\n`;
  }

  fs.writeFileSync(filePath, content);

  console.log(`\n✅ API route created: ${filePath}`);
  console.log(`🔗 Available at: http://localhost:3000/api/${route}`);
}

async function runPerformanceAudit() {
  console.log('\n⚡ Running Performance Audit...\n');

  try {
    // Build the application
    console.log('Building application...');
    execSync('npm run build', { stdio: 'inherit' });

    // Run bundle analyzer
    console.log('\nAnalyzing bundle...');
    execSync('ANALYZE=true npm run build', { stdio: 'inherit' });

    console.log('\n✅ Performance audit completed!');
    console.log('📊 Bundle analysis available in your browser');
  } catch (error) {
    console.error('❌ Performance audit failed:', error.message);
  }
}

async function main() {
  console.log('🎯 Study Teddy Next.js Development Agent');
  console.log('=====================================\n');

  const choice = await question(`Choose an action:
1. Generate Component
2. Generate Page
3. Generate API Route
4. Run Performance Audit
5. Exit

Enter your choice (1-5): `);

  switch (choice) {
    case '1':
      await generateComponent();
      break;
    case '2':
      await generatePage();
      break;
    case '3':
      await generateApiRoute();
      break;
    case '4':
      await runPerformanceAudit();
      break;
    case '5':
      console.log('👋 Goodbye!');
      process.exit(0);
    default:
      console.log('❌ Invalid choice');
  }

  rl.close();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateComponent,
  generatePage,
  generateApiRoute,
  runPerformanceAudit
};