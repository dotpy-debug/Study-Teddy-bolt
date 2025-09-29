import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { z, ZodSchema, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

/**
 * Custom decorator for Zod validation
 * Validates request body, query parameters, or path parameters using Zod schemas
 */
export const ZodValidate = createParamDecorator(
  (schema: ZodSchema, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const data = request.body || request.query || request.params;

    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        throw new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: validationError.details,
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  },
);

/**
 * Decorator for validating request body with Zod schema
 */
export const ZodBody = (schema: ZodSchema) => ZodValidate(schema);

/**
 * Decorator for validating query parameters with Zod schema
 */
export const ZodQuery = createParamDecorator(
  (schema: ZodSchema, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const queryData = request.query;

    try {
      return schema.parse(queryData);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        throw new BadRequestException({
          statusCode: 400,
          message: 'Query validation failed',
          errors: validationError.details,
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  },
);

/**
 * Decorator for validating path parameters with Zod schema
 */
export const ZodParam = createParamDecorator(
  (schema: ZodSchema, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const paramData = request.params;

    try {
      return schema.parse(paramData);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        throw new BadRequestException({
          statusCode: 400,
          message: 'Parameter validation failed',
          errors: validationError.details,
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  },
);

/**
 * Decorator for validating headers with Zod schema
 */
export const ZodHeaders = createParamDecorator(
  (schema: ZodSchema, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const headerData = request.headers;

    try {
      return schema.parse(headerData);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        throw new BadRequestException({
          statusCode: 400,
          message: 'Header validation failed',
          errors: validationError.details,
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  },
);

/**
 * Method decorator for automatic validation of multiple request parts
 */
export function ZodValidation(options: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const ctx = args[args.length - 1]; // ExecutionContext is typically the last argument

      if (ctx && ctx.switchToHttp) {
        const request = ctx.switchToHttp().getRequest();
        const validatedData: any = {};

        try {
          // Validate body
          if (options.body && request.body) {
            validatedData.body = options.body.parse(request.body);
            request.body = validatedData.body;
          }

          // Validate query
          if (options.query && request.query) {
            validatedData.query = options.query.parse(request.query);
            request.query = validatedData.query;
          }

          // Validate params
          if (options.params && request.params) {
            validatedData.params = options.params.parse(request.params);
            request.params = validatedData.params;
          }

          // Validate headers
          if (options.headers && request.headers) {
            validatedData.headers = options.headers.parse(request.headers);
          }
        } catch (error) {
          if (error instanceof ZodError) {
            const validationError = fromZodError(error);
            throw new BadRequestException({
              statusCode: 400,
              message: 'Validation failed',
              errors: validationError.details,
              timestamp: new Date().toISOString(),
            });
          }
          throw error;
        }
      }

      return method.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Utility function to create a validation pipe for specific schema
 */
export function createZodValidationPipe(schema: ZodSchema) {
  return {
    transform(value: any) {
      try {
        return schema.parse(value);
      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          throw new BadRequestException({
            statusCode: 400,
            message: 'Validation failed',
            errors: validationError.details,
            timestamp: new Date().toISOString(),
          });
        }
        throw error;
      }
    },
  };
}

/**
 * Async validation decorator for complex validation scenarios
 */
export function ZodAsyncValidation(
  validationFn: (data: any, ctx: ExecutionContext) => Promise<any>,
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const ctx = args[args.length - 1];

      if (ctx && ctx.switchToHttp) {
        const request = ctx.switchToHttp().getRequest();

        try {
          const validatedData = await validationFn(request, ctx);
          Object.assign(request, validatedData);
        } catch (error) {
          if (error instanceof ZodError) {
            const validationError = fromZodError(error);
            throw new BadRequestException({
              statusCode: 400,
              message: 'Async validation failed',
              errors: validationError.details,
              timestamp: new Date().toISOString(),
            });
          }
          throw error;
        }
      }

      return method.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Conditional validation decorator
 */
export function ZodConditionalValidation(
  condition: (ctx: ExecutionContext) => boolean,
  schema: ZodSchema,
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const ctx = args[args.length - 1];

      if (ctx && ctx.switchToHttp && condition(ctx)) {
        const request = ctx.switchToHttp().getRequest();

        try {
          const validatedData = schema.parse(
            request.body || request.query || request.params,
          );
          Object.assign(request, { validatedData });
        } catch (error) {
          if (error instanceof ZodError) {
            const validationError = fromZodError(error);
            throw new BadRequestException({
              statusCode: 400,
              message: 'Conditional validation failed',
              errors: validationError.details,
              timestamp: new Date().toISOString(),
            });
          }
          throw error;
        }
      }

      return method.apply(this, args);
    };

    return descriptor;
  };
}
