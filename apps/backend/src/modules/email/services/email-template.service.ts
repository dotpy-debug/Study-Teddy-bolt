import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { compile } from 'handlebars';
import {
  EmailTemplate,
  TemplateRenderResult,
  EmailTemplateContext,
} from '../types/email.types';

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);
  private readonly templateCache = new Map<string, any>();
  private readonly templatePath: string;
  private readonly cacheEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.templatePath = path.join(__dirname, '..', 'templates');
    this.cacheEnabled = this.configService.get<boolean>(
      'EMAIL_TEMPLATE_CACHE',
      true,
    );
  }

  /**
   * Render an email template with the given context
   */
  async renderTemplate(
    templateName: EmailTemplate | string,
    context: EmailTemplateContext,
  ): Promise<TemplateRenderResult> {
    try {
      const enrichedContext = this.enrichContext(context);

      // Get compiled templates
      const htmlTemplate = await this.getCompiledTemplate(templateName, 'html');
      const textTemplate = await this.getCompiledTemplate(templateName, 'txt');

      // Render templates
      const html = htmlTemplate(enrichedContext);
      const text = textTemplate(enrichedContext);

      this.logger.debug(`Template ${templateName} rendered successfully`);

      return {
        html,
        text,
      };
    } catch (error) {
      this.logger.error(`Failed to render template ${templateName}`, error);
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Get a compiled template from cache or file system
   */
  private async getCompiledTemplate(
    templateName: string,
    format: 'html' | 'txt',
  ): Promise<HandlebarsTemplateDelegate> {
    const cacheKey = `${templateName}.${format}`;

    // Check cache first
    if (this.cacheEnabled && this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey);
    }

    // Load and compile template
    const templateContent = await this.loadTemplate(templateName, format);
    const compiledTemplate = compile(templateContent);

    // Cache if enabled
    if (this.cacheEnabled) {
      this.templateCache.set(cacheKey, compiledTemplate);
    }

    return compiledTemplate;
  }

  /**
   * Load template content from file system
   */
  private async loadTemplate(
    templateName: string,
    format: 'html' | 'txt',
  ): Promise<string> {
    const fileName = `${templateName}.${format}`;
    const filePath = path.join(this.templatePath, fileName);

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Template file not found: ${filePath}`);
      }

      const content = await fs.promises.readFile(filePath, 'utf-8');
      this.logger.debug(`Template loaded: ${fileName}`);
      return content;
    } catch (error) {
      this.logger.error(`Failed to load template ${fileName}`, error);
      throw new Error(`Template loading failed: ${error.message}`);
    }
  }

  /**
   * Enrich context with common variables
   */
  private enrichContext(context: EmailTemplateContext): EmailTemplateContext {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const supportEmail = this.configService.get<string>(
      'SUPPORT_EMAIL',
      'support@studyteddy.com',
    );
    const appName = this.configService.get<string>('APP_NAME', 'Study Teddy');

    return {
      ...context,
      appName: context.appName || appName,
      frontendUrl: context.frontendUrl || frontendUrl,
      supportEmail: context.supportEmail || supportEmail,
      currentYear: context.currentYear || new Date().getFullYear(),
    };
  }

  /**
   * Validate template context against required variables
   */
  async validateTemplate(
    templateName: string,
    context: EmailTemplateContext,
  ): Promise<{ valid: boolean; missingVariables: string[] }> {
    try {
      // This is a simplified validation - in a production system,
      // you might want to parse the template and extract required variables
      const requiredVariables = this.getRequiredVariables(templateName);
      const missingVariables = requiredVariables.filter(
        (variable) => !(variable in context),
      );

      return {
        valid: missingVariables.length === 0,
        missingVariables,
      };
    } catch (error) {
      this.logger.error(
        `Template validation failed for ${templateName}`,
        error,
      );
      return {
        valid: false,
        missingVariables: [],
      };
    }
  }

  /**
   * Get required variables for a template
   */
  private getRequiredVariables(templateName: string): string[] {
    const templateRequirements: Record<string, string[]> = {
      [EmailTemplate.WELCOME]: ['name', 'email'],
      [EmailTemplate.EMAIL_VERIFICATION]: ['name', 'verificationToken'],
      [EmailTemplate.PASSWORD_RESET]: ['name', 'resetToken'],
      [EmailTemplate.STUDY_REMINDER]: ['name', 'taskTitle', 'dueDate'],
      [EmailTemplate.TASK_DEADLINE]: [
        'name',
        'taskId',
        'taskTitle',
        'dueDate',
        'timeUntilDue',
      ],
      [EmailTemplate.ACHIEVEMENT]: [
        'name',
        'achievementTitle',
        'achievementDescription',
      ],
      [EmailTemplate.WEEKLY_SUMMARY]: [
        'name',
        'tasksCompleted',
        'studyHours',
        'streakDays',
      ],
      [EmailTemplate.FOCUS_SESSION_SUMMARY]: [
        'name',
        'sessionDuration',
        'sessionType',
        'completedAt',
      ],
    };

    return templateRequirements[templateName] || [];
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
    this.logger.log('Template cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; templates: string[] } {
    return {
      size: this.templateCache.size,
      templates: Array.from(this.templateCache.keys()),
    };
  }

  /**
   * Check if template exists
   */
  async templateExists(templateName: string): Promise<boolean> {
    const htmlPath = path.join(this.templatePath, `${templateName}.html`);
    const txtPath = path.join(this.templatePath, `${templateName}.txt`);

    try {
      return fs.existsSync(htmlPath) && fs.existsSync(txtPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * List all available templates
   */
  async getAvailableTemplates(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.templatePath);
      const htmlFiles = files.filter((file) => file.endsWith('.html'));

      return htmlFiles
        .map((file) => file.replace('.html', ''))
        .filter(
          async (templateName) => await this.templateExists(templateName),
        );
    } catch (error) {
      this.logger.error('Failed to list available templates', error);
      return [];
    }
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Math helper for calculations in templates
    require('handlebars').registerHelper(
      'math',
      function (lvalue, operator, rvalue) {
        lvalue = parseFloat(lvalue);
        rvalue = parseFloat(rvalue);

        switch (operator) {
          case '+':
            return lvalue + rvalue;
          case '-':
            return lvalue - rvalue;
          case '*':
            return lvalue * rvalue;
          case '/':
            return rvalue !== 0 ? lvalue / rvalue : 0;
          case '%':
            return lvalue % rvalue;
          default:
            return 0;
        }
      },
    );

    // Equals helper for conditional rendering
    require('handlebars').registerHelper('eq', function (a, b) {
      return a === b;
    });

    // Greater than helper
    require('handlebars').registerHelper('gt', function (a, b) {
      return a > b;
    });

    // Less than helper
    require('handlebars').registerHelper('lt', function (a, b) {
      return a < b;
    });

    // Date formatting helper
    require('handlebars').registerHelper('formatDate', function (date, format) {
      if (!date) return '';

      const d = new Date(date);
      if (format === 'short') {
        return d.toLocaleDateString();
      } else if (format === 'long') {
        return d.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
      return d.toISOString();
    });

    // Capitalize helper
    require('handlebars').registerHelper('capitalize', function (str) {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    this.logger.log('Handlebars helpers registered');
  }

  /**
   * Initialize the service
   */
  async onModuleInit(): Promise<void> {
    this.registerHelpers();

    // Preload templates if caching is enabled
    if (this.cacheEnabled) {
      const templates = await this.getAvailableTemplates();
      for (const template of templates) {
        try {
          await this.getCompiledTemplate(template, 'html');
          await this.getCompiledTemplate(template, 'txt');
        } catch (error) {
          this.logger.warn(`Failed to preload template ${template}`, error);
        }
      }
      this.logger.log(`Preloaded ${this.templateCache.size / 2} templates`);
    }
  }
}
