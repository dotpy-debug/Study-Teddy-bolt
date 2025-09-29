import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// Mock the database
jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    name: 'Test User',
    avatarUrl: null,
    authProvider: 'local' as const,
    googleId: null,
    refreshToken: null,
    refreshTokenExpiresAt: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    lastPasswordResetRequest: null,
    emailVerified: false,
    emailVerificationToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };
      db.select.mockReturnValue(mockSelectChain);

      const result = await service.findByEmail('test@example.com');

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return undefined when user not found', async () => {
      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      db.select.mockReturnValue(mockSelectChain);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };
      db.select.mockReturnValue(mockSelectChain);

      const result = await service.findById('user-123');

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const email = 'new@example.com';
      const password = 'password123';
      const name = 'New User';
      const hashedPassword = 'hashedPassword123';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const { db } = require('../../db');
      const mockInsertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([
          {
            ...mockUser,
            email,
            name,
            passwordHash: hashedPassword,
          },
        ]),
      };
      db.insert.mockReturnValue(mockInsertChain);

      const result = await service.createUser(email, password, name);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(db.insert).toHaveBeenCalled();
      expect(mockInsertChain.values).toHaveBeenCalledWith({
        email,
        passwordHash: hashedPassword,
        name,
        authProvider: 'local',
      });
      expect(result.email).toBe(email);
      expect(result.name).toBe(name);
    });
  });

  describe('findOrCreateGoogleUser', () => {
    const googleUserData = {
      email: 'google@example.com',
      name: 'Google User',
      avatarUrl: 'https://example.com/avatar.jpg',
      googleId: 'google-123',
    };

    it('should return existing user if found by email', async () => {
      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };
      db.select.mockReturnValue(mockSelectChain);

      const result = await service.findOrCreateGoogleUser(googleUserData);

      expect(result).toEqual(mockUser);
    });

    it('should update existing local user with Google data', async () => {
      const existingLocalUser = {
        ...mockUser,
        authProvider: 'local' as const,
        googleId: null,
      };

      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingLocalUser]),
      };
      db.select.mockReturnValue(mockSelectChain);

      const mockUpdateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([
          {
            ...existingLocalUser,
            googleId: googleUserData.googleId,
            authProvider: 'google',
            avatarUrl: googleUserData.avatarUrl,
          },
        ]),
      };
      db.update.mockReturnValue(mockUpdateChain);

      const result = await service.findOrCreateGoogleUser(googleUserData);

      expect(db.update).toHaveBeenCalled();
      expect(mockUpdateChain.set).toHaveBeenCalledWith({
        googleId: googleUserData.googleId,
        authProvider: 'google',
        avatarUrl: googleUserData.avatarUrl,
        updatedAt: expect.any(Date),
      });
    });

    it('should create new Google user if not found', async () => {
      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      db.select.mockReturnValue(mockSelectChain);

      const mockInsertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([
          {
            ...mockUser,
            ...googleUserData,
            authProvider: 'google',
          },
        ]),
      };
      db.insert.mockReturnValue(mockInsertChain);

      const result = await service.findOrCreateGoogleUser(googleUserData);

      expect(db.insert).toHaveBeenCalled();
      expect(mockInsertChain.values).toHaveBeenCalledWith({
        email: googleUserData.email,
        name: googleUserData.name,
        avatarUrl: googleUserData.avatarUrl,
        googleId: googleUserData.googleId,
        authProvider: 'google',
      });
    });
  });

  describe('validatePassword', () => {
    it('should validate password correctly', async () => {
      const password = 'password123';
      const hashedPassword = 'hashedPassword123';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validatePassword(password, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      const password = 'wrongpassword';
      const hashedPassword = 'hashedPassword123';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validatePassword(password, hashedPassword);

      expect(result).toBe(false);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token', async () => {
      const mockToken = 'random-token-123';
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: jest.fn().mockReturnValue(mockToken),
      });

      const result = await service.generateRefreshToken();

      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      expect(result).toBe(mockToken);
    });
  });

  describe('updateRefreshToken', () => {
    it('should update user refresh token', async () => {
      const userId = 'user-123';
      const refreshToken = 'refresh-token-123';
      const hashedToken = 'hashed-refresh-token';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedToken);

      const { db } = require('../../db');
      const mockUpdateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      db.update.mockReturnValue(mockUpdateChain);

      await service.updateRefreshToken(userId, refreshToken);

      expect(bcrypt.hash).toHaveBeenCalledWith(refreshToken, 10);
      expect(db.update).toHaveBeenCalled();
      expect(mockUpdateChain.set).toHaveBeenCalledWith({
        refreshToken: hashedToken,
        refreshTokenExpiresAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('validateRefreshToken', () => {
    it('should validate refresh token successfully', async () => {
      const userId = 'user-123';
      const refreshToken = 'refresh-token-123';
      const hashedToken = 'hashed-refresh-token';

      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          {
            refreshToken: hashedToken,
            refreshTokenExpiresAt: new Date(Date.now() + 86400000), // 1 day from now
          },
        ]),
      };
      db.select.mockReturnValue(mockSelectChain);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateRefreshToken(userId, refreshToken);

      expect(result).toBe(true);
    });

    it('should return false for invalid refresh token', async () => {
      const userId = 'user-123';
      const refreshToken = 'invalid-token';

      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      db.select.mockReturnValue(mockSelectChain);

      const result = await service.validateRefreshToken(userId, refreshToken);

      expect(result).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('should return user profile without sensitive data', async () => {
      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };
      db.select.mockReturnValue(mockSelectChain);

      const result = await service.getProfile('user-123');

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).not.toHaveProperty('resetPasswordToken');
      expect(result).not.toHaveProperty('emailVerificationToken');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('name');
    });

    it('should return null for non-existent user', async () => {
      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      db.select.mockReturnValue(mockSelectChain);

      const result = await service.getProfile('nonexistent-user');

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const userId = 'user-123';
      const updateData = {
        name: 'Updated Name',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      const { db } = require('../../db');
      const mockUpdateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([
          {
            ...mockUser,
            ...updateData,
          },
        ]),
      };
      db.update.mockReturnValue(mockUpdateChain);

      const result = await service.updateProfile(userId, updateData);

      expect(db.update).toHaveBeenCalled();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.name).toBe(updateData.name);
      expect(result.avatarUrl).toBe(updateData.avatarUrl);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = 'user-123';
      const changePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword',
      };

      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };
      db.select.mockReturnValue(mockSelectChain);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');

      const mockUpdateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      db.update.mockReturnValue(mockUpdateChain);

      const result = await service.changePassword(userId, changePasswordDto);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        changePasswordDto.currentPassword,
        mockUser.passwordHash,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(
        changePasswordDto.newPassword,
        10,
      );
      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should throw error for incorrect current password', async () => {
      const userId = 'user-123';
      const changePasswordDto = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword',
      };

      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };
      db.select.mockReturnValue(mockSelectChain);

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(userId, changePasswordDto),
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('deleteAccount', () => {
    it('should delete user account', async () => {
      const userId = 'user-123';
      const deleteAccountDto = {};

      const { db } = require('../../db');
      const mockDeleteChain = {
        where: jest.fn().mockResolvedValue(undefined),
      };
      db.delete.mockReturnValue(mockDeleteChain);

      const result = await service.deleteAccount(userId, deleteAccountDto);

      expect(db.delete).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Account deleted successfully' });
    });
  });

  describe('exportUserData', () => {
    it('should export user data without sensitive information', async () => {
      const userId = 'user-123';

      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };
      db.select.mockReturnValue(mockSelectChain);

      const result = await service.exportUserData(userId);

      expect(result).toHaveProperty('userData');
      expect(result).toHaveProperty('exportedAt');
      expect(result).toHaveProperty('format', 'json');
      expect(result.userData).not.toHaveProperty('passwordHash');
      expect(result.userData).not.toHaveProperty('refreshToken');
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'nonexistent-user';

      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      db.select.mockReturnValue(mockSelectChain);

      await expect(service.exportUserData(userId)).rejects.toThrow(
        'User not found',
      );
    });
  });
});
