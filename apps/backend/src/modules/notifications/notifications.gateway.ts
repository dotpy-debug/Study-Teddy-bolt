import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface NotificationPayload {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: string;
  metadata?: any;
  createdAt: string;
}

interface ConnectionInfo {
  userId: string;
  socketId: string;
  connectedAt: Date;
  lastActivity: Date;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userConnections = new Map<string, Set<string>>(); // userId -> Set of socket IDs
  private readonly socketUsers = new Map<string, string>(); // socketId -> userId
  private readonly connectionInfo = new Map<string, ConnectionInfo>(); // socketId -> connection info

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Notifications WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided from ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = await this.validateToken(token);
      if (!payload || !payload.sub) {
        this.logger.warn(`Connection rejected: Invalid token from ${client.id}`);
        client.disconnect();
        return;
      }

      const userId = payload.sub;
      client.userId = userId;

      // Track user connections
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(client.id);
      this.socketUsers.set(client.id, userId);

      // Store connection info
      this.connectionInfo.set(client.id, {
        userId,
        socketId: client.id,
        connectedAt: new Date(),
        lastActivity: new Date(),
      });

      // Join user-specific room
      await client.join(`user:${userId}`);

      this.logger.log(
        `User ${userId} connected via socket ${client.id}. Total connections: ${this.userConnections.get(userId)!.size}`,
      );

      // Send connection acknowledgment
      client.emit('connected', {
        message: 'Successfully connected to notifications',
        userId,
        socketId: client.id,
      });

      // Send any pending notifications count
      this.sendUnreadCount(userId);
    } catch (error) {
      this.logger.error(`Error handling connection for ${client.id}:`, error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId || this.socketUsers.get(client.id);

    if (userId) {
      // Remove from tracking
      const userSockets = this.userConnections.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userConnections.delete(userId);
        }
      }
      this.socketUsers.delete(client.id);
      this.connectionInfo.delete(client.id);

      this.logger.log(
        `User ${userId} disconnected from socket ${client.id}. Remaining connections: ${userSockets?.size || 0}`,
      );
    } else {
      this.logger.log(`Anonymous client ${client.id} disconnected`);
    }
  }

  // Message handlers
  @SubscribeMessage('subscribe-to-notifications')
  async handleSubscribeToNotifications(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { categories?: string[]; types?: string[] },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Join specific notification category rooms if provided
    if (data.categories?.length) {
      for (const category of data.categories) {
        await client.join(`category:${category}`);
      }
    }

    // Join specific notification type rooms if provided
    if (data.types?.length) {
      for (const type of data.types) {
        await client.join(`type:${type}`);
      }
    }

    this.updateLastActivity(client.id);

    client.emit('subscription-confirmed', {
      message: 'Subscribed to notifications',
      categories: data.categories || [],
      types: data.types || [],
    });

    this.logger.debug(`User ${client.userId} subscribed to notifications`, data);
  }

  @SubscribeMessage('unsubscribe-from-notifications')
  async handleUnsubscribeFromNotifications(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { categories?: string[]; types?: string[] },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Leave specific notification category rooms if provided
    if (data.categories?.length) {
      for (const category of data.categories) {
        await client.leave(`category:${category}`);
      }
    }

    // Leave specific notification type rooms if provided
    if (data.types?.length) {
      for (const type of data.types) {
        await client.leave(`type:${type}`);
      }
    }

    this.updateLastActivity(client.id);

    client.emit('unsubscription-confirmed', {
      message: 'Unsubscribed from notifications',
      categories: data.categories || [],
      types: data.types || [],
    });

    this.logger.debug(`User ${client.userId} unsubscribed from notifications`, data);
  }

  @SubscribeMessage('mark-notification-read')
  async handleMarkNotificationRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    this.updateLastActivity(client.id);

    // Broadcast to all user's connections that notification was read
    this.server.to(`user:${client.userId}`).emit('notification-read', {
      notificationId: data.notificationId,
      userId: client.userId,
    });

    this.logger.debug(`User ${client.userId} marked notification ${data.notificationId} as read`);
  }

  @SubscribeMessage('get-connection-info')
  handleGetConnectionInfo(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const info = this.connectionInfo.get(client.id);
    const userSocketCount = this.userConnections.get(client.userId)?.size || 0;

    this.updateLastActivity(client.id);

    client.emit('connection-info', {
      ...info,
      totalUserConnections: userSocketCount,
    });
  }

  // Event listeners for service events
  @OnEvent('notification.created')
  handleNotificationCreated(data: { userId: string; notification: NotificationPayload }) {
    this.sendNotificationToUser(data.userId, data.notification);
  }

  @OnEvent('notifications.read')
  handleNotificationsRead(data: { userId: string; notificationIds: string[] }) {
    this.server.to(`user:${data.userId}`).emit('notifications-marked-read', {
      notificationIds: data.notificationIds,
      userId: data.userId,
    });

    // Update unread count
    this.sendUnreadCount(data.userId);
  }

  @OnEvent('notifications.allRead')
  handleAllNotificationsRead(data: { userId: string }) {
    this.server.to(`user:${data.userId}`).emit('all-notifications-read', {
      userId: data.userId,
    });

    // Update unread count
    this.sendUnreadCount(data.userId);
  }

  @OnEvent('notification.deleted')
  handleNotificationDeleted(data: { userId: string; notificationId: string }) {
    this.server.to(`user:${data.userId}`).emit('notification-deleted', {
      notificationId: data.notificationId,
      userId: data.userId,
    });

    // Update unread count
    this.sendUnreadCount(data.userId);
  }

  @OnEvent('notifications.cleared')
  handleNotificationsCleared(data: { userId: string }) {
    this.server.to(`user:${data.userId}`).emit('notifications-cleared', {
      userId: data.userId,
    });
  }

  @OnEvent('notifications.archived')
  handleNotificationsArchived(data: { userId: string; notificationIds: string[] }) {
    this.server.to(`user:${data.userId}`).emit('notifications-archived', {
      notificationIds: data.notificationIds,
      userId: data.userId,
    });
  }

  @OnEvent('notifications.bulkOperation')
  handleBulkOperation(data: { action: string; notificationIds: string[]; userId: string }) {
    this.server.to(`user:${data.userId}`).emit('bulk-operation-completed', {
      action: data.action,
      notificationIds: data.notificationIds,
      userId: data.userId,
    });

    // Update unread count if action affects read status
    if (['markAsRead', 'markAsUnread', 'delete'].includes(data.action)) {
      this.sendUnreadCount(data.userId);
    }
  }

  // Public methods for service to use
  sendNotificationToUser(userId: string, notification: NotificationPayload) {
    const userSockets = this.userConnections.get(userId);

    if (!userSockets || userSockets.size === 0) {
      this.logger.debug(
        `No active connections for user ${userId}, notification will be stored for later`,
      );
      return;
    }

    // Send to all user's connections
    this.server.to(`user:${userId}`).emit('new-notification', notification);

    // Send to category-specific rooms
    this.server.to(`category:${notification.category}`).emit('category-notification', notification);

    // Send to type-specific rooms
    this.server.to(`type:${notification.type}`).emit('type-notification', notification);

    // Update unread count
    this.sendUnreadCount(userId);

    this.logger.debug(
      `Sent notification ${notification.id} to user ${userId} (${userSockets.size} connections)`,
    );
  }

  private async sendUnreadCount(userId: string) {
    // This would need to integrate with your service to get actual unread count
    // For now, just emit a placeholder
    this.server.to(`user:${userId}`).emit('unread-count-updated', {
      userId,
      timestamp: new Date().toISOString(),
      // count: await this.notificationsService.getUnreadCount(userId)
    });
  }

  private extractTokenFromSocket(client: Socket): string | null {
    // Try to get token from auth header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from query params
    const token = client.handshake.query.token as string;
    if (token) {
      return token;
    }

    // Try to get token from auth object
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    return null;
  }

  private async validateToken(token: string): Promise<any> {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      return await this.jwtService.verifyAsync(token, { secret });
    } catch (error) {
      this.logger.warn('Invalid JWT token:', error.message);
      return null;
    }
  }

  private updateLastActivity(socketId: string) {
    const info = this.connectionInfo.get(socketId);
    if (info) {
      info.lastActivity = new Date();
    }
  }

  // Admin/monitoring methods
  getConnectionStats() {
    const totalConnections = this.socketUsers.size;
    const uniqueUsers = this.userConnections.size;
    const connectionsPerUser = Array.from(this.userConnections.values()).map(
      (sockets) => sockets.size,
    );

    return {
      totalConnections,
      uniqueUsers,
      averageConnectionsPerUser: totalConnections / uniqueUsers || 0,
      maxConnectionsPerUser: Math.max(...connectionsPerUser, 0),
      connectionDetails: Array.from(this.connectionInfo.values()),
    };
  }

  getUserConnections(userId: string): string[] {
    return Array.from(this.userConnections.get(userId) || []);
  }

  disconnectUser(userId: string, reason = 'Admin disconnect') {
    const userSockets = this.userConnections.get(userId);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('force-disconnect', { reason });
          socket.disconnect();
        }
      });
    }
  }

  // Broadcast to all connected users
  broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(`Broadcasted ${event} to all connected users`);
  }

  // Broadcast to specific user group
  broadcastToUsers(userIds: string[], event: string, data: any) {
    userIds.forEach((userId) => {
      this.server.to(`user:${userId}`).emit(event, data);
    });
    this.logger.log(`Broadcasted ${event} to ${userIds.length} users`);
  }
}
