#!/usr/bin/env bun

/**
 * Study Teddy Secrets Manager
 *
 * Comprehensive secrets management tool for all deployment environments.
 * Supports multiple secret backends and provides secure operations.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

// ============================================
// Types and Interfaces
// ============================================

interface SecretConfig {
  name: string;
  length: number;
  type: 'random' | 'jwt' | 'password' | 'api_key';
  description: string;
  environments: string[];
  rotationDays: number;
  critical: boolean;
}

interface SecretValue {
  value: string;
  createdAt: string;
  rotatedAt?: string;
  expiresAt?: string;
  metadata: {
    environment: string;
    version: number;
    creator: string;
  };
}

interface SecretBackend {
  name: string;
  store(key: string, value: SecretValue): Promise<void>;
  retrieve(key: string): Promise<SecretValue | null>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
  rotate(key: string): Promise<SecretValue>;
}

// ============================================
// Secret Generation Utilities
// ============================================

class SecretGenerator {
  /**
   * Generate a cryptographically secure random string
   */
  static generateRandom(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomArray = randomBytes(length);

    for (let i = 0; i < length; i++) {
      result += chars[randomArray[i] % chars.length];
    }

    return result;
  }

  /**
   * Generate a JWT secret (hex format)
   */
  static generateJWT(length: number = 64): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure password
   */
  static generatePassword(length: number = 32): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = lowercase + uppercase + numbers + symbols;

    let password = '';
    const randomArray = randomBytes(length);

    // Ensure at least one character from each set
    password += lowercase[randomArray[0] % lowercase.length];
    password += uppercase[randomArray[1] % uppercase.length];
    password += numbers[randomArray[2] % numbers.length];
    password += symbols[randomArray[3] % symbols.length];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[randomArray[i] % allChars.length];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Generate an API key format
   */
  static generateAPIKey(prefix: string = 'sk', length: number = 48): string {
    const randomPart = this.generateRandom(length);
    return `${prefix}_${randomPart}`;
  }

  /**
   * Generate secret based on type
   */
  static generate(type: string, length: number): string {
    switch (type) {
      case 'jwt':
        return this.generateJWT(length);
      case 'password':
        return this.generatePassword(length);
      case 'api_key':
        return this.generateAPIKey('key', length);
      case 'random':
      default:
        return this.generateRandom(length);
    }
  }
}

// ============================================
// Secret Backends
// ============================================

/**
 * Local file-based secret backend (for development)
 */
class LocalSecretBackend implements SecretBackend {
  name = 'local';
  private secretsDir: string;

  constructor(secretsDir: string = '.secrets') {
    this.secretsDir = secretsDir;

    // Create secrets directory if it doesn't exist
    if (!existsSync(this.secretsDir)) {
      execSync(`mkdir -p ${this.secretsDir}`, { stdio: 'ignore' });
    }
  }

  async store(key: string, value: SecretValue): Promise<void> {
    const filePath = join(this.secretsDir, `${key}.json`);
    writeFileSync(filePath, JSON.stringify(value, null, 2));
  }

  async retrieve(key: string): Promise<SecretValue | null> {
    const filePath = join(this.secretsDir, `${key}.json`);

    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.secretsDir, `${key}.json`);

    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async list(): Promise<string[]> {
    try {
      const files = execSync(`ls ${this.secretsDir}/*.json`, { encoding: 'utf-8' })
        .trim()
        .split('\n')
        .map(file => file.replace('.json', '').replace(`${this.secretsDir}/`, ''));

      return files;
    } catch {
      return [];
    }
  }

  async rotate(key: string): Promise<SecretValue> {
    const existing = await this.retrieve(key);

    if (!existing) {
      throw new Error(`Secret ${key} not found`);
    }

    const newValue: SecretValue = {
      ...existing,
      rotatedAt: new Date().toISOString(),
      metadata: {
        ...existing.metadata,
        version: existing.metadata.version + 1,
      },
    };

    await this.store(key, newValue);
    return newValue;
  }
}

/**
 * Kubernetes secret backend
 */
class KubernetesSecretBackend implements SecretBackend {
  name = 'kubernetes';
  private namespace: string;

  constructor(namespace: string = 'default') {
    this.namespace = namespace;
  }

  async store(key: string, value: SecretValue): Promise<void> {
    const secretData = Buffer.from(JSON.stringify(value)).toString('base64');
    const secretYaml = `
apiVersion: v1
kind: Secret
metadata:
  name: ${key}
  namespace: ${this.namespace}
  labels:
    managed-by: studyteddy-secrets-manager
type: Opaque
data:
  value: ${secretData}
`;

    // Write to temporary file and apply
    const tempFile = `/tmp/${key}-secret.yaml`;
    writeFileSync(tempFile, secretYaml);

    try {
      execSync(`kubectl apply -f ${tempFile}`, { stdio: 'ignore' });
    } finally {
      unlinkSync(tempFile);
    }
  }

  async retrieve(key: string): Promise<SecretValue | null> {
    try {
      const secretData = execSync(
        `kubectl get secret ${key} -n ${this.namespace} -o jsonpath='{.data.value}'`,
        { encoding: 'utf-8' }
      );

      const decodedData = Buffer.from(secretData, 'base64').toString('utf-8');
      return JSON.parse(decodedData);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      execSync(`kubectl delete secret ${key} -n ${this.namespace}`, { stdio: 'ignore' });
    } catch {
      // Secret doesn't exist, ignore
    }
  }

  async list(): Promise<string[]> {
    try {
      const output = execSync(
        `kubectl get secrets -n ${this.namespace} -l managed-by=studyteddy-secrets-manager -o name`,
        { encoding: 'utf-8' }
      );

      return output
        .trim()
        .split('\n')
        .map(line => line.replace('secret/', ''))
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  async rotate(key: string): Promise<SecretValue> {
    const existing = await this.retrieve(key);

    if (!existing) {
      throw new Error(`Secret ${key} not found in Kubernetes`);
    }

    const newValue: SecretValue = {
      ...existing,
      rotatedAt: new Date().toISOString(),
      metadata: {
        ...existing.metadata,
        version: existing.metadata.version + 1,
      },
    };

    await this.store(key, newValue);
    return newValue;
  }
}

/**
 * AWS Secrets Manager backend
 */
class AWSSecretsManagerBackend implements SecretBackend {
  name = 'aws';
  private region: string;

  constructor(region: string = 'us-east-1') {
    this.region = region;
  }

  async store(key: string, value: SecretValue): Promise<void> {
    const secretString = JSON.stringify(value);
    const command = `aws secretsmanager create-secret --name "${key}" --secret-string '${secretString}' --region ${this.region} 2>/dev/null || aws secretsmanager update-secret --secret-id "${key}" --secret-string '${secretString}' --region ${this.region}`;

    execSync(command, { stdio: 'ignore' });
  }

  async retrieve(key: string): Promise<SecretValue | null> {
    try {
      const output = execSync(
        `aws secretsmanager get-secret-value --secret-id "${key}" --region ${this.region} --query SecretString --output text`,
        { encoding: 'utf-8' }
      );

      return JSON.parse(output.trim());
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      execSync(
        `aws secretsmanager delete-secret --secret-id "${key}" --force-delete-without-recovery --region ${this.region}`,
        { stdio: 'ignore' }
      );
    } catch {
      // Secret doesn't exist, ignore
    }
  }

  async list(): Promise<string[]> {
    try {
      const output = execSync(
        `aws secretsmanager list-secrets --region ${this.region} --query 'SecretList[].Name' --output text`,
        { encoding: 'utf-8' }
      );

      return output.trim().split('\t').filter(Boolean);
    } catch {
      return [];
    }
  }

  async rotate(key: string): Promise<SecretValue> {
    const existing = await this.retrieve(key);

    if (!existing) {
      throw new Error(`Secret ${key} not found in AWS Secrets Manager`);
    }

    const newValue: SecretValue = {
      ...existing,
      rotatedAt: new Date().toISOString(),
      metadata: {
        ...existing.metadata,
        version: existing.metadata.version + 1,
      },
    };

    await this.store(key, newValue);
    return newValue;
  }
}

// ============================================
// Secrets Manager
// ============================================

class SecretsManager {
  private backends: Map<string, SecretBackend> = new Map();
  private defaultBackend: string;

  constructor(defaultBackend: string = 'local') {
    this.defaultBackend = defaultBackend;

    // Register available backends
    this.backends.set('local', new LocalSecretBackend());
    this.backends.set('kubernetes', new KubernetesSecretBackend());
    this.backends.set('aws', new AWSSecretsManagerBackend());
  }

  /**
   * Get backend by name
   */
  private getBackend(name?: string): SecretBackend {
    const backendName = name || this.defaultBackend;
    const backend = this.backends.get(backendName);

    if (!backend) {
      throw new Error(`Backend ${backendName} not found`);
    }

    return backend;
  }

  /**
   * Generate and store a new secret
   */
  async generateSecret(config: SecretConfig, environment: string, backend?: string): Promise<string> {
    const secretValue = SecretGenerator.generate(config.type, config.length);
    const secretKey = `${environment}/${config.name}`;

    const value: SecretValue = {
      value: secretValue,
      createdAt: new Date().toISOString(),
      metadata: {
        environment,
        version: 1,
        creator: process.env.USER || 'unknown',
      },
    };

    if (config.rotationDays > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + config.rotationDays);
      value.expiresAt = expiresAt.toISOString();
    }

    await this.getBackend(backend).store(secretKey, value);

    console.log(`✅ Generated secret: ${config.name} for ${environment}`);
    return secretValue;
  }

  /**
   * Retrieve a secret
   */
  async getSecret(name: string, environment: string, backend?: string): Promise<string | null> {
    const secretKey = `${environment}/${name}`;
    const secretValue = await this.getBackend(backend).retrieve(secretKey);

    return secretValue?.value || null;
  }

  /**
   * Rotate a secret
   */
  async rotateSecret(name: string, environment: string, config: SecretConfig, backend?: string): Promise<string> {
    const secretKey = `${environment}/${name}`;
    const newSecretValue = SecretGenerator.generate(config.type, config.length);

    const existing = await this.getBackend(backend).retrieve(secretKey);

    if (!existing) {
      throw new Error(`Secret ${secretKey} not found`);
    }

    const value: SecretValue = {
      value: newSecretValue,
      createdAt: existing.createdAt,
      rotatedAt: new Date().toISOString(),
      metadata: {
        ...existing.metadata,
        version: existing.metadata.version + 1,
      },
    };

    if (config.rotationDays > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + config.rotationDays);
      value.expiresAt = expiresAt.toISOString();
    }

    await this.getBackend(backend).store(secretKey, value);

    console.log(`🔄 Rotated secret: ${name} for ${environment}`);
    return newSecretValue;
  }

  /**
   * List all secrets
   */
  async listSecrets(backend?: string): Promise<string[]> {
    return await this.getBackend(backend).list();
  }

  /**
   * Delete a secret
   */
  async deleteSecret(name: string, environment: string, backend?: string): Promise<void> {
    const secretKey = `${environment}/${name}`;
    await this.getBackend(backend).delete(secretKey);

    console.log(`🗑️  Deleted secret: ${name} for ${environment}`);
  }

  /**
   * Check for expired secrets
   */
  async checkExpiredSecrets(backend?: string): Promise<Array<{key: string, expiresAt: string}>> {
    const allSecrets = await this.listSecrets(backend);
    const expiredSecrets: Array<{key: string, expiresAt: string}> = [];

    for (const secretKey of allSecrets) {
      const secretValue = await this.getBackend(backend).retrieve(secretKey);

      if (secretValue?.expiresAt) {
        const expiresAt = new Date(secretValue.expiresAt);
        const now = new Date();

        if (expiresAt <= now) {
          expiredSecrets.push({
            key: secretKey,
            expiresAt: secretValue.expiresAt,
          });
        }
      }
    }

    return expiredSecrets;
  }

  /**
   * Auto-rotate expired secrets
   */
  async autoRotateExpired(configs: SecretConfig[], backend?: string): Promise<void> {
    const expiredSecrets = await this.checkExpiredSecrets(backend);

    for (const expired of expiredSecrets) {
      const [environment, name] = expired.key.split('/');
      const config = configs.find(c => c.name === name);

      if (config && config.environments.includes(environment)) {
        try {
          await this.rotateSecret(name, environment, config, backend);
          console.log(`✅ Auto-rotated expired secret: ${expired.key}`);
        } catch (error) {
          console.error(`❌ Failed to auto-rotate secret: ${expired.key}`, error);
        }
      }
    }
  }
}

// ============================================
// Secret Configurations
// ============================================

const SECRET_CONFIGS: SecretConfig[] = [
  {
    name: 'JWT_SECRET',
    length: 64,
    type: 'jwt',
    description: 'JWT signing secret',
    environments: ['local', 'development', 'staging', 'production'],
    rotationDays: 30,
    critical: true,
  },
  {
    name: 'NEXTAUTH_SECRET',
    length: 64,
    type: 'random',
    description: 'NextAuth.js secret',
    environments: ['local', 'development', 'staging', 'production'],
    rotationDays: 30,
    critical: true,
  },
  {
    name: 'BETTER_AUTH_SECRET',
    length: 64,
    type: 'random',
    description: 'Better Auth secret',
    environments: ['local', 'development', 'staging', 'production'],
    rotationDays: 30,
    critical: true,
  },
  {
    name: 'DATABASE_PASSWORD',
    length: 32,
    type: 'password',
    description: 'Database password',
    environments: ['development', 'staging', 'production'],
    rotationDays: 7,
    critical: true,
  },
  {
    name: 'REDIS_PASSWORD',
    length: 32,
    type: 'password',
    description: 'Redis password',
    environments: ['staging', 'production'],
    rotationDays: 14,
    critical: false,
  },
  {
    name: 'WEBHOOK_SECRET',
    length: 48,
    type: 'random',
    description: 'Webhook verification secret',
    environments: ['development', 'staging', 'production'],
    rotationDays: 90,
    critical: false,
  },
];

// ============================================
// CLI Interface
// ============================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  const secretsManager = new SecretsManager(process.env.SECRETS_BACKEND || 'local');

  try {
    switch (command) {
      case 'generate':
        await handleGenerate(secretsManager, args.slice(1));
        break;

      case 'get':
        await handleGet(secretsManager, args.slice(1));
        break;

      case 'rotate':
        await handleRotate(secretsManager, args.slice(1));
        break;

      case 'list':
        await handleList(secretsManager, args.slice(1));
        break;

      case 'delete':
        await handleDelete(secretsManager, args.slice(1));
        break;

      case 'check-expired':
        await handleCheckExpired(secretsManager, args.slice(1));
        break;

      case 'auto-rotate':
        await handleAutoRotate(secretsManager, args.slice(1));
        break;

      case 'init-environment':
        await handleInitEnvironment(secretsManager, args.slice(1));
        break;

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

async function handleGenerate(manager: SecretsManager, args: string[]): Promise<void> {
  const [secretName, environment, backend] = args;

  if (!secretName || !environment) {
    throw new Error('Usage: generate <secret-name> <environment> [backend]');
  }

  const config = SECRET_CONFIGS.find(c => c.name === secretName);
  if (!config) {
    throw new Error(`Secret configuration not found: ${secretName}`);
  }

  if (!config.environments.includes(environment)) {
    throw new Error(`Environment ${environment} not supported for secret ${secretName}`);
  }

  await manager.generateSecret(config, environment, backend);
}

async function handleGet(manager: SecretsManager, args: string[]): Promise<void> {
  const [secretName, environment, backend] = args;

  if (!secretName || !environment) {
    throw new Error('Usage: get <secret-name> <environment> [backend]');
  }

  const secret = await manager.getSecret(secretName, environment, backend);

  if (secret) {
    console.log(secret);
  } else {
    console.log('Secret not found');
  }
}

async function handleRotate(manager: SecretsManager, args: string[]): Promise<void> {
  const [secretName, environment, backend] = args;

  if (!secretName || !environment) {
    throw new Error('Usage: rotate <secret-name> <environment> [backend]');
  }

  const config = SECRET_CONFIGS.find(c => c.name === secretName);
  if (!config) {
    throw new Error(`Secret configuration not found: ${secretName}`);
  }

  await manager.rotateSecret(secretName, environment, config, backend);
}

async function handleList(manager: SecretsManager, args: string[]): Promise<void> {
  const [backend] = args;
  const secrets = await manager.listSecrets(backend);

  console.log('Managed secrets:');
  secrets.forEach(secret => console.log(`  ${secret}`));
}

async function handleDelete(manager: SecretsManager, args: string[]): Promise<void> {
  const [secretName, environment, backend] = args;

  if (!secretName || !environment) {
    throw new Error('Usage: delete <secret-name> <environment> [backend]');
  }

  await manager.deleteSecret(secretName, environment, backend);
}

async function handleCheckExpired(manager: SecretsManager, args: string[]): Promise<void> {
  const [backend] = args;
  const expiredSecrets = await manager.checkExpiredSecrets(backend);

  if (expiredSecrets.length === 0) {
    console.log('✅ No expired secrets found');
  } else {
    console.log('⚠️  Expired secrets:');
    expiredSecrets.forEach(secret => {
      console.log(`  ${secret.key} (expired: ${secret.expiresAt})`);
    });
  }
}

async function handleAutoRotate(manager: SecretsManager, args: string[]): Promise<void> {
  const [backend] = args;
  await manager.autoRotateExpired(SECRET_CONFIGS, backend);
}

async function handleInitEnvironment(manager: SecretsManager, args: string[]): Promise<void> {
  const [environment, backend] = args;

  if (!environment) {
    throw new Error('Usage: init-environment <environment> [backend]');
  }

  console.log(`🚀 Initializing secrets for ${environment} environment...`);

  for (const config of SECRET_CONFIGS) {
    if (config.environments.includes(environment)) {
      try {
        await manager.generateSecret(config, environment, backend);
      } catch (error) {
        console.error(`❌ Failed to generate ${config.name}:`, error);
      }
    }
  }

  console.log(`✅ Environment ${environment} initialized`);
}

function showHelp(): void {
  console.log(`
Study Teddy Secrets Manager

Usage: bun run scripts/secrets-manager.ts <command> [args]

Commands:
  generate <secret-name> <environment> [backend]
    Generate a new secret for the specified environment

  get <secret-name> <environment> [backend]
    Retrieve a secret value

  rotate <secret-name> <environment> [backend]
    Rotate an existing secret

  list [backend]
    List all managed secrets

  delete <secret-name> <environment> [backend]
    Delete a secret

  check-expired [backend]
    Check for expired secrets

  auto-rotate [backend]
    Automatically rotate all expired secrets

  init-environment <environment> [backend]
    Initialize all secrets for an environment

  help
    Show this help message

Available Secrets:
${SECRET_CONFIGS.map(config =>
  `  ${config.name} - ${config.description} (${config.environments.join(', ')})`
).join('\n')}

Environment Variables:
  SECRETS_BACKEND - Default backend to use (local, kubernetes, aws)

Examples:
  bun run scripts/secrets-manager.ts generate JWT_SECRET production aws
  bun run scripts/secrets-manager.ts rotate DATABASE_PASSWORD staging
  bun run scripts/secrets-manager.ts init-environment development
  bun run scripts/secrets-manager.ts check-expired kubernetes
`);
}

// Run the CLI
if (import.meta.main) {
  main();
}