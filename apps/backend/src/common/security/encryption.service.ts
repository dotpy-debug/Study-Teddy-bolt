import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as CryptoJS from 'crypto-js';

export interface EncryptionResult {
  encrypted: string;
  iv: string;
  authTag?: string;
  salt?: string;
}

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  tagLength: number;
  iterations: number;
}

export interface FieldEncryptionConfig {
  [fieldName: string]: {
    algorithm: 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';
    required: boolean;
    mask?: boolean; // Whether to mask when logging
  };
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly config: EncryptionConfig;
  private readonly masterKey: Buffer;
  private readonly fieldConfigs: FieldEncryptionConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      algorithm: this.configService.get<string>(
        'ENCRYPTION_ALGORITHM',
        'aes-256-gcm',
      ),
      keyLength: this.configService.get<number>('ENCRYPTION_KEY_LENGTH', 32),
      ivLength: this.configService.get<number>('ENCRYPTION_IV_LENGTH', 16),
      saltLength: this.configService.get<number>('ENCRYPTION_SALT_LENGTH', 32),
      tagLength: this.configService.get<number>('ENCRYPTION_TAG_LENGTH', 16),
      iterations: this.configService.get<number>(
        'ENCRYPTION_ITERATIONS',
        100000,
      ),
    };

    // Initialize master encryption key
    const masterKeyStr = this.configService.get<string>(
      'MASTER_ENCRYPTION_KEY',
    );
    this.masterKey = masterKeyStr
      ? Buffer.from(masterKeyStr, 'hex')
      : this.generateKey();

    // Define field-level encryption configurations
    this.fieldConfigs = {
      password: {
        algorithm: 'aes-256-gcm',
        required: true,
        mask: true,
      },
      email: {
        algorithm: 'aes-256-gcm',
        required: false,
        mask: false,
      },
      phone: {
        algorithm: 'aes-256-gcm',
        required: false,
        mask: true,
      },
      ssn: {
        algorithm: 'aes-256-gcm',
        required: true,
        mask: true,
      },
      creditCard: {
        algorithm: 'aes-256-gcm',
        required: true,
        mask: true,
      },
      personalData: {
        algorithm: 'aes-256-gcm',
        required: true,
        mask: false,
      },
      apiKey: {
        algorithm: 'aes-256-gcm',
        required: true,
        mask: true,
      },
      token: {
        algorithm: 'aes-256-gcm',
        required: true,
        mask: true,
      },
      studyNotes: {
        algorithm: 'aes-256-cbc',
        required: false,
        mask: false,
      },
    };

    this.logger.log('Encryption service initialized', {
      algorithm: this.config.algorithm,
      keyLength: this.config.keyLength,
    });
  }

  /**
   * Encrypt data using AES-256-GCM (default)
   */
  async encrypt(
    data: string,
    key?: Buffer,
    algorithm: string = this.config.algorithm,
  ): Promise<EncryptionResult> {
    try {
      const encryptionKey = key || this.masterKey;
      const iv = crypto.randomBytes(this.config.ivLength);

      let result: EncryptionResult;

      switch (algorithm) {
        case 'aes-256-gcm':
          result = this.encryptAES256GCM(data, encryptionKey, iv);
          break;
        case 'aes-256-cbc':
          result = this.encryptAES256CBC(data, encryptionKey, iv);
          break;
        case 'chacha20-poly1305':
          result = this.encryptChaCha20Poly1305(data, encryptionKey, iv);
          break;
        default:
          throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
      }

      return result;
    } catch (error) {
      this.logger.error('Encryption failed', {
        algorithm,
        error: error.message,
      });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data
   */
  async decrypt(
    encryptionResult: EncryptionResult,
    key?: Buffer,
    algorithm: string = this.config.algorithm,
  ): Promise<string> {
    try {
      const decryptionKey = key || this.masterKey;

      let decrypted: string;

      switch (algorithm) {
        case 'aes-256-gcm':
          if (!encryptionResult.authTag) {
            throw new Error(
              'Authentication tag is required for AES-256-GCM decryption',
            );
          }
          decrypted = this.decryptAES256GCM(encryptionResult, decryptionKey);
          break;
        case 'aes-256-cbc':
          decrypted = this.decryptAES256CBC(encryptionResult, decryptionKey);
          break;
        case 'chacha20-poly1305':
          if (!encryptionResult.authTag) {
            throw new Error(
              'Authentication tag is required for ChaCha20-Poly1305 decryption',
            );
          }
          decrypted = this.decryptChaCha20Poly1305(
            encryptionResult,
            decryptionKey,
          );
          break;
        default:
          throw new Error(`Unsupported decryption algorithm: ${algorithm}`);
      }

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', {
        algorithm,
        error: error.message,
      });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Encrypt sensitive object fields
   */
  async encryptObject(
    obj: any,
    fieldsToEncrypt?: string[],
  ): Promise<{
    encrypted: any;
    encryptionMetadata: { [field: string]: EncryptionResult };
  }> {
    const encrypted = { ...obj };
    const encryptionMetadata: { [field: string]: EncryptionResult } = {};

    const fields = fieldsToEncrypt || Object.keys(this.fieldConfigs);

    for (const field of fields) {
      if (obj[field] && typeof obj[field] === 'string') {
        const config = this.fieldConfigs[field];

        if (config) {
          const encryptionResult = await this.encrypt(
            obj[field],
            undefined,
            config.algorithm,
          );

          encryptionMetadata[field] = encryptionResult;
          encrypted[field] = encryptionResult.encrypted;
        }
      }
    }

    return { encrypted, encryptionMetadata };
  }

  /**
   * Decrypt sensitive object fields
   */
  async decryptObject(
    encryptedObj: any,
    encryptionMetadata: { [field: string]: EncryptionResult },
  ): Promise<any> {
    const decrypted = { ...encryptedObj };

    for (const [field, metadata] of Object.entries(encryptionMetadata)) {
      if (encryptedObj[field]) {
        const config = this.fieldConfigs[field];

        if (config) {
          try {
            const decryptedValue = await this.decrypt(
              {
                encrypted: encryptedObj[field],
                iv: metadata.iv,
                authTag: metadata.authTag,
                salt: metadata.salt,
              },
              undefined,
              config.algorithm,
            );

            decrypted[field] = decryptedValue;
          } catch (error) {
            this.logger.error(`Failed to decrypt field: ${field}`, {
              error: error.message,
            });
            // Keep encrypted value if decryption fails
          }
        }
      }
    }

    return decrypted;
  }

  /**
   * Generate hash with salt for one-way encryption (passwords, etc.)
   */
  async hashWithSalt(
    data: string,
    salt?: string,
  ): Promise<{
    hash: string;
    salt: string;
  }> {
    const saltBuffer = salt
      ? Buffer.from(salt, 'hex')
      : crypto.randomBytes(this.config.saltLength);

    const hash = crypto.pbkdf2Sync(
      data,
      saltBuffer,
      this.config.iterations,
      this.config.keyLength,
      'sha512',
    );

    return {
      hash: hash.toString('hex'),
      salt: saltBuffer.toString('hex'),
    };
  }

  /**
   * Verify hashed data
   */
  async verifyHash(data: string, hash: string, salt: string): Promise<boolean> {
    try {
      const { hash: computedHash } = await this.hashWithSalt(data, salt);
      return hash === computedHash;
    } catch (error) {
      this.logger.error('Hash verification failed', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Encrypt file data
   */
  async encryptFile(
    fileBuffer: Buffer,
    key?: Buffer,
  ): Promise<{
    encryptedBuffer: Buffer;
    encryptionMetadata: EncryptionResult;
  }> {
    try {
      const encryptionKey = key || this.masterKey;
      const iv = crypto.randomBytes(this.config.ivLength);

      const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
      cipher.setAutoPadding(true);

      const encrypted = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      return {
        encryptedBuffer: encrypted,
        encryptionMetadata: {
          encrypted: encrypted.toString('base64'),
          iv: iv.toString('hex'),
          authTag: authTag.toString('hex'),
        },
      };
    } catch (error) {
      this.logger.error('File encryption failed', {
        error: error.message,
      });
      throw new Error('File encryption failed');
    }
  }

  /**
   * Decrypt file data
   */
  async decryptFile(
    encryptedBuffer: Buffer,
    encryptionMetadata: EncryptionResult,
    key?: Buffer,
  ): Promise<Buffer> {
    try {
      const decryptionKey = key || this.masterKey;
      const iv = Buffer.from(encryptionMetadata.iv, 'hex');
      const authTag = Buffer.from(encryptionMetadata.authTag!, 'hex');

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        decryptionKey,
        iv,
      );
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final(),
      ]);

      return decrypted;
    } catch (error) {
      this.logger.error('File decryption failed', {
        error: error.message,
      });
      throw new Error('File decryption failed');
    }
  }

  /**
   * Generate encryption key from password
   */
  generateKeyFromPassword(
    password: string,
    salt?: string,
  ): {
    key: Buffer;
    salt: string;
  } {
    const saltBuffer = salt
      ? Buffer.from(salt, 'hex')
      : crypto.randomBytes(this.config.saltLength);

    const key = crypto.pbkdf2Sync(
      password,
      saltBuffer,
      this.config.iterations,
      this.config.keyLength,
      'sha512',
    );

    return {
      key,
      salt: saltBuffer.toString('hex'),
    };
  }

  /**
   * Generate random encryption key
   */
  generateKey(): Buffer {
    return crypto.randomBytes(this.config.keyLength);
  }

  /**
   * Mask sensitive data for logging
   */
  maskSensitiveData(obj: any): any {
    const masked = { ...obj };

    for (const [field, config] of Object.entries(this.fieldConfigs)) {
      if (masked[field] && config.mask) {
        if (typeof masked[field] === 'string') {
          const value = masked[field];
          if (value.length <= 4) {
            masked[field] = '*'.repeat(value.length);
          } else {
            masked[field] =
              value.substring(0, 2) +
              '*'.repeat(value.length - 4) +
              value.substring(value.length - 2);
          }
        }
      }
    }

    return masked;
  }

  /**
   * Private encryption methods
   */
  private encryptAES256GCM(
    data: string,
    key: Buffer,
    iv: Buffer,
  ): EncryptionResult {
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  private decryptAES256GCM(
    encryptionResult: EncryptionResult,
    key: Buffer,
  ): string {
    const iv = Buffer.from(encryptionResult.iv, 'hex');
    const authTag = Buffer.from(encryptionResult.authTag!, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptionResult.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private encryptAES256CBC(
    data: string,
    key: Buffer,
    iv: Buffer,
  ): EncryptionResult {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
    };
  }

  private decryptAES256CBC(
    encryptionResult: EncryptionResult,
    key: Buffer,
  ): string {
    const iv = Buffer.from(encryptionResult.iv, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(encryptionResult.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private encryptChaCha20Poly1305(
    data: string,
    key: Buffer,
    iv: Buffer,
  ): EncryptionResult {
    const cipher = crypto.createCipheriv('chacha20-poly1305', key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  private decryptChaCha20Poly1305(
    encryptionResult: EncryptionResult,
    key: Buffer,
  ): string {
    const iv = Buffer.from(encryptionResult.iv, 'hex');
    const authTag = Buffer.from(encryptionResult.authTag!, 'hex');

    const decipher = crypto.createDecipheriv('chacha20-poly1305', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptionResult.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Get encryption configuration
   */
  getConfig(): EncryptionConfig {
    return { ...this.config };
  }

  /**
   * Get field configurations
   */
  getFieldConfigs(): FieldEncryptionConfig {
    return { ...this.fieldConfigs };
  }
}
