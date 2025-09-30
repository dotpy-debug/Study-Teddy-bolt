import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { CalendarTokens, GoogleCalendarConfig } from '../interfaces/calendar.interfaces';

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);
  private readonly oauth2Client: OAuth2Client;
  private readonly config: GoogleCalendarConfig;

  constructor(private readonly configService: ConfigService) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUrl = this.configService.get<string>('GOOGLE_CALENDAR_REDIRECT_URL');
    const scopes = this.configService.get<string>('GOOGLE_CALENDAR_SCOPES')?.split(',') || [];
    const calendarName = this.configService.get<string>(
      'GOOGLE_CALENDAR_CALENDAR_NAME',
      'Study Teddy',
    );

    if (!clientId || !clientSecret) {
      throw new Error('Google Calendar OAuth credentials not configured');
    }

    this.config = {
      clientId,
      clientSecret,
      redirectUrl: redirectUrl || 'http://localhost:3001/api/calendar/oauth/callback',
      scopes:
        scopes.length > 0
          ? scopes
          : [
              'https://www.googleapis.com/auth/calendar',
              'https://www.googleapis.com/auth/calendar.readonly',
              'https://www.googleapis.com/auth/userinfo.email',
              'https://www.googleapis.com/auth/userinfo.profile',
            ],
      calendarName,
    };

    this.oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUrl,
    );
  }

  /**
   * Generate the OAuth2 authorization URL
   */
  generateAuthUrl(state?: string): string {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.config.scopes,
      prompt: 'consent', // Force consent to ensure refresh token is returned
      state,
    });

    this.logger.debug(`Generated auth URL: ${authUrl}`);
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<CalendarTokens> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      this.logger.debug(
        `Received tokens: ${JSON.stringify({
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
          expiryDate: tokens.expiry_date,
        })}`,
      );

      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiryDate: tokens.expiry_date || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to exchange code for tokens: ${error.message}`);
      throw new Error(`Failed to authenticate with Google Calendar: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<CalendarTokens> {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      this.logger.debug(
        `Refreshed tokens: ${JSON.stringify({
          hasAccessToken: !!credentials.access_token,
          hasRefreshToken: !!credentials.refresh_token,
          expiryDate: credentials.expiry_date,
        })}`,
      );

      if (!credentials.access_token) {
        throw new Error('No access token received during refresh');
      }

      return {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || refreshToken, // Keep original if new one not provided
        expiryDate: credentials.expiry_date || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to refresh access token: ${error.message}`);
      throw new Error(`Failed to refresh Google Calendar access: ${error.message}`);
    }
  }

  /**
   * Verify and decode access token
   */
  async verifyAccessToken(accessToken: string): Promise<any> {
    try {
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: accessToken,
        audience: this.config.clientId,
      });

      const payload = ticket.getPayload();
      return payload;
    } catch (error) {
      // If ID token verification fails, try to get user info directly
      try {
        this.oauth2Client.setCredentials({ access_token: accessToken });
        const oauth2 = google.oauth2({
          version: 'v2',
          auth: this.oauth2Client,
        });
        const { data } = await oauth2.userinfo.get();
        return data;
      } catch (innerError) {
        this.logger.error(`Failed to verify access token: ${innerError.message}`);
        throw new Error('Invalid or expired access token');
      }
    }
  }

  /**
   * Get user info from access token
   */
  async getUserInfo(accessToken: string): Promise<{
    email: string;
    name: string;
    picture?: string;
  }> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();

      return {
        email: data.email || '',
        name: data.name || '',
        picture: data.picture,
      };
    } catch (error) {
      this.logger.error(`Failed to get user info: ${error.message}`);
      throw new Error(`Failed to get user information: ${error.message}`);
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(token: string): Promise<void> {
    try {
      await this.oauth2Client.revokeToken(token);
      this.logger.debug(`Revoked token for user`);
    } catch (error) {
      this.logger.error(`Failed to revoke token: ${error.message}`);
      throw new Error(`Failed to revoke Google Calendar access: ${error.message}`);
    }
  }

  /**
   * Check if token is expired or about to expire
   */
  isTokenExpired(expiryDate?: number): boolean {
    if (!expiryDate) {
      return false; // Assume not expired if no expiry date
    }

    // Check if expires in less than 5 minutes
    const bufferTime = 5 * 60 * 1000;
    return Date.now() >= expiryDate - bufferTime;
  }

  /**
   * Get configured OAuth2 client with credentials
   */
  getAuthenticatedClient(tokens: CalendarTokens): OAuth2Client {
    const client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUrl,
    );

    client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiryDate,
    });

    return client;
  }

  /**
   * Get configuration
   */
  getConfig(): GoogleCalendarConfig {
    return this.config;
  }
}
