// Global teardown for Playwright tests
import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('Running global teardown...');

  try {
    // Clean up authentication files
    const authDir = path.join(process.cwd(), 'playwright', '.auth');
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
      console.log('Cleaned up authentication files');
    }

    // Clean up test artifacts if needed
    const testResultsDir = path.join(process.cwd(), 'test-results');
    if (fs.existsSync(testResultsDir)) {
      // Keep test results but clean up temporary files
      const tempFiles = fs.readdirSync(testResultsDir).filter(file =>
        file.includes('temp') || file.includes('tmp')
      );

      tempFiles.forEach(file => {
        const filePath = path.join(testResultsDir, file);
        fs.rmSync(filePath, { force: true });
      });

      if (tempFiles.length > 0) {
        console.log(`Cleaned up ${tempFiles.length} temporary test files`);
      }
    }

    // Additional cleanup tasks can be added here
    // For example:
    // - Clean up test database entries
    // - Reset external service states
    // - Clear cached data

    console.log('Global teardown completed successfully');
  } catch (error) {
    console.error('Error during global teardown:', error);
    // Don't fail the test suite if teardown has issues
  }
}

export default globalTeardown;