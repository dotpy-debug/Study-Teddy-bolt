#!/usr/bin/env node

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Secret generation and management script
 */

interface SecretConfig {
  name: string;
  length: number;
  type: 'hex' | 'base64' | 'alphanumeric' | 'jwt' | 'password';
  description: string;
}

interface GeneratedSecret {
  name: string;
  value: string;
  description: string;
  generatedAt: string;
  expiresAt?: string;
}

class SecretsGenerator {
  private readonly secrets: GeneratedSecret[] = [];
  private readonly outputPath: string;

  constructor(outputPath?: string) {
    this.outputPath = outputPath || path.join(process.cwd(), '.env.secrets');
  }

  /**
   * Generate a random hex string
   */
  private generateHex(length: number): string {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }

  /**
   * Generate a random base64 string
   */
  private generateBase64(length: number): string {
    return crypto.randomBytes(Math.ceil(length * 3 / 4))
      .toString('base64')
      .slice(0, length)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate a random alphanumeric string
   */
  private generateAlphanumeric(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  }

  /**
   * Generate a secure password with special characters
   */
  private generatePassword(length: number): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = lowercase + uppercase + numbers + special;

    // Ensure at least one character from each set
    let password = '';
    password += lowercase[crypto.randomInt(lowercase.length)];
    password += uppercase[crypto.randomInt(uppercase.length)];
    password += numbers[crypto.randomInt(numbers.length)];
    password += special[crypto.randomInt(special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[crypto.randomInt(allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
  }

  /**
   * Generate a JWT secret
   */
  private generateJWTSecret(): string {
    return crypto.randomBytes(64).toString('base64');
  }

  /**
   * Generate a secret based on configuration
   */
  generateSecret(config: SecretConfig): GeneratedSecret {
    let value: string;

    switch (config.type) {
      case 'hex':
        value = this.generateHex(config.length);
        break;
      case 'base64':
        value = this.generateBase64(config.length);
        break;
      case 'alphanumeric':
        value = this.generateAlphanumeric(config.length);
        break;
      case 'password':
        value = this.generatePassword(config.length);
        break;
      case 'jwt':
        value = this.generateJWTSecret();
        break;
      default:
        throw new Error(`Unknown secret type: ${config.type}`);
    }

    const secret: GeneratedSecret = {
      name: config.name,
      value,
      description: config.description,
      generatedAt: new Date().toISOString(),
    };

    this.secrets.push(secret);
    return secret;
  }

  /**
   * Generate all required secrets
   */
  generateAllSecrets(): GeneratedSecret[] {
    const secretConfigs: SecretConfig[] = [
      // JWT Secrets
      {
        name: 'JWT_SECRET',
        length: 64,
        type: 'jwt',
        description: 'Main JWT signing secret',
      },
      {
        name: 'JWT_REFRESH_SECRET',
        length: 64,
        type: 'jwt',
        description: 'JWT refresh token secret',
      },

      // Encryption Keys
      {
        name: 'ENCRYPTION_KEY',
        length: 32,
        type: 'hex',
        description: 'Main encryption key for sensitive data',
      },
      {
        name: 'ENCRYPTION_IV',
        length: 16,
        type: 'hex',
        description: 'Initialization vector for encryption',
      },

      // Session Secrets
      {
        name: 'SESSION_SECRET',
        length: 64,
        type: 'base64',
        description: 'Session management secret',
      },
      {
        name: 'COOKIE_SECRET',
        length: 32,
        type: 'alphanumeric',
        description: 'Cookie signing secret',
      },

      // CSRF Protection
      {
        name: 'CSRF_SECRET',
        length: 32,
        type: 'hex',
        description: 'CSRF token generation secret',
      },

      // Database
      {
        name: 'DB_PASSWORD',
        length: 24,
        type: 'password',
        description: 'Database password',
      },
      {
        name: 'DB_ENCRYPTION_KEY',
        length: 32,
        type: 'hex',
        description: 'Database field encryption key',
      },

      // Redis
      {
        name: 'REDIS_PASSWORD',
        length: 24,
        type: 'password',
        description: 'Redis password',
      },

      // API Keys
      {
        name: 'INTERNAL_API_KEY',
        length: 48,
        type: 'alphanumeric',
        description: 'Internal API communication key',
      },
      {
        name: 'WEBHOOK_SECRET',
        length: 32,
        type: 'hex',
        description: 'Webhook signature verification secret',
      },

      // Admin
      {
        name: 'ADMIN_PASSWORD',
        length: 20,
        type: 'password',
        description: 'Default admin password (change after first login)',
      },

      // Monitoring
      {
        name: 'SENTRY_AUTH_TOKEN',
        length: 64,
        type: 'hex',
        description: 'Sentry authentication token',
      },
      {
        name: 'MONITORING_API_KEY',
        length: 32,
        type: 'alphanumeric',
        description: 'Monitoring service API key',
      },
    ];

    secretConfigs.forEach(config => this.generateSecret(config));
    return this.secrets;
  }

  /**
   * Save secrets to file
   */
  saveToFile(filepath?: string): void {
    const outputPath = filepath || this.outputPath;
    const envContent = this.secrets
      .map(secret => `# ${secret.description}\n# Generated: ${secret.generatedAt}\n${secret.name}="${secret.value}"`)
      .join('\n\n');

    const header = `# ================================================
# GENERATED SECRETS - DO NOT COMMIT TO VERSION CONTROL
# Generated at: ${new Date().toISOString()}
# ================================================

`;

    fs.writeFileSync(outputPath, header + envContent);
    console.log(`Secrets saved to: ${outputPath}`);
  }

  /**
   * Save secrets as JSON (for secure storage)
   */
  saveAsJSON(filepath?: string): void {
    const outputPath = filepath || this.outputPath.replace('.env', '.json');
    const jsonContent = {
      generated: new Date().toISOString(),
      secrets: this.secrets.reduce((acc, secret) => {
        acc[secret.name] = {
          value: secret.value,
          description: secret.description,
          generatedAt: secret.generatedAt,
        };
        return acc;
      }, {} as Record<string, any>),
    };

    fs.writeFileSync(outputPath, JSON.stringify(jsonContent, null, 2));
    console.log(`Secrets JSON saved to: ${outputPath}`);
  }

  /**
   * Validate existing secrets
   */
  static validateSecrets(envPath: string): {
    valid: boolean;
    missing: string[];
    weak: string[];
  } {
    const requiredSecrets = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_KEY',
      'SESSION_SECRET',
      'CSRF_SECRET',
    ];

    const missing: string[] = [];
    const weak: string[] = [];

    if (!fs.existsSync(envPath)) {
      return { valid: false, missing: requiredSecrets, weak: [] };
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envVars: Record<string, string> = {};

    envContent.split('\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').replace(/^["']|["']$/g, '');
        }
      }
    });

    requiredSecrets.forEach(secret => {
      if (!envVars[secret]) {
        missing.push(secret);
      } else if (envVars[secret].length < 32) {
        weak.push(secret);
      }
    });

    return {
      valid: missing.length === 0 && weak.length === 0,
      missing,
      weak,
    };
  }

  /**
   * Display secrets (for copying to secure storage)
   */
  displaySecrets(): void {
    console.log('\n========== GENERATED SECRETS ==========\n');
    this.secrets.forEach(secret => {
      console.log(`${secret.name}:`);
      console.log(`  Description: ${secret.description}`);
      console.log(`  Value: ${secret.value}`);
      console.log(`  Generated: ${secret.generatedAt}`);
      console.log('');
    });
    console.log('========================================\n');
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const generator = new SecretsGenerator();

  switch (command) {
    case 'generate':
      console.log('Generating secrets...');
      generator.generateAllSecrets();
      generator.saveToFile();
      generator.saveAsJSON();
      console.log('Secrets generated successfully!');
      break;

    case 'validate':
      const envPath = args[1] || '.env';
      console.log(`Validating secrets in ${envPath}...`);
      const validation = SecretsGenerator.validateSecrets(envPath);
      if (validation.valid) {
        console.log('✅ All secrets are valid!');
      } else {
        if (validation.missing.length > 0) {
          console.log('❌ Missing secrets:', validation.missing.join(', '));
        }
        if (validation.weak.length > 0) {
          console.log('⚠️  Weak secrets:', validation.weak.join(', '));
        }
      }
      break;

    case 'display':
      console.log('Generating and displaying secrets...');
      generator.generateAllSecrets();
      generator.displaySecrets();
      break;

    case 'help':
    default:
      console.log(`
Secret Generation Tool

Usage:
  npm run secrets:generate [command] [options]

Commands:
  generate    Generate all secrets and save to files
  validate    Validate existing secrets in .env file
  display     Generate and display secrets (without saving)
  help        Show this help message

Examples:
  npm run secrets:generate generate
  npm run secrets:generate validate .env.production
  npm run secrets:generate display
      `);
      break;
  }
}

export { SecretsGenerator, SecretConfig, GeneratedSecret };