import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { BetterAuthService } from './better-auth.service';
import { BetterAuthGuard, Public } from './guards/better-auth.guard';
import {
  CurrentUser,
  CurrentUserId,
} from './decorators/current-user.decorator';
import { BetterAuthUser } from './better-auth.service';

@ApiTags('Better Auth')
@Controller('auth')
export class BetterAuthController {
  constructor(private readonly betterAuthService: BetterAuthService) {}

  @Get('me')
  @UseGuards(BetterAuthGuard)
  @ApiOperation({
    summary: 'Get current user',
    description:
      'Get the current authenticated user information from Better Auth session',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user information',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        name: { type: 'string' },
        emailVerified: { type: 'boolean' },
        image: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated or session expired',
  })
  async getCurrentUser(@CurrentUser() user: BetterAuthUser) {
    return {
      success: true,
      data: user,
    };
  }

  @Get('session')
  @UseGuards(BetterAuthGuard)
  @ApiOperation({
    summary: 'Validate session',
    description:
      'Validate the current Better Auth session and return session info',
  })
  @ApiResponse({
    status: 200,
    description: 'Valid session',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        userId: { type: 'string' },
        email: { type: 'string' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session',
  })
  async validateSession(@CurrentUser() user: BetterAuthUser) {
    return {
      success: true,
      data: {
        valid: true,
        userId: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
    };
  }

  @Post('logout')
  @Public() // Allow logout even if session is expired
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout',
    description: 'Revoke the current Better Auth session',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async logout() {
    // Better Auth logout is handled by the frontend
    // This endpoint is for API consistency
    return {
      success: true,
      message: 'Logout successful',
    };
  }

  @Get('status')
  @Public()
  @ApiOperation({
    summary: 'Auth status',
    description:
      'Check if user is authenticated without requiring authentication',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication status',
    schema: {
      type: 'object',
      properties: {
        authenticated: { type: 'boolean' },
        user: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
          },
        },
      },
    },
  })
  async getAuthStatus(@CurrentUser() user?: BetterAuthUser) {
    return {
      success: true,
      data: {
        authenticated: !!user,
        user: user || null,
      },
    };
  }

  @Get('profile')
  @UseGuards(BetterAuthGuard)
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Get detailed user profile information',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile',
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated',
  })
  async getUserProfile(@CurrentUser() user: BetterAuthUser) {
    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Add any additional profile fields here
      },
    };
  }
}
