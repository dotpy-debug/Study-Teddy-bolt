import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as path from 'path';
import * as validator from 'validator';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedFileName?: string;
  fileHash?: string;
  metadata?: any;
}

export interface FileValidationConfig {
  maxSize: number; // bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  scanForMalware?: boolean;
  checkFileSignature?: boolean;
  sanitizeFileName?: boolean;
  generateHash?: boolean;
}

@Injectable()
export class FileValidationService {
  private readonly logger = new Logger(FileValidationService.name);

  // File signatures for validation
  private readonly fileSignatures = new Map<string, number[][]>([
    ['image/jpeg', [[0xff, 0xd8, 0xff]]],
    ['image/png', [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]],
    [
      'image/gif',
      [
        [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
      ],
    ],
    ['image/webp', [[0x52, 0x49, 0x46, 0x46]]],
    ['application/pdf', [[0x25, 0x50, 0x44, 0x46]]],
    ['text/plain', []], // Text files don't have specific signatures
    ['application/msword', [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]]],
    [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      [[0x50, 0x4b, 0x03, 0x04]],
    ],
    [
      'application/zip',
      [
        [0x50, 0x4b, 0x03, 0x04],
        [0x50, 0x4b, 0x05, 0x06],
        [0x50, 0x4b, 0x07, 0x08],
      ],
    ],
  ]);

  // Dangerous file signatures to detect
  private readonly dangerousSignatures = new Map<string, number[]>([
    ['exe', [0x4d, 0x5a]], // MZ header for executables
    ['script', [0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74]], // <script
    ['php', [0x3c, 0x3f, 0x70, 0x68, 0x70]], // <?php
    ['asp', [0x3c, 0x25]], // <%
    ['jsp', [0x3c, 0x25, 0x40]], // <%@
    ['bat', [0x40, 0x65, 0x63, 0x68, 0x6f]], // @echo
    ['cmd', [0x40, 0x65, 0x63, 0x68, 0x6f]], // @echo
  ]);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Validate uploaded file with comprehensive security checks
   */
  async validateFile(
    file: MulterFile,
    config: FileValidationConfig,
  ): Promise<FileValidationResult> {
    try {
      // Basic file validation
      const basicValidation = this.validateBasicProperties(file, config);
      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // File size validation
      const sizeValidation = this.validateFileSize(file, config);
      if (!sizeValidation.isValid) {
        return sizeValidation;
      }

      // MIME type validation
      const mimeValidation = this.validateMimeType(file, config);
      if (!mimeValidation.isValid) {
        return mimeValidation;
      }

      // File extension validation
      const extensionValidation = this.validateFileExtension(file, config);
      if (!extensionValidation.isValid) {
        return extensionValidation;
      }

      // File signature validation
      if (config.checkFileSignature) {
        const signatureValidation = this.validateFileSignature(file);
        if (!signatureValidation.isValid) {
          return signatureValidation;
        }
      }

      // Malware scanning
      const malwareValidation = this.scanForMalware(file);
      if (!malwareValidation.isValid) {
        return malwareValidation;
      }

      // Content validation
      const contentValidation = await this.validateFileContent(file, config);
      if (!contentValidation.isValid) {
        return contentValidation;
      }

      // Generate file hash if requested
      let fileHash: string | undefined;
      if (config.generateHash) {
        fileHash = this.generateFileHash(file.buffer);
      }

      // Sanitize filename if requested
      let sanitizedFileName: string | undefined;
      if (config.sanitizeFileName) {
        sanitizedFileName = this.sanitizeFileName(file.originalname);
      }

      this.logger.log(`File validation successful: ${file.originalname}`);

      return {
        isValid: true,
        sanitizedFileName,
        fileHash,
        metadata: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          encoding: file.encoding,
        },
      };
    } catch (error) {
      this.logger.error('File validation failed', {
        error: error.message,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      });

      return {
        isValid: false,
        error: 'File validation failed due to unexpected error',
      };
    }
  }

  /**
   * Validate basic file properties
   */
  private validateBasicProperties(
    file: MulterFile,
    config: FileValidationConfig,
  ): FileValidationResult {
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    if (!file.originalname) {
      return { isValid: false, error: 'File must have a name' };
    }

    if (!file.buffer || file.buffer.length === 0) {
      return { isValid: false, error: 'File is empty' };
    }

    if (!file.mimetype) {
      return { isValid: false, error: 'File MIME type is required' };
    }

    return { isValid: true };
  }

  /**
   * Validate file size
   */
  private validateFileSize(file: MulterFile, config: FileValidationConfig): FileValidationResult {
    if (file.size > config.maxSize) {
      return {
        isValid: false,
        error: `File size ${file.size} bytes exceeds maximum allowed size of ${config.maxSize} bytes`,
      };
    }

    return { isValid: true };
  }

  /**
   * Validate MIME type
   */
  private validateMimeType(file: MulterFile, config: FileValidationConfig): FileValidationResult {
    if (!config.allowedMimeTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: `MIME type ${file.mimetype} is not allowed. Allowed types: ${config.allowedMimeTypes.join(', ')}`,
      };
    }

    return { isValid: true };
  }

  /**
   * Validate file extension
   */
  private validateFileExtension(
    file: MulterFile,
    config: FileValidationConfig,
  ): FileValidationResult {
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (!config.allowedExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        error: `File extension ${fileExtension} is not allowed. Allowed extensions: ${config.allowedExtensions.join(', ')}`,
      };
    }

    return { isValid: true };
  }

  /**
   * Validate file signature (magic numbers)
   */
  private validateFileSignature(file: MulterFile): FileValidationResult {
    const buffer = file.buffer;
    const mimeType = file.mimetype;

    // Check for dangerous signatures first
    for (const [type, signature] of this.dangerousSignatures) {
      if (this.hasSignature(buffer, signature)) {
        this.logger.warn(`Detected dangerous file type: ${type}`, {
          fileName: file.originalname,
          mimeType: file.mimetype,
        });
        return {
          isValid: false,
          error: `File contains dangerous content: ${type}`,
        };
      }
    }

    // Validate expected signature for the MIME type
    const expectedSignatures = this.fileSignatures.get(mimeType);
    if (expectedSignatures && expectedSignatures.length > 0) {
      const hasValidSignature = expectedSignatures.some((signature) =>
        this.hasSignature(buffer, signature),
      );

      if (!hasValidSignature) {
        return {
          isValid: false,
          error: `File signature does not match declared MIME type: ${mimeType}`,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Check if buffer has specific byte signature
   */
  private hasSignature(buffer: Buffer, signature: number[]): boolean {
    if (buffer.length < signature.length) {
      return false;
    }

    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Scan for malware patterns
   */
  private scanForMalware(file: MulterFile): FileValidationResult {
    const content = file.buffer.toString('utf8', 0, Math.min(file.buffer.length, 10000));

    // Malicious patterns to detect
    const maliciousPatterns = [
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /system\s*\(/gi,
      /shell_exec\s*\(/gi,
      /passthru\s*\(/gi,
      /base64_decode\s*\(/gi,
      /gzinflate\s*\(/gi,
      /str_rot13\s*\(/gi,
      /<script[^>]*>.*?<\/script>/gis,
      /<iframe[^>]*>.*?<\/iframe>/gis,
      /javascript:/gi,
      /vbscript:/gi,
      /data:.*base64/gi,
      /\$_GET\[/gi,
      /\$_POST\[/gi,
      /\$_REQUEST\[/gi,
      /file_get_contents\s*\(/gi,
      /curl_exec\s*\(/gi,
      /wget\s+/gi,
      /powershell/gi,
      /cmd\.exe/gi,
      /rundll32/gi,
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(content)) {
        this.logger.warn(`Detected malicious pattern in file: ${file.originalname}`, {
          pattern: pattern.source,
        });
        return {
          isValid: false,
          error: 'File contains potentially malicious content',
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate file content based on type
   */
  private async validateFileContent(
    file: MulterFile,
    config: FileValidationConfig,
  ): Promise<FileValidationResult> {
    try {
      // Image validation
      if (file.mimetype.startsWith('image/')) {
        return this.validateImageContent(file);
      }

      // Text file validation
      if (file.mimetype.startsWith('text/')) {
        return this.validateTextContent(file);
      }

      // PDF validation
      if (file.mimetype === 'application/pdf') {
        return this.validatePdfContent(file);
      }

      // Document validation
      if (file.mimetype.includes('document') || file.mimetype.includes('word')) {
        return this.validateDocumentContent(file);
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Content validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Validate image content
   */
  private validateImageContent(file: MulterFile): FileValidationResult {
    // Check for embedded scripts in images
    const content = file.buffer.toString('utf8');

    const dangerousPatterns = [
      /<script/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+=/gi,
      /%3cscript/gi,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        return {
          isValid: false,
          error: 'Image contains embedded scripts',
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate text content
   */
  private validateTextContent(file: MulterFile): FileValidationResult {
    const content = file.buffer.toString('utf8');

    // Check for suspicious content
    const suspiciousPatterns = [
      /BEGIN\s+RSA\s+PRIVATE\s+KEY/gi,
      /BEGIN\s+PRIVATE\s+KEY/gi,
      /BEGIN\s+CERTIFICATE/gi,
      /password\s*[:=]\s*[^\s]+/gi,
      /api[_-]?key\s*[:=]\s*[^\s]+/gi,
      /secret\s*[:=]\s*[^\s]+/gi,
      /token\s*[:=]\s*[^\s]+/gi,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        this.logger.warn(`Suspicious content detected in text file: ${file.originalname}`);
        // Don't block, but log for security monitoring
      }
    }

    return { isValid: true };
  }

  /**
   * Validate PDF content
   */
  private validatePdfContent(file: MulterFile): FileValidationResult {
    const content = file.buffer.toString('utf8');

    // Check for JavaScript in PDF
    if (/\/JavaScript/gi.test(content) || /\/JS/gi.test(content)) {
      return {
        isValid: false,
        error: 'PDF contains JavaScript which is not allowed',
      };
    }

    // Check for embedded files
    if (/\/EmbeddedFile/gi.test(content)) {
      return {
        isValid: false,
        error: 'PDF contains embedded files which are not allowed',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate document content
   */
  private validateDocumentContent(file: MulterFile): FileValidationResult {
    // For now, just check file size and basic structure
    // In production, you might want to use a library to parse the document

    if (file.size > 50 * 1024 * 1024) {
      // 50MB limit for documents
      return {
        isValid: false,
        error: 'Document size exceeds 50MB limit',
      };
    }

    return { isValid: true };
  }

  /**
   * Generate file hash
   */
  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Sanitize filename
   */
  private sanitizeFileName(filename: string): string {
    if (!filename) {
      return 'untitled';
    }

    // Remove path traversal attempts
    let sanitized = filename.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');

    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');

    // Normalize spaces and remove leading/trailing spaces
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Ensure filename is not too long
    if (sanitized.length > 255) {
      const ext = path.extname(sanitized);
      const name = path.basename(sanitized, ext);
      sanitized = name.substring(0, 255 - ext.length) + ext;
    }

    // Ensure filename is not empty
    if (!sanitized) {
      sanitized = 'untitled';
    }

    return sanitized;
  }

  /**
   * Get default configuration for different file types
   */
  getDefaultConfig(type: 'image' | 'document' | 'text'): FileValidationConfig {
    const configs = {
      image: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
        checkFileSignature: true,
        sanitizeFileName: true,
        generateHash: true,
      },
      document: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        allowedExtensions: ['.pdf', '.doc', '.docx'],
        checkFileSignature: true,
        sanitizeFileName: true,
        generateHash: true,
      },
      text: {
        maxSize: 1 * 1024 * 1024, // 1MB
        allowedMimeTypes: ['text/plain'],
        allowedExtensions: ['.txt'],
        checkFileSignature: false,
        sanitizeFileName: true,
        generateHash: true,
      },
    };

    return configs[type];
  }
}
