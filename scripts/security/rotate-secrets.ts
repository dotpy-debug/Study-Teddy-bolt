#!/usr/bin/env node

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Secrets rotation script for zero-downtime secret updates
 */

interface RotationConfig {
  secret: string;
  rotationInterval: number; // days
  gracePeriod: number; // hours
  notifyBeforeRotation: number; // hours
}

interface RotationState {
  secret: string;
  currentVersion: string;
  previousVersion?: string;
  rotatedAt: string;
  nextRotation: string;
  status: 'active' | 'rotating' | 'pending';
}

class SecretsRotator {
  private readonly stateFile: string;
  private readonly configFile: string;
  private rotationState: Map<string, RotationState>;
  private rotationConfig: RotationConfig[];

  constructor() {
    this.stateFile = path.join(process.cwd(), '.secrets-rotation-state.json');
    this.configFile = path.join(process.cwd(), 'secrets-rotation.config.json');
    this.rotationState = new Map();
    this.rotationConfig = [];
    this.loadState();
    this.loadConfig();
  }

  /**
   * Load rotation state from file
   */
  private loadState(): void {
    if (fs.existsSync(this.stateFile)) {
      try {
        const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf-8'));
        Object.entries(state).forEach(([key, value]) => {
          this.rotationState.set(key, value as RotationState);
        });
      } catch (error) {
        console.error('Failed to load rotation state:', error);
      }
    }
  }

  /**
   * Save rotation state to file
   */
  private saveState(): void {
    const state: Record<string, RotationState> = {};
    this.rotationState.forEach((value, key) => {
      state[key] = value;
    });
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
  }

  /**
   * Load rotation configuration
   */
  private loadConfig(): void {
    const defaultConfig: RotationConfig[] = [
      {
        secret: 'JWT_SECRET',
        rotationInterval: 30, // Rotate every 30 days
        gracePeriod: 24, // 24 hour grace period
        notifyBeforeRotation: 48, // Notify 48 hours before
      },
      {
        secret: 'JWT_REFRESH_SECRET',
        rotationInterval: 30,
        gracePeriod: 24,
        notifyBeforeRotation: 48,
      },
      {
        secret: 'ENCRYPTION_KEY',
        rotationInterval: 90, // Rotate every 90 days
        gracePeriod: 72,
        notifyBeforeRotation: 168, // 1 week
      },
      {
        secret: 'SESSION_SECRET',
        rotationInterval: 30,
        gracePeriod: 12,
        notifyBeforeRotation: 24,
      },
      {
        secret: 'CSRF_SECRET',
        rotationInterval: 30,
        gracePeriod: 12,
        notifyBeforeRotation: 24,
      },
      {
        secret: 'DB_PASSWORD',
        rotationInterval: 60,
        gracePeriod: 48,
        notifyBeforeRotation: 72,
      },
      {
        secret: 'REDIS_PASSWORD',
        rotationInterval: 60,
        gracePeriod: 24,
        notifyBeforeRotation: 48,
      },
      {
        secret: 'INTERNAL_API_KEY',
        rotationInterval: 90,
        gracePeriod: 48,
        notifyBeforeRotation: 72,
      },
    ];

    if (fs.existsSync(this.configFile)) {
      try {
        this.rotationConfig = JSON.parse(fs.readFileSync(this.configFile, 'utf-8'));
      } catch (error) {
        console.warn('Failed to load custom config, using defaults');
        this.rotationConfig = defaultConfig;
      }
    } else {
      this.rotationConfig = defaultConfig;
      // Save default config for reference
      fs.writeFileSync(this.configFile, JSON.stringify(defaultConfig, null, 2));
    }
  }

  /**
   * Generate a new secret value
   */
  private generateNewSecret(secretName: string): string {
    // Determine secret type and generate accordingly
    if (secretName.includes('JWT')) {
      return crypto.randomBytes(64).toString('base64');
    } else if (secretName.includes('PASSWORD')) {
      return this.generatePassword(24);
    } else if (secretName.includes('KEY')) {
      return crypto.randomBytes(32).toString('hex');
    } else if (secretName.includes('SECRET')) {
      return crypto.randomBytes(32).toString('hex');
    } else {
      return crypto.randomBytes(32).toString('base64url');
    }
  }

  /**
   * Generate a secure password
   */
  private generatePassword(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }
    return password;
  }

  /**
   * Check if a secret needs rotation
   */
  checkRotationNeeded(secretName: string): {
    needed: boolean;
    reason?: string;
    daysUntilRotation?: number;
  } {
    const config = this.rotationConfig.find(c => c.secret === secretName);
    if (!config) {
      return { needed: false, reason: 'No rotation config found' };
    }

    const state = this.rotationState.get(secretName);
    if (!state) {
      return { needed: true, reason: 'No rotation state found' };
    }

    const nextRotationDate = new Date(state.nextRotation);
    const now = new Date();
    const daysUntilRotation = Math.ceil((nextRotationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (now >= nextRotationDate) {
      return { needed: true, reason: 'Rotation interval exceeded', daysUntilRotation: 0 };
    }

    return { needed: false, daysUntilRotation };
  }

  /**
   * Rotate a specific secret
   */
  async rotateSecret(secretName: string): Promise<{
    success: boolean;
    newValue?: string;
    error?: string;
  }> {
    try {
      const config = this.rotationConfig.find(c => c.secret === secretName);
      if (!config) {
        return { success: false, error: 'No rotation config found' };
      }

      console.log(`Starting rotation for ${secretName}...`);

      // Get current state
      const currentState = this.rotationState.get(secretName);
      const currentValue = currentState?.currentVersion;

      // Generate new secret
      const newValue = this.generateNewSecret(secretName);

      // Update state
      const newState: RotationState = {
        secret: secretName,
        currentVersion: newValue,
        previousVersion: currentValue,
        rotatedAt: new Date().toISOString(),
        nextRotation: new Date(Date.now() + config.rotationInterval * 24 * 60 * 60 * 1000).toISOString(),
        status: 'rotating',
      };

      this.rotationState.set(secretName, newState);
      this.saveState();

      // Start grace period
      console.log(`Secret rotated. Grace period: ${config.gracePeriod} hours`);
      console.log(`Both old and new secrets will be valid during grace period.`);

      // Schedule cleanup after grace period
      setTimeout(() => {
        this.completeRotation(secretName);
      }, config.gracePeriod * 60 * 60 * 1000);

      return { success: true, newValue };
    } catch (error) {
      console.error(`Failed to rotate ${secretName}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Complete rotation after grace period
   */
  private completeRotation(secretName: string): void {
    const state = this.rotationState.get(secretName);
    if (state && state.status === 'rotating') {
      state.previousVersion = undefined;
      state.status = 'active';
      this.rotationState.set(secretName, state);
      this.saveState();
      console.log(`Rotation completed for ${secretName}. Old secret invalidated.`);
    }
  }

  /**
   * Rotate all secrets that need rotation
   */
  async rotateAll(): Promise<void> {
    console.log('Checking all secrets for rotation...\n');

    for (const config of this.rotationConfig) {
      const check = this.checkRotationNeeded(config.secret);

      if (check.needed) {
        console.log(`✅ ${config.secret}: Needs rotation (${check.reason})`);
        const result = await this.rotateSecret(config.secret);
        if (result.success) {
          console.log(`   Rotated successfully\n`);
        } else {
          console.log(`   ❌ Rotation failed: ${result.error}\n`);
        }
      } else {
        console.log(`⏳ ${config.secret}: No rotation needed (${check.daysUntilRotation} days until next rotation)\n`);
      }
    }
  }

  /**
   * Get rotation status for all secrets
   */
  getRotationStatus(): void {
    console.log('\n========== SECRET ROTATION STATUS ==========\n');

    for (const config of this.rotationConfig) {
      const state = this.rotationState.get(config.secret);
      const check = this.checkRotationNeeded(config.secret);

      console.log(`${config.secret}:`);
      if (state) {
        console.log(`  Status: ${state.status}`);
        console.log(`  Last Rotated: ${state.rotatedAt || 'Never'}`);
        console.log(`  Next Rotation: ${state.nextRotation}`);
        if (check.daysUntilRotation !== undefined) {
          console.log(`  Days Until Rotation: ${check.daysUntilRotation}`);
        }
      } else {
        console.log(`  Status: Not initialized`);
      }
      console.log(`  Rotation Interval: ${config.rotationInterval} days`);
      console.log(`  Grace Period: ${config.gracePeriod} hours`);
      console.log('');
    }

    console.log('============================================\n');
  }

  /**
   * Initialize rotation for all configured secrets
   */
  initializeRotation(): void {
    console.log('Initializing secret rotation...\n');

    for (const config of this.rotationConfig) {
      if (!this.rotationState.has(config.secret)) {
        const state: RotationState = {
          secret: config.secret,
          currentVersion: this.generateNewSecret(config.secret),
          rotatedAt: new Date().toISOString(),
          nextRotation: new Date(Date.now() + config.rotationInterval * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
        };
        this.rotationState.set(config.secret, state);
        console.log(`Initialized rotation for ${config.secret}`);
      }
    }

    this.saveState();
    console.log('\nRotation initialization complete!');
  }

  /**
   * Export current secrets to environment file
   */
  exportToEnv(filepath: string): void {
    const secrets: string[] = [];

    this.rotationState.forEach((state, secretName) => {
      secrets.push(`# ${secretName} - Rotated: ${state.rotatedAt}`);
      secrets.push(`${secretName}="${state.currentVersion}"`);

      // During grace period, also export the previous version
      if (state.status === 'rotating' && state.previousVersion) {
        secrets.push(`${secretName}_PREVIOUS="${state.previousVersion}"`);
      }
      secrets.push('');
    });

    const content = `# Managed Secrets - Auto-generated
# Generated: ${new Date().toISOString()}
# DO NOT EDIT MANUALLY

${secrets.join('\n')}`;

    fs.writeFileSync(filepath, content);
    console.log(`Secrets exported to ${filepath}`);
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const rotator = new SecretsRotator();

  switch (command) {
    case 'rotate':
      const secretName = args[1];
      if (secretName) {
        rotator.rotateSecret(secretName).then(result => {
          if (result.success) {
            console.log('✅ Secret rotated successfully');
          } else {
            console.log(`❌ Rotation failed: ${result.error}`);
            process.exit(1);
          }
        });
      } else {
        rotator.rotateAll();
      }
      break;

    case 'status':
      rotator.getRotationStatus();
      break;

    case 'init':
      rotator.initializeRotation();
      break;

    case 'export':
      const outputPath = args[1] || '.env.rotated';
      rotator.exportToEnv(outputPath);
      break;

    case 'help':
    default:
      console.log(`
Secret Rotation Tool

Usage:
  npm run secrets:rotate [command] [options]

Commands:
  rotate [secret]  Rotate a specific secret or all secrets
  status          Show rotation status for all secrets
  init            Initialize rotation tracking
  export [file]   Export current secrets to env file
  help            Show this help message

Examples:
  npm run secrets:rotate init
  npm run secrets:rotate rotate JWT_SECRET
  npm run secrets:rotate rotate
  npm run secrets:rotate status
  npm run secrets:rotate export .env.production

Configuration:
  Edit secrets-rotation.config.json to customize rotation intervals
      `);
      break;
  }
}

export { SecretsRotator, RotationConfig, RotationState };