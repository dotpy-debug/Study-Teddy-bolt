import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SessionsService } from './sessions.service';
import { UsersService } from '../users/users.service';

@WebSocketGateway({
  namespace: '/study-sessions',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
})
export class SessionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SessionsGateway.name);
  private activeSessions: Map<string, any> = new Map();

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth or authorization header
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Connection attempt without token from client ${client.id}`);
        client.emit('error', {
          message: 'Authentication required. Please provide a valid JWT token.',
        });
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.verifyToken(token);

      if (!payload || !payload.sub) {
        this.logger.warn(`Invalid token payload for client ${client.id}`);
        client.emit('error', {
          message: 'Invalid authentication token.',
        });
        client.disconnect();
        return;
      }

      // Verify user exists and is active
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        this.logger.warn(`User not found for token payload: ${payload.sub}`);
        client.emit('error', {
          message: 'User not found or account has been deactivated.',
        });
        client.disconnect();
        return;
      }

      // Store verified user data in client socket
      client.data.userId = user.id;
      client.data.email = user.email;
      client.data.authenticated = true;

      this.logger.log(`Client ${client.id} authenticated as user ${user.id}`);

      // Emit successful authentication
      client.emit('authenticated', {
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      this.logger.error(`Authentication error for client ${client.id}:`, error.message);
      client.emit('error', {
        message: 'Authentication failed. Please reconnect with a valid token.',
      });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      this.logger.log(`Client disconnected: ${client.id}`);

      // Clean up any active sessions for this client
      const session = this.activeSessions.get(client.id);
      if (session && session.id) {
        // Stop timer updates first
        this.stopTimerUpdates(session.id);

        // Only pause if user was authenticated
        if (client.data.authenticated && client.data.userId) {
          try {
            await this.sessionsService.pauseSession(client.data.userId, session.id);
            this.logger.log(
              `Paused session ${session.id} for disconnected user ${client.data.userId}`,
            );
          } catch (error) {
            this.logger.error(`Error pausing session on disconnect:`, error.message);
          }
        }

        // Clean up active session tracking
        this.activeSessions.delete(client.id);
      }

      // Clean up any remaining timer intervals for this client
      this.cleanupClientTimers(client.id);
    } catch (error) {
      this.logger.error(`Error handling disconnect for client ${client.id}:`, error.message);
    }
  }

  private extractToken(client: Socket): string | null {
    // Try to get token from handshake auth object
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // Try to get token from Authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader) {
      // Handle "Bearer <token>" format
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        return parts[1];
      }
      // Handle raw token
      return authHeader;
    }

    // Try to get token from query parameters (less secure, but sometimes needed)
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }

    return null;
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      return await this.jwtService.verifyAsync(token, { secret });
    } catch (error) {
      this.logger.error(`Token verification failed:`, error.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private cleanupClientTimers(clientId: string) {
    // Clean up timers for sessions owned by this client
    this.sessionClientMap.forEach((ownerClientId, sessionId) => {
      if (ownerClientId === clientId) {
        this.logger.debug(
          `Cleaning up timer for session ${sessionId} owned by disconnected client ${clientId}`,
        );
        this.stopTimerUpdates(sessionId);
      }
    });
  }

  @SubscribeMessage('start-session')
  async startSession(
    @MessageBody() data: { subjectId: string; type: 'pomodoro' | 'free' },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Verify client is authenticated
      if (!this.isAuthenticated(client)) {
        client.emit('error', {
          message: 'Unauthorized: Please authenticate before starting a session',
        });
        return;
      }

      const userId = client.data.userId;

      // Check if client already has an active session
      if (this.activeSessions.has(client.id)) {
        const existingSession = this.activeSessions.get(client.id);
        client.emit('error', {
          message: `You already have an active session: ${existingSession.id}. Please end it before starting a new one.`,
        });
        return;
      }

      const session = await this.sessionsService.startSession(userId, data);

      this.activeSessions.set(client.id, session);

      // Join a room for this session
      client.join(`session:${session.id}`);

      // Emit session started event
      client.emit('session-started', session);

      // Start timer updates
      this.startTimerUpdates(session.id, client);

      this.logger.log(`Session ${session.id} started by user ${userId}`);

      return session;
    } catch (error) {
      this.logger.error(`Error starting session:`, error);
      client.emit('error', {
        message: 'Failed to start session',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('pause-session')
  async pauseSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Verify client is authenticated
      if (!this.isAuthenticated(client)) {
        client.emit('error', {
          message: 'Unauthorized: Please authenticate before pausing a session',
        });
        return;
      }

      const userId = client.data.userId;

      // Verify the session belongs to this user
      const activeSession = this.activeSessions.get(client.id);
      if (!activeSession || activeSession.id !== data.sessionId) {
        client.emit('error', {
          message: 'Session not found or you do not have permission to pause it',
        });
        return;
      }

      const session = await this.sessionsService.pauseSession(userId, data.sessionId);

      // Stop timer updates
      this.stopTimerUpdates(data.sessionId);

      // Emit session paused event
      this.server.to(`session:${data.sessionId}`).emit('session-paused', session);

      this.logger.log(`Session ${data.sessionId} paused by user ${userId}`);

      return session;
    } catch (error) {
      this.logger.error(`Error pausing session:`, error);
      client.emit('error', {
        message: 'Failed to pause session',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('resume-session')
  async resumeSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Verify client is authenticated
      if (!this.isAuthenticated(client)) {
        client.emit('error', {
          message: 'Unauthorized: Please authenticate before resuming a session',
        });
        return;
      }

      const userId = client.data.userId;

      // Verify the session belongs to this user
      const activeSession = this.activeSessions.get(client.id);
      if (!activeSession || activeSession.id !== data.sessionId) {
        client.emit('error', {
          message: 'Session not found or you do not have permission to resume it',
        });
        return;
      }

      const session = await this.sessionsService.resumeSession(userId, data.sessionId);

      // Resume timer updates
      this.startTimerUpdates(data.sessionId, client);

      // Emit session resumed event
      this.server.to(`session:${data.sessionId}`).emit('session-resumed', session);

      this.logger.log(`Session ${data.sessionId} resumed by user ${userId}`);

      return session;
    } catch (error) {
      this.logger.error(`Error resuming session:`, error);
      client.emit('error', {
        message: 'Failed to resume session',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('end-session')
  async endSession(
    @MessageBody() data: { sessionId: string; notes?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Verify client is authenticated
      if (!this.isAuthenticated(client)) {
        client.emit('error', {
          message: 'Unauthorized: Please authenticate before ending a session',
        });
        return;
      }

      const userId = client.data.userId;

      // Verify the session belongs to this user
      const activeSession = this.activeSessions.get(client.id);
      if (!activeSession || activeSession.id !== data.sessionId) {
        client.emit('error', {
          message: 'Session not found or you do not have permission to end it',
        });
        return;
      }

      const session = await this.sessionsService.endSession(userId, data.sessionId);

      // Clean up
      this.activeSessions.delete(client.id);
      this.stopTimerUpdates(data.sessionId);

      // Emit session ended event
      this.server.to(`session:${data.sessionId}`).emit('session-ended', session);

      // Leave the room
      client.leave(`session:${data.sessionId}`);

      this.logger.log(`Session ${data.sessionId} ended by user ${userId}`);

      return session;
    } catch (error) {
      this.logger.error(`Error ending session:`, error);
      client.emit('error', {
        message: 'Failed to end session',
        error: error.message,
      });
    }
  }

  private timerIntervals: Map<string, NodeJS.Timeout> = new Map();
  private sessionClientMap: Map<string, string> = new Map(); // Maps sessionId to clientId

  private isAuthenticated(client: Socket): boolean {
    return client.data.authenticated === true && !!client.data.userId;
  }

  private startTimerUpdates(sessionId: string, client: Socket) {
    // Prevent duplicate timers for the same session
    if (this.timerIntervals.has(sessionId)) {
      this.logger.warn(`Timer already exists for session ${sessionId}`);
      return;
    }

    // Map session to client for cleanup
    this.sessionClientMap.set(sessionId, client.id);

    // Send timer updates every second
    const interval = setInterval(async () => {
      try {
        const session = await this.sessionsService.getSessionStatus(sessionId);

        if (!session) {
          this.logger.warn(`Session ${sessionId} not found, stopping timer`);
          this.stopTimerUpdates(sessionId);
          return;
        }

        const duration =
          session.totalDuration ||
          (session.endTime
            ? Math.floor(
                (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) /
                  1000,
              )
            : Math.floor((new Date().getTime() - new Date(session.startTime).getTime()) / 1000));

        this.server.to(`session:${sessionId}`).emit('timer-update', {
          sessionId,
          duration: duration,
          status: session.status,
        });
      } catch (error) {
        this.logger.error(`Error in timer update for session ${sessionId}:`, error.message);
        this.stopTimerUpdates(sessionId);
      }
    }, 1000);

    this.timerIntervals.set(sessionId, interval);
    this.logger.debug(`Started timer for session ${sessionId}`);
  }

  private stopTimerUpdates(sessionId: string) {
    const interval = this.timerIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.timerIntervals.delete(sessionId);
      this.sessionClientMap.delete(sessionId);
      this.logger.debug(`Stopped timer for session ${sessionId}`);
    }
  }
}
