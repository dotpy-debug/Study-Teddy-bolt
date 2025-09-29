import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import {
  UpdateUserProfileDto,
  UpdateUserPreferencesDto,
  ChangePasswordDto,
  DeleteAccountDto,
  UserPrivacySettingsDto,
} from './dto/user.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({
    summary: 'Get user profile',
    description: "Retrieve the authenticated user's profile information",
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        name: { type: 'string' },
        avatarUrl: { type: 'string', nullable: true },
        bio: { type: 'string', nullable: true },
        timezone: { type: 'string', nullable: true },
        authProvider: { type: 'string', enum: ['local', 'google'] },
        emailVerified: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        lastLoginAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.userId);
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Update user profile',
    description: "Update the authenticated user's profile information",
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            avatarUrl: { type: 'string' },
            bio: { type: 'string' },
            timezone: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid profile data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiConflictResponse({ description: 'Email already in use' })
  async updateProfile(
    @Body() updateProfileDto: UpdateUserProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateProfile(user.userId, updateProfileDto);
  }

  @Get('preferences')
  @ApiOperation({
    summary: 'Get user preferences',
    description: "Retrieve the authenticated user's preferences and settings",
  })
  @ApiResponse({
    status: 200,
    description: 'User preferences retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        emailNotifications: {
          type: 'string',
          enum: ['all', 'important_only', 'none'],
        },
        pushNotifications: {
          type: 'string',
          enum: ['all', 'important_only', 'none'],
        },
        theme: { type: 'string', enum: ['light', 'dark', 'system'] },
        studyReminders: { type: 'boolean' },
        defaultStudyDuration: { type: 'number' },
        publicProfile: { type: 'boolean' },
        showActivity: { type: 'boolean' },
        analyticsConsent: { type: 'boolean' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getPreferences(user.userId);
  }

  @Put('preferences')
  @ApiOperation({
    summary: 'Update user preferences',
    description: "Update the authenticated user's preferences and settings",
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        preferences: { type: 'object' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid preferences data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async updatePreferences(
    @Body() updatePreferencesDto: UpdateUserPreferencesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updatePreferences(
      user.userId,
      updatePreferencesDto,
    );
  }

  @Put('privacy')
  @ApiOperation({
    summary: 'Update privacy settings',
    description: "Update the authenticated user's privacy settings",
  })
  @ApiResponse({
    status: 200,
    description: 'Privacy settings updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        privacySettings: { type: 'object' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid privacy settings data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async updatePrivacySettings(
    @Body() privacySettingsDto: UserPrivacySettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updatePrivacySettings(
      user.userId,
      privacySettingsDto,
    );
  }

  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password',
    description: "Change the authenticated user's password",
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: "Invalid password data or passwords don't match",
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired token or incorrect current password',
  })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.changePassword(user.userId, changePasswordDto);
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete account',
    description:
      "Permanently delete the authenticated user's account and all associated data",
  })
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid deletion data or incorrect password',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async deleteAccount(
    @Body() deleteAccountDto: DeleteAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.deleteAccount(user.userId, deleteAccountDto);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get user statistics',
    description: "Retrieve comprehensive statistics about the user's activity",
  })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        memberSince: { type: 'string', format: 'date-time' },
        totalTasks: { type: 'number' },
        tasksCompleted: { type: 'number' },
        totalStudyTime: { type: 'number' },
        aiInteractions: { type: 'number' },
        currentStreak: { type: 'number' },
        longestStreak: { type: 'number' },
        averageTasksPerDay: { type: 'number' },
        averageStudyTimePerDay: { type: 'number' },
        mostStudiedSubject: { type: 'string' },
        productivityScore: { type: 'number' },
        achievements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              achievedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getUserStats(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getUserStats(user.userId);
  }

  @Get('activity-export')
  @ApiOperation({
    summary: 'Export user data',
    description:
      'Export all user data for GDPR compliance (returns downloadable data)',
  })
  @ApiResponse({
    status: 200,
    description: 'User data exported successfully',
    schema: {
      type: 'object',
      properties: {
        exportedAt: { type: 'string', format: 'date-time' },
        profile: { type: 'object' },
        tasks: { type: 'array' },
        aiChats: { type: 'array' },
        preferences: { type: 'object' },
        statistics: { type: 'object' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async exportUserData(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.exportUserData(user.userId);
  }
}
