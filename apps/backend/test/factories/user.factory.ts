import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  avatarUrl?: string;
  authProvider?: string;
  emailVerified?: boolean;
  refreshToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastPasswordResetRequest?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UserFactory {
  static create(overrides?: Partial<MockUser>): MockUser {
    const baseUser: MockUser = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      passwordHash: faker.string.alphanumeric(60),
      avatarUrl: faker.image.avatar(),
      authProvider: 'email',
      emailVerified: true,
      refreshToken: faker.string.alphanumeric(32),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };

    return { ...baseUser, ...overrides };
  }

  static createMany(count: number, overrides?: Partial<MockUser>): MockUser[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createWithGoogleAuth(overrides?: Partial<MockUser>): MockUser {
    return this.create({
      authProvider: 'google',
      passwordHash: undefined,
      emailVerified: true,
      ...overrides,
    });
  }

  static createUnverified(overrides?: Partial<MockUser>): MockUser {
    return this.create({
      emailVerified: false,
      ...overrides,
    });
  }

  static createWithResetToken(overrides?: Partial<MockUser>): MockUser {
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

    return this.create({
      resetPasswordToken: faker.string.alphanumeric(64),
      resetPasswordExpires: resetTokenExpiry,
      lastPasswordResetRequest: faker.date.recent(),
      ...overrides,
    });
  }
}
