import { Injectable } from '@nestjs/common';
import { eq, and, gt, lt, isNull } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { users, refreshTokens } from '../../db/schema';
import { CreateGoogleUserDto } from '../auth/dto/auth.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(private drizzleService: DrizzleService) {}
  async findByEmail(email: string) {
    const [user] = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user;
  }

  async findById(id: string) {
    const [user] = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user;
  }

  async createUser(email: string, password: string, name: string) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const [newUser] = await this.drizzleService.db
      .insert(users)
      .values({
        email,
        passwordHash: hashedPassword,
        name,
        authProvider: 'local',
      })
      .returning();

    return newUser;
  }

  async findOrCreateGoogleUser(googleUserData: CreateGoogleUserDto) {
    // First try to find by email
    const user = await this.findByEmail(googleUserData.email);

    if (user) {
      // If user exists but doesn't have Google ID, update it
      if (!user.googleId && user.authProvider === 'local') {
        const [updatedUser] = await this.drizzleService.db
          .update(users)
          .set({
            googleId: googleUserData.googleId,
            authProvider: 'google',
            avatarUrl: googleUserData.avatarUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))
          .returning();
        return updatedUser;
      }
      return user;
    }

    // Create new Google user
    const [newUser] = await this.drizzleService.db
      .insert(users)
      .values({
        email: googleUserData.email,
        name: googleUserData.name,
        avatarUrl: googleUserData.avatarUrl,
        googleId: googleUserData.googleId,
        authProvider: 'google',
      })
      .returning();

    return newUser;
  }

  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async generateRefreshToken(): Promise<string> {
    return crypto.randomBytes(32).toString('hex');
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

    const tokenHash = await bcrypt.hash(refreshToken, 10);

    // Use upsert pattern: delete existing token first, then insert new one
    await this.drizzleService.db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, userId));

    await this.drizzleService.db.insert(refreshTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });
  }

  async validateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const [token] = await this.drizzleService.db
      .select({
        tokenHash: refreshTokens.tokenHash,
        expiresAt: refreshTokens.expiresAt,
        revokedAt: refreshTokens.revokedAt,
      })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!token || !token.tokenHash || token.revokedAt) {
      return false;
    }

    return bcrypt.compare(refreshToken, token.tokenHash);
  }

  async clearRefreshToken(userId: string): Promise<void> {
    // Mark the token as revoked instead of deleting it for audit purposes
    await this.drizzleService.db
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
      })
      .where(eq(refreshTokens.userId, userId));
  }

  async findByRefreshToken(refreshToken: string) {
    // Get all non-expired, non-revoked tokens
    const tokens = await this.drizzleService.db
      .select({
        userId: refreshTokens.userId,
        tokenHash: refreshTokens.tokenHash,
      })
      .from(refreshTokens)
      .where(
        and(
          gt(refreshTokens.expiresAt, new Date()),
          isNull(refreshTokens.revokedAt),
        ),
      );

    // Check each token hash - this is still O(N) but much smaller N than all users
    // In practice, there should be very few active refresh tokens
    for (const token of tokens) {
      if (await bcrypt.compare(refreshToken, token.tokenHash)) {
        // Found matching token, return the user
        const [user] = await this.drizzleService.db
          .select()
          .from(users)
          .where(eq(users.id, token.userId))
          .limit(1);
        return user;
      }
    }

    return null;
  }

  async cleanupExpiredRefreshTokens(): Promise<void> {
    // Delete tokens that have been expired for more than 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    await this.drizzleService.db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, cutoffDate));
  }

  async updatePasswordResetToken(
    userId: string,
    resetToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.drizzleService.db
      .update(users)
      .set({
        resetPasswordToken: resetToken,
        resetPasswordExpires: expiresAt,
        lastPasswordResetRequest: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async findByResetToken(resetToken: string) {
    const [user] = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.resetPasswordToken, resetToken))
      .limit(1);

    return user;
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.drizzleService.db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await this.drizzleService.db
      .update(users)
      .set({
        resetPasswordToken: null,
        resetPasswordExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async findByEmailVerificationToken(token: string) {
    const [user] = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, token))
      .limit(1);

    return user;
  }

  async verifyEmail(userId: string): Promise<void> {
    await this.drizzleService.db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async generateEmailVerificationToken(): Promise<string> {
    return crypto.randomBytes(32).toString('hex');
  }

  async setEmailVerificationToken(
    userId: string,
    token: string,
  ): Promise<void> {
    await this.drizzleService.db
      .update(users)
      .set({
        emailVerificationToken: token,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getProfile(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      return null;
    }

    // Return user profile without sensitive data
    const {
      passwordHash,
      resetPasswordToken,
      emailVerificationToken,
      ...profile
    } = user;
    return profile;
  }

  async updateProfile(userId: string, updateData: any) {
    const [updatedUser] = await this.drizzleService.db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    const {
      passwordHash,
      resetPasswordToken,
      emailVerificationToken,
      ...profile
    } = updatedUser;
    return profile;
  }

  async getPreferences(userId: string) {
    // For now, return default preferences
    // In a real app, these would be stored in a separate preferences table
    return {
      emailNotifications: 'important_only',
      pushNotifications: 'all',
      theme: 'system',
      studyReminders: true,
      defaultStudyDuration: 25, // minutes
      publicProfile: false,
      showActivity: true,
      analyticsConsent: false,
    };
  }

  async updatePreferences(userId: string, preferences: any) {
    // For now, just return the updated preferences
    // In a real app, these would be stored in a separate preferences table
    return {
      ...preferences,
      updatedAt: new Date(),
    };
  }

  async updatePrivacySettings(userId: string, settings: any) {
    // For now, just return the updated settings
    return {
      ...settings,
      updatedAt: new Date(),
    };
  }

  async changePassword(userId: string, changePasswordDto: any) {
    const { currentPassword, newPassword } = changePasswordDto;

    // Get current user
    const user = await this.findById(userId);
    if (!user || !user.passwordHash) {
      throw new Error('User not found or password not set');
    }

    // Validate current password
    const isCurrentPasswordValid = await this.validatePassword(
      currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    await this.updatePassword(userId, newPassword);

    return { message: 'Password changed successfully' };
  }

  async deleteAccount(userId: string, deleteAccountDto: any) {
    // In a real app, you might want to soft delete or handle data retention
    await this.drizzleService.db.delete(users).where(eq(users.id, userId));

    return { message: 'Account deleted successfully' };
  }

  async getUserStats(userId: string) {
    // Return mock stats for now
    return {
      accountCreated: new Date(),
      totalSessions: 0,
      totalStudyTime: 0,
      tasksCompleted: 0,
      streakDays: 0,
      favoriteSubject: null,
    };
  }

  async exportUserData(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Return sanitized user data for export
    const {
      passwordHash,
      resetPasswordToken,
      emailVerificationToken,
      ...exportData
    } = user;

    return {
      userData: exportData,
      exportedAt: new Date(),
      format: 'json',
    };
  }
}
