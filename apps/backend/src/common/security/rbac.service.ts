import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum Role {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  EDUCATOR = 'educator',
  PREMIUM = 'premium',
  SUPER_ADMIN = 'super_admin',
}

export enum Permission {
  // User permissions
  READ_OWN_PROFILE = 'read:own_profile',
  UPDATE_OWN_PROFILE = 'update:own_profile',
  DELETE_OWN_ACCOUNT = 'delete:own_account',

  // Study content permissions
  CREATE_STUDY_CONTENT = 'create:study_content',
  READ_OWN_STUDY_CONTENT = 'read:own_study_content',
  UPDATE_OWN_STUDY_CONTENT = 'update:own_study_content',
  DELETE_OWN_STUDY_CONTENT = 'delete:own_study_content',
  READ_PUBLIC_STUDY_CONTENT = 'read:public_study_content',
  SHARE_STUDY_CONTENT = 'share:study_content',

  // File upload permissions
  UPLOAD_FILES = 'upload:files',
  UPLOAD_LARGE_FILES = 'upload:large_files',

  // AI features permissions
  USE_AI_CHAT = 'use:ai_chat',
  USE_AI_PRACTICE = 'use:ai_practice',
  USE_AI_STUDY_PLANS = 'use:ai_study_plans',
  USE_AI_ADVANCED = 'use:ai_advanced',

  // Premium features
  ACCESS_PREMIUM_FEATURES = 'access:premium_features',
  ACCESS_ADVANCED_ANALYTICS = 'access:advanced_analytics',
  ACCESS_PRIORITY_SUPPORT = 'access:priority_support',

  // Moderation permissions
  MODERATE_CONTENT = 'moderate:content',
  MODERATE_USERS = 'moderate:users',
  VIEW_REPORTS = 'view:reports',
  MANAGE_REPORTS = 'manage:reports',

  // Admin permissions
  READ_ALL_USERS = 'read:all_users',
  UPDATE_ALL_USERS = 'update:all_users',
  DELETE_ALL_USERS = 'delete:all_users',
  MANAGE_ROLES = 'manage:roles',
  MANAGE_PERMISSIONS = 'manage:permissions',
  VIEW_SYSTEM_LOGS = 'view:system_logs',
  MANAGE_SYSTEM_SETTINGS = 'manage:system_settings',
  ACCESS_ADMIN_PANEL = 'access:admin_panel',

  // Super admin permissions
  MANAGE_SYSTEM = 'manage:system',
  VIEW_ALL_LOGS = 'view:all_logs',
  MANAGE_INFRASTRUCTURE = 'manage:infrastructure',
}

export interface RoleDefinition {
  name: Role;
  description: string;
  permissions: Permission[];
  inherits?: Role[];
  maxFileUploadSize?: number; // bytes
  maxAIRequestsPerDay?: number;
  maxStudySessionsPerDay?: number;
  canAccessBetaFeatures?: boolean;
}

export interface UserContext {
  userId: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
  isEmailVerified?: boolean;
  isPremium?: boolean;
  subscriptionExpiry?: Date;
}

export interface Resource {
  type: string;
  id?: string;
  ownerId?: string;
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

export interface AccessContext {
  user: UserContext;
  resource?: Resource;
  action: Permission;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
}

@Injectable()
export class RBACService {
  private readonly logger = new Logger(RBACService.name);
  private readonly roleDefinitions: Map<Role, RoleDefinition> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeRoles();
  }

  /**
   * Initialize role definitions with permissions
   */
  private initializeRoles(): void {
    // User role - basic permissions
    this.roleDefinitions.set(Role.USER, {
      name: Role.USER,
      description: 'Basic user with standard features',
      permissions: [
        Permission.READ_OWN_PROFILE,
        Permission.UPDATE_OWN_PROFILE,
        Permission.DELETE_OWN_ACCOUNT,
        Permission.CREATE_STUDY_CONTENT,
        Permission.READ_OWN_STUDY_CONTENT,
        Permission.UPDATE_OWN_STUDY_CONTENT,
        Permission.DELETE_OWN_STUDY_CONTENT,
        Permission.READ_PUBLIC_STUDY_CONTENT,
        Permission.SHARE_STUDY_CONTENT,
        Permission.UPLOAD_FILES,
        Permission.USE_AI_CHAT,
      ],
      maxFileUploadSize: 5 * 1024 * 1024, // 5MB
      maxAIRequestsPerDay: 50,
      maxStudySessionsPerDay: 10,
      canAccessBetaFeatures: false,
    });

    // Premium user role
    this.roleDefinitions.set(Role.PREMIUM, {
      name: Role.PREMIUM,
      description: 'Premium user with enhanced features',
      permissions: [
        Permission.ACCESS_PREMIUM_FEATURES,
        Permission.ACCESS_ADVANCED_ANALYTICS,
        Permission.ACCESS_PRIORITY_SUPPORT,
        Permission.UPLOAD_LARGE_FILES,
        Permission.USE_AI_PRACTICE,
        Permission.USE_AI_STUDY_PLANS,
        Permission.USE_AI_ADVANCED,
      ],
      inherits: [Role.USER],
      maxFileUploadSize: 50 * 1024 * 1024, // 50MB
      maxAIRequestsPerDay: 500,
      maxStudySessionsPerDay: 100,
      canAccessBetaFeatures: true,
    });

    // Educator role
    this.roleDefinitions.set(Role.EDUCATOR, {
      name: Role.EDUCATOR,
      description: 'Educator with content creation privileges',
      permissions: [
        Permission.ACCESS_PREMIUM_FEATURES,
        Permission.USE_AI_ADVANCED,
        Permission.UPLOAD_LARGE_FILES,
      ],
      inherits: [Role.USER],
      maxFileUploadSize: 100 * 1024 * 1024, // 100MB
      maxAIRequestsPerDay: 200,
      maxStudySessionsPerDay: 50,
      canAccessBetaFeatures: true,
    });

    // Moderator role
    this.roleDefinitions.set(Role.MODERATOR, {
      name: Role.MODERATOR,
      description: 'Content and user moderator',
      permissions: [
        Permission.MODERATE_CONTENT,
        Permission.MODERATE_USERS,
        Permission.VIEW_REPORTS,
        Permission.MANAGE_REPORTS,
      ],
      inherits: [Role.PREMIUM],
      maxFileUploadSize: 20 * 1024 * 1024, // 20MB
      maxAIRequestsPerDay: 300,
      maxStudySessionsPerDay: 50,
      canAccessBetaFeatures: true,
    });

    // Admin role
    this.roleDefinitions.set(Role.ADMIN, {
      name: Role.ADMIN,
      description: 'System administrator',
      permissions: [
        Permission.READ_ALL_USERS,
        Permission.UPDATE_ALL_USERS,
        Permission.DELETE_ALL_USERS,
        Permission.MANAGE_ROLES,
        Permission.MANAGE_PERMISSIONS,
        Permission.VIEW_SYSTEM_LOGS,
        Permission.MANAGE_SYSTEM_SETTINGS,
        Permission.ACCESS_ADMIN_PANEL,
      ],
      inherits: [Role.MODERATOR],
      maxFileUploadSize: 100 * 1024 * 1024, // 100MB
      maxAIRequestsPerDay: 1000,
      maxStudySessionsPerDay: 1000,
      canAccessBetaFeatures: true,
    });

    // Super admin role
    this.roleDefinitions.set(Role.SUPER_ADMIN, {
      name: Role.SUPER_ADMIN,
      description: 'Super administrator with all permissions',
      permissions: [
        Permission.MANAGE_SYSTEM,
        Permission.VIEW_ALL_LOGS,
        Permission.MANAGE_INFRASTRUCTURE,
      ],
      inherits: [Role.ADMIN],
      maxFileUploadSize: 1024 * 1024 * 1024, // 1GB
      maxAIRequestsPerDay: 10000,
      maxStudySessionsPerDay: 10000,
      canAccessBetaFeatures: true,
    });

    this.logger.log('RBAC roles initialized', {
      roleCount: this.roleDefinitions.size,
      roles: Array.from(this.roleDefinitions.keys()),
    });
  }

  /**
   * Get all permissions for a set of roles
   */
  getPermissionsForRoles(roles: Role[]): Permission[] {
    const allPermissions = new Set<Permission>();

    for (const role of roles) {
      const permissions = this.getAllPermissionsForRole(role);
      permissions.forEach((permission) => allPermissions.add(permission));
    }

    return Array.from(allPermissions);
  }

  /**
   * Get all permissions for a role including inherited permissions
   */
  private getAllPermissionsForRole(role: Role): Permission[] {
    const roleDefinition = this.roleDefinitions.get(role);
    if (!roleDefinition) {
      this.logger.warn(`Unknown role: ${role}`);
      return [];
    }

    const permissions = new Set<Permission>(roleDefinition.permissions);

    // Add inherited permissions
    if (roleDefinition.inherits) {
      for (const inheritedRole of roleDefinition.inherits) {
        const inheritedPermissions = this.getAllPermissionsForRole(inheritedRole);
        inheritedPermissions.forEach((permission) => permissions.add(permission));
      }
    }

    return Array.from(permissions);
  }

  /**
   * Check if user has required permission
   */
  hasPermission(user: UserContext, permission: Permission): boolean {
    return user.permissions.includes(permission);
  }

  /**
   * Check if user can access resource
   */
  canAccessResource(context: AccessContext): {
    allowed: boolean;
    reason?: string;
  } {
    const { user, resource, action } = context;

    // Check if user has the required permission
    if (!this.hasPermission(user, action)) {
      return {
        allowed: false,
        reason: `Missing required permission: ${action}`,
      };
    }

    // Resource-specific access control
    if (resource) {
      // Check ownership for own resources
      if (this.isOwnershipRequired(action) && resource.ownerId !== user.userId) {
        // Allow if user has admin permissions or resource is public
        if (!this.hasPermission(user, Permission.READ_ALL_USERS) && !resource.isPublic) {
          return {
            allowed: false,
            reason: 'Access denied: not resource owner',
          };
        }
      }

      // Check if email verification is required
      if (this.requiresEmailVerification(action) && !user.isEmailVerified) {
        return {
          allowed: false,
          reason: 'Email verification required',
        };
      }

      // Check premium features
      if (this.requiresPremium(action) && !user.isPremium) {
        return {
          allowed: false,
          reason: 'Premium subscription required',
        };
      }

      // Check subscription expiry
      if (user.isPremium && user.subscriptionExpiry && user.subscriptionExpiry < new Date()) {
        const premiumActions = [
          Permission.ACCESS_PREMIUM_FEATURES,
          Permission.ACCESS_ADVANCED_ANALYTICS,
          Permission.USE_AI_ADVANCED,
        ];

        if (premiumActions.includes(action)) {
          return {
            allowed: false,
            reason: 'Premium subscription expired',
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Enforce access control - throws exception if access denied
   */
  enforceAccess(context: AccessContext): void {
    const result = this.canAccessResource(context);

    if (!result.allowed) {
      this.logger.warn('Access denied', {
        userId: context.user.userId,
        action: context.action,
        reason: result.reason,
        resourceType: context.resource?.type,
        resourceId: context.resource?.id,
      });

      throw new ForbiddenException(result.reason || 'Access denied');
    }
  }

  /**
   * Get role limits for user
   */
  getRoleLimits(roles: Role[]): {
    maxFileUploadSize: number;
    maxAIRequestsPerDay: number;
    maxStudySessionsPerDay: number;
    canAccessBetaFeatures: boolean;
  } {
    let maxFileUploadSize = 0;
    let maxAIRequestsPerDay = 0;
    let maxStudySessionsPerDay = 0;
    let canAccessBetaFeatures = false;

    for (const role of roles) {
      const roleDefinition = this.roleDefinitions.get(role);
      if (roleDefinition) {
        maxFileUploadSize = Math.max(maxFileUploadSize, roleDefinition.maxFileUploadSize || 0);
        maxAIRequestsPerDay = Math.max(
          maxAIRequestsPerDay,
          roleDefinition.maxAIRequestsPerDay || 0,
        );
        maxStudySessionsPerDay = Math.max(
          maxStudySessionsPerDay,
          roleDefinition.maxStudySessionsPerDay || 0,
        );
        canAccessBetaFeatures =
          canAccessBetaFeatures || roleDefinition.canAccessBetaFeatures || false;
      }
    }

    return {
      maxFileUploadSize,
      maxAIRequestsPerDay,
      maxStudySessionsPerDay,
      canAccessBetaFeatures,
    };
  }

  /**
   * Check if action requires ownership
   */
  private isOwnershipRequired(action: Permission): boolean {
    const ownershipRequiredActions = [
      Permission.UPDATE_OWN_PROFILE,
      Permission.DELETE_OWN_ACCOUNT,
      Permission.READ_OWN_STUDY_CONTENT,
      Permission.UPDATE_OWN_STUDY_CONTENT,
      Permission.DELETE_OWN_STUDY_CONTENT,
    ];

    return ownershipRequiredActions.includes(action);
  }

  /**
   * Check if action requires email verification
   */
  private requiresEmailVerification(action: Permission): boolean {
    const verificationRequiredActions = [
      Permission.CREATE_STUDY_CONTENT,
      Permission.SHARE_STUDY_CONTENT,
      Permission.UPLOAD_FILES,
      Permission.USE_AI_CHAT,
    ];

    return verificationRequiredActions.includes(action);
  }

  /**
   * Check if action requires premium subscription
   */
  private requiresPremium(action: Permission): boolean {
    const premiumRequiredActions = [
      Permission.ACCESS_PREMIUM_FEATURES,
      Permission.ACCESS_ADVANCED_ANALYTICS,
      Permission.ACCESS_PRIORITY_SUPPORT,
      Permission.UPLOAD_LARGE_FILES,
      Permission.USE_AI_ADVANCED,
    ];

    return premiumRequiredActions.includes(action);
  }

  /**
   * Create user context from user data
   */
  createUserContext(userData: {
    userId: string;
    email: string;
    roles: string[];
    isEmailVerified?: boolean;
    isPremium?: boolean;
    subscriptionExpiry?: Date;
  }): UserContext {
    const roles = userData.roles.map((role) => role as Role);
    const permissions = this.getPermissionsForRoles(roles);

    return {
      userId: userData.userId,
      email: userData.email,
      roles,
      permissions,
      isEmailVerified: userData.isEmailVerified,
      isPremium: userData.isPremium,
      subscriptionExpiry: userData.subscriptionExpiry,
    };
  }

  /**
   * Get role definition
   */
  getRoleDefinition(role: Role): RoleDefinition | undefined {
    return this.roleDefinitions.get(role);
  }

  /**
   * Get all role definitions
   */
  getAllRoleDefinitions(): RoleDefinition[] {
    return Array.from(this.roleDefinitions.values());
  }

  /**
   * Check if role exists
   */
  roleExists(role: string): boolean {
    return this.roleDefinitions.has(role as Role);
  }

  /**
   * Validate role assignment
   */
  validateRoleAssignment(
    assignerRoles: Role[],
    targetRole: Role,
  ): {
    allowed: boolean;
    reason?: string;
  } {
    // Super admins can assign any role
    if (assignerRoles.includes(Role.SUPER_ADMIN)) {
      return { allowed: true };
    }

    // Admins can assign roles up to moderator
    if (assignerRoles.includes(Role.ADMIN)) {
      const allowedRoles = [Role.USER, Role.PREMIUM, Role.EDUCATOR, Role.MODERATOR];
      if (allowedRoles.includes(targetRole)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Admins cannot assign admin or super admin roles',
      };
    }

    // Moderators can assign basic roles
    if (assignerRoles.includes(Role.MODERATOR)) {
      const allowedRoles = [Role.USER, Role.PREMIUM];
      if (allowedRoles.includes(targetRole)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Moderators can only assign user and premium roles',
      };
    }

    return {
      allowed: false,
      reason: 'Insufficient permissions to assign roles',
    };
  }

  /**
   * Get permission hierarchy
   */
  getPermissionHierarchy(): Record<Role, Permission[]> {
    const hierarchy: Record<Role, Permission[]> = {} as any;

    for (const role of Object.values(Role)) {
      hierarchy[role] = this.getAllPermissionsForRole(role);
    }

    return hierarchy;
  }
}
