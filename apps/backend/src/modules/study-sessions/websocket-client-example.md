# WebSocket Authentication Example for Study Sessions

## Security Implementation Summary

The WebSocket gateway now implements robust JWT authentication to prevent session hijacking:

### Key Security Features Implemented:

1. **JWT Verification on Connection**
   - Extracts JWT from multiple sources (auth object, Authorization header, query params)
   - Verifies token signature and expiry
   - Validates user existence in database
   - Disconnects unauthorized clients immediately

2. **Session Ownership Validation**
   - Each WebSocket message handler verifies authentication
   - Validates that sessions belong to authenticated user
   - Prevents cross-user session manipulation

3. **Proper Resource Cleanup**
   - Cleans up timers on disconnect
   - Pauses active sessions when client disconnects
   - Prevents memory leaks from orphaned intervals

4. **Comprehensive Error Handling**
   - Detailed logging for security events
   - Clear error messages to clients
   - Graceful handling of edge cases

## Client Connection Example

### JavaScript/TypeScript Client

```typescript
import { io, Socket } from 'socket.io-client';

// Assuming you have the JWT token from your auth flow
const token = localStorage.getItem('jwt_token');

// Option 1: Send token in auth object (Recommended)
const socket = io('http://localhost:3001/study-sessions', {
  auth: {
    token: token
  }
});

// Option 2: Send token in Authorization header
const socket = io('http://localhost:3001/study-sessions', {
  extraHeaders: {
    Authorization: `Bearer ${token}`
  }
});

// Option 3: Send token as query parameter (Less secure, use only if needed)
const socket = io('http://localhost:3001/study-sessions', {
  query: {
    token: token
  }
});

// Handle authentication events
socket.on('authenticated', (data) => {
  console.log('Successfully authenticated:', data);
  // Now you can start using session commands
});

socket.on('error', (error) => {
  console.error('WebSocket error:', error);
  // Handle authentication errors
  if (error.message.includes('Authentication')) {
    // Redirect to login or refresh token
  }
});

// Example: Starting a session (after authentication)
socket.emit('start-session', {
  subjectId: 'math-101',
  type: 'pomodoro'
});

socket.on('session-started', (session) => {
  console.log('Session started:', session);
});

// Handle timer updates
socket.on('timer-update', (data) => {
  console.log(`Session ${data.sessionId}: ${data.duration}s`);
});
```

## Security Best Practices

1. **Always use HTTPS/WSS in production** to prevent token interception
2. **Implement token refresh** mechanism for expired tokens
3. **Store tokens securely** (httpOnly cookies preferred over localStorage)
4. **Implement rate limiting** on WebSocket events to prevent abuse
5. **Monitor failed authentication attempts** for potential attacks
6. **Use short-lived tokens** and refresh them regularly

## Testing the Secure Implementation

### Test Authentication Failure
```javascript
// Attempt connection without token
const invalidSocket = io('http://localhost:3001/study-sessions');
// Should disconnect immediately with error

// Attempt with invalid token
const badSocket = io('http://localhost:3001/study-sessions', {
  auth: { token: 'invalid_token_here' }
});
// Should disconnect with authentication error
```

### Test Session Hijacking Prevention
```javascript
// Even if a malicious client somehow connects
// They cannot access other users' sessions
socket.emit('pause-session', {
  sessionId: 'another-users-session-id'
});
// Will receive error: "Session not found or you do not have permission"
```

## Migration Notes

If you have existing WebSocket clients, update them to:

1. Include JWT token in connection handshake
2. Handle `authenticated` event before sending commands
3. Handle `error` events for authentication failures
4. Implement reconnection logic with fresh tokens