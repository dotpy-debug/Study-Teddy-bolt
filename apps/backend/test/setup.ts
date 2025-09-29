// Global test setup for unit tests
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.SKIP_EMAIL_VERIFICATION = 'true';
process.env.DISABLE_RATE_LIMITING = 'true';
process.env.MOCK_EXTERNAL_SERVICES = 'true';

// Global test utilities
global.console = {
  ...console,
  // Suppress non-error logs during tests
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn, // Keep warnings
  error: console.error, // Keep errors
};

// Configure test timeouts
jest.setTimeout(30000);

// Mock external services globally
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Mocked AI response for testing',
              },
            },
          ],
          usage: {
            prompt_tokens: 25,
            completion_tokens: 25,
            total_tokens: 50,
          },
        }),
      },
    },
  })),
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      accepted: ['test@example.com'],
      rejected: [],
    }),
    verify: jest.fn().mockResolvedValue(true),
  }),
}));

// Mock Redis/IORedis
jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn().mockResolvedValue(undefined),
    flushall: jest.fn().mockResolvedValue('OK'),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-1),
  })),
}));

// Mock BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
    close: jest.fn().mockResolvedValue(undefined),
    removeJobs: jest.fn().mockResolvedValue(undefined),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock Google APIs
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        getAccessToken: jest.fn().mockResolvedValue({ token: 'mock-token' }),
      })),
    },
    calendar: jest.fn().mockReturnValue({
      events: {
        list: jest.fn().mockResolvedValue({
          data: {
            items: [],
          },
        }),
        insert: jest.fn().mockResolvedValue({
          data: {
            id: 'test-event-id',
          },
        }),
      },
    }),
  },
}));

// Mock file upload
jest.mock('multer', () => ({
  diskStorage: jest.fn(() => ({})),
  memoryStorage: jest.fn(() => ({})),
}));

// Mock PDF parsing
jest.mock('pdf-parse', () =>
  jest.fn().mockResolvedValue({
    text: 'Mock PDF content',
    numpages: 1,
    info: { Title: 'Mock PDF' },
  }),
);

// Mock mammoth (Word doc parsing)
jest.mock('mammoth', () => ({
  extractRawText: jest.fn().mockResolvedValue({
    value: 'Mock Word document content',
  }),
}));

// Setup global test helpers
global.createMockUser = () => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'student',
  authProvider: 'local',
  emailVerified: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

global.createMockTask = () => ({
  id: 'test-task-id',
  userId: 'test-user-id',
  title: 'Test Task',
  description: 'Test Description',
  priority: 'medium',
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
});

global.createMockAIChat = () => ({
  id: 'test-chat-id',
  userId: 'test-user-id',
  prompt: 'Test prompt',
  response: 'Test response',
  model: 'gpt-4o-mini',
  promptTokens: 25,
  completionTokens: 25,
  totalTokens: 50,
  createdAt: new Date(),
});

// Clean up after tests
afterEach(() => {
  jest.clearAllMocks();
});
