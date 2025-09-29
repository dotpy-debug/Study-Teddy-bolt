# Study Teddy - NestJS/Next.js Architecture Refactor

> **Study Teddy**: AI-Powered Study Planner & Intelligent Learning Companion
> **Version**: 3.0 Enterprise Architecture
> **Stack**: NestJS + Next.js + PostgreSQL + Redis + TypeScript
> **Website**: studyteddy.com

---

## 🎯 Architecture Overview

**Study Teddy Enterprise** leverages a modern microservices-ready architecture with NestJS backend API, Next.js frontend with SSR/SSG capabilities, PostgreSQL for persistent storage, and Redis for caching and real-time features.

### 🏗️ Technology Stack

#### **Backend (NestJS)**
- **NestJS 10.x** - Enterprise Node.js framework with TypeScript
- **TypeORM** - Advanced ORM with migrations and relations
- **Passport.js** - Authentication strategies (JWT, OAuth)
- **Bull Queue** - Redis-based job queuing for background tasks
- **Socket.io** - Real-time WebSocket connections
- **Swagger** - Auto-generated API documentation
- **Class Validator** - DTO validation with decorators

#### **Frontend (Next.js)**
- **Next.js 14** - React framework with App Router
- **TypeScript 5.x** - Type-safe development
- **Tailwind CSS 3.x** - Utility-first styling
- **shadcn/ui** - Component library
- **TanStack Query v5** - Server state management
- **Zustand** - Client state management
- **next-auth** - Authentication for Next.js

#### **Database & Caching**
- **PostgreSQL 16** - Primary database with pgvector extension
- **Redis 7** - Caching, sessions, and pub/sub
- **Prisma** - Modern ORM alternative (optional)
- **pgBouncer** - Connection pooling

#### **Infrastructure**
- **Docker** - Containerization
- **Kubernetes** - Orchestration (production)
- **NGINX** - Reverse proxy and load balancing
- **MinIO** - S3-compatible object storage

---

## 📁 Project Structure

```
study-teddy-enterprise/
├── 🔧 CONFIGURATION
│   ├── docker-compose.yml          # Local development environment
│   ├── docker-compose.prod.yml     # Production configuration
│   ├── .env.example                # Environment variables template
│   ├── nx.json                     # Nx monorepo configuration
│   └── package.json                # Monorepo root package
│
├── 🎯 BACKEND (apps/api/)
│   ├── src/
│   │   ├── main.ts                # NestJS application entry
│   │   ├── app.module.ts          # Root application module
│   │   │
│   │   ├── 🔌 CORE MODULES
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── strategies/
│   │   │   │   │   ├── jwt.strategy.ts
│   │   │   │   │   ├── local.strategy.ts
│   │   │   │   │   └── google.strategy.ts
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   └── roles.guard.ts
│   │   │   │   └── dto/
│   │   │   │       ├── login.dto.ts
│   │   │   │       └── register.dto.ts
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── entities/
│   │   │   │   │   └── user.entity.ts
│   │   │   │   └── dto/
│   │   │   │       ├── create-user.dto.ts
│   │   │   │       └── update-user.dto.ts
│   │   │   │
│   │   │   ├── tasks/
│   │   │   │   ├── tasks.module.ts
│   │   │   │   ├── tasks.controller.ts
│   │   │   │   ├── tasks.service.ts
│   │   │   │   ├── entities/
│   │   │   │   │   └── task.entity.ts
│   │   │   │   └── dto/
│   │   │   │       └── task.dto.ts
│   │   │   │
│   │   │   ├── ai/
│   │   │   │   ├── ai.module.ts
│   │   │   │   ├── ai.controller.ts
│   │   │   │   ├── ai.service.ts
│   │   │   │   ├── ai.gateway.ts         # WebSocket gateway
│   │   │   │   ├── processors/
│   │   │   │   │   ├── chat.processor.ts
│   │   │   │   │   ├── rag.processor.ts
│   │   │   │   │   └── document.processor.ts
│   │   │   │   └── dto/
│   │   │   │       └── chat.dto.ts
│   │   │   │
│   │   │   ├── documents/
│   │   │   │   ├── documents.module.ts
│   │   │   │   ├── documents.controller.ts
│   │   │   │   ├── documents.service.ts
│   │   │   │   ├── entities/
│   │   │   │   │   ├── document.entity.ts
│   │   │   │   │   └── embedding.entity.ts
│   │   │   │   └── processors/
│   │   │   │       └── upload.processor.ts
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │   ├── analytics.module.ts
│   │   │   │   ├── analytics.controller.ts
│   │   │   │   ├── analytics.service.ts
│   │   │   │   └── entities/
│   │   │   │       └── analytics.entity.ts
│   │   │   │
│   │   │   └── flashcards/
│   │   │       ├── flashcards.module.ts
│   │   │       ├── flashcards.controller.ts
│   │   │       ├── flashcards.service.ts
│   │   │       ├── entities/
│   │   │       │   └── flashcard.entity.ts
│   │   │       └── algorithms/
│   │   │           └── spaced-repetition.ts
│   │   │
│   │   ├── 🏢 SHARED MODULES
│   │   │   ├── database/
│   │   │   │   ├── database.module.ts
│   │   │   │   ├── database.providers.ts
│   │   │   │   └── migrations/
│   │   │   │       ├── 1700000000000-InitialSchema.ts
│   │   │   │       └── 1700000000001-AddVectorExtension.ts
│   │   │   │
│   │   │   ├── redis/
│   │   │   │   ├── redis.module.ts
│   │   │   │   ├── redis.service.ts
│   │   │   │   └── redis.providers.ts
│   │   │   │
│   │   │   ├── queue/
│   │   │   │   ├── queue.module.ts
│   │   │   │   ├── queue.service.ts
│   │   │   │   └── processors/
│   │   │   │       ├── email.processor.ts
│   │   │   │       └── notification.processor.ts
│   │   │   │
│   │   │   └── storage/
│   │   │       ├── storage.module.ts
│   │   │       ├── storage.service.ts
│   │   │       └── storage.config.ts
│   │   │
│   │   ├── 🛠️ COMMON
│   │   │   ├── decorators/
│   │   │   │   ├── user.decorator.ts
│   │   │   │   └── roles.decorator.ts
│   │   │   ├── filters/
│   │   │   │   ├── http-exception.filter.ts
│   │   │   │   └── validation.filter.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── logging.interceptor.ts
│   │   │   │   ├── cache.interceptor.ts
│   │   │   │   └── transform.interceptor.ts
│   │   │   ├── pipes/
│   │   │   │   └── validation.pipe.ts
│   │   │   └── middleware/
│   │   │       ├── logger.middleware.ts
│   │   │       └── rate-limit.middleware.ts
│   │   │
│   │   └── 🔧 CONFIG
│   │       ├── configuration.ts
│   │       ├── database.config.ts
│   │       ├── redis.config.ts
│   │       └── jwt.config.ts
│   │
│   ├── test/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   │
│   ├── nest-cli.json
│   ├── tsconfig.json
│   └── package.json
│
├── 🎨 FRONTEND (apps/web/)
│   ├── app/                       # Next.js 14 App Router
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Landing page
│   │   ├── globals.css            # Global styles
│   │   │
│   │   ├── (auth)/                # Auth group route
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/           # Protected routes
│   │   │   ├── layout.tsx         # Dashboard layout
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── tasks/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── ai-tutor/
│   │   │   │   └── page.tsx
│   │   │   ├── flashcards/
│   │   │   │   └── page.tsx
│   │   │   ├── documents/
│   │   │   │   └── page.tsx
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   │
│   │   └── api/                   # API routes (if needed)
│   │       └── auth/
│   │           └── [...nextauth]/
│   │               └── route.ts
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── TaskList.tsx
│   │   │   └── ProgressChart.tsx
│   │   ├── ai/
│   │   │   ├── ChatInterface.tsx
│   │   │   └── MessageBubble.tsx
│   │   └── shared/
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── lib/
│   │   ├── api/                   # API client
│   │   │   ├── client.ts
│   │   │   ├── auth.api.ts
│   │   │   ├── tasks.api.ts
│   │   │   └── ai.api.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── useQuery.ts
│   │   └── utils/
│   │       └── helpers.ts
│   │
│   ├── store/                     # Zustand stores
│   │   ├── authStore.ts
│   │   ├── taskStore.ts
│   │   └── uiStore.ts
│   │
│   ├── styles/
│   │   └── tailwind.css
│   │
│   ├── public/
│   │   └── assets/
│   │
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── 📚 SHARED LIBRARIES (libs/)
│   ├── common/
│   │   ├── types/
│   │   │   ├── user.types.ts
│   │   │   ├── task.types.ts
│   │   │   └── ai.types.ts
│   │   ├── constants/
│   │   │   └── app.constants.ts
│   │   └── utils/
│   │       └── validators.ts
│   │
│   └── ui-components/             # Shared UI components
│       └── src/
│
└── 🔧 INFRASTRUCTURE
    ├── docker/
    │   ├── api.Dockerfile
    │   ├── web.Dockerfile
    │   └── nginx.conf
    ├── k8s/
    │   ├── deployments/
    │   ├── services/
    │   └── ingress/
    └── scripts/
        ├── setup.sh
        └── migrate.sh
```

---

## 🔧 Backend Architecture (NestJS)

### **Module Architecture**

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        migrations: ['dist/migrations/*.js'],
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    AuthModule,
    UsersModule,
    TasksModule,
    AiModule,
    DocumentsModule,
    AnalyticsModule,
    FlashcardsModule,
    QueueModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}
```

### **Authentication Module**

```typescript
// auth/auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

  async login(user: User) {
    const payload = { email: user.email, sub: user.id, roles: user.roles };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    
    // Store refresh token in Redis
    await this.redis.set(
      `refresh_token:${user.id}`,
      refreshToken,
      'EX',
      7 * 24 * 60 * 60,
    );
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
  }

  async logout(userId: string): Promise<void> {
    await this.redis.del(`refresh_token:${userId}`);
  }
}
```

### **AI Module with WebSocket**

```typescript
// ai/ai.gateway.ts
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
export class AiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private aiService: AiService,
    @InjectQueue('ai-processing') private aiQueue: Queue,
  ) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('chat')
  async handleChat(
    @MessageBody() data: ChatDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const user = await this.getUserFromSocket(client);
    
    // Add to processing queue
    const job = await this.aiQueue.add('process-chat', {
      userId: user.id,
      message: data.message,
      context: data.context,
      socketId: client.id,
    });

    // Send acknowledgment
    client.emit('chat-processing', { jobId: job.id });
  }

  @SubscribeMessage('rag-search')
  async handleRagSearch(
    @MessageBody() data: RagSearchDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const user = await this.getUserFromSocket(client);
    
    // Perform vector search
    const results = await this.aiService.performRagSearch(
      user.id,
      data.query,
      data.filters,
    );
    
    client.emit('rag-results', results);
  }
}
```

### **Document Processing with Bull Queue**

```typescript
// documents/processors/upload.processor.ts
@Processor('document-processing')
export class DocumentProcessor {
  constructor(
    private documentsService: DocumentsService,
    private storageService: StorageService,
    @InjectRepository(DocumentEmbedding)
    private embeddingRepo: Repository<DocumentEmbedding>,
  ) {}

  @Process('extract-content')
  async handleContentExtraction(job: Job<DocumentProcessingJob>) {
    const { documentId, fileUrl } = job.data;
    
    // Download file from storage
    const fileBuffer = await this.storageService.download(fileUrl);
    
    // Extract text content
    const content = await this.extractContent(fileBuffer, job.data.mimeType);
    
    // Chunk content
    const chunks = this.chunkContent(content, 500, 50);
    
    // Generate embeddings for each chunk
    for (const [index, chunk] of chunks.entries()) {
      const embedding = await this.generateEmbedding(chunk);
      
      await this.embeddingRepo.save({
        documentId,
        chunkText: chunk,
        chunkIndex: index,
        embedding: embedding,
        metadata: {
          length: chunk.length,
          position: index / chunks.length,
        },
      });
      
      // Update job progress
      await job.updateProgress(((index + 1) / chunks.length) * 100);
    }
    
    // Update document status
    await this.documentsService.updateStatus(documentId, 'processed');
    
    return { processed: true, chunks: chunks.length };
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Call OpenAI or other embedding service
    const response = await openai.createEmbedding({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  }
}
```

### **Database Entities with TypeORM**

```typescript
// users/entities/user.entity.ts
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  displayName: string;

  @Column('simple-array', { default: 'student' })
  roles: string[];

  @OneToMany(() => Task, task => task.user)
  tasks: Task[];

  @OneToMany(() => Document, document => document.user)
  documents: Document[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// tasks/entities/task.entity.ts
@Entity('tasks')
@Index(['userId', 'dueDate'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column()
  subject: string;

  @Column('timestamp with time zone', { nullable: true })
  dueDate: Date;

  @Column({ default: false })
  completed: boolean;

  @Column({ 
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM,
  })
  priority: Priority;

  @ManyToOne(() => User, user => user.tasks)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// documents/entities/embedding.entity.ts
@Entity('document_embeddings')
@Index(['documentId'])
export class DocumentEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Document, document => document.embeddings)
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column()
  documentId: string;

  @Column('text')
  chunkText: string;

  @Column()
  chunkIndex: number;

  @Column('vector', { length: 1536 })
  embedding: number[];

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
```

### **Redis Caching Strategy**

```typescript
// redis/redis.service.ts
@Injectable()
export class RedisService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.redis.set(key, serialized, 'EX', ttl);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async addToQueue(queueName: string, data: any): Promise<void> {
    await this.redis.lpush(queueName, JSON.stringify(data));
  }

  async getFromQueue(queueName: string): Promise<any> {
    const data = await this.redis.rpop(queueName);
    return data ? JSON.parse(data) : null;
  }

  // Session management
  async setSession(sessionId: string, userId: string, ttl = 3600): Promise<void> {
    await this.redis.set(`session:${sessionId}`, userId, 'EX', ttl);
  }

  async getSession(sessionId: string): Promise<string | null> {
    return await this.redis.get(`session:${sessionId}`);
  }

  // Rate limiting
  async incrementRateLimit(key: string, window = 60): Promise<number> {
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, window);
    }
    return current;
  }
}
```

---

## 🎨 Frontend Architecture (Next.js)

### **App Router Structure**

```typescript
// app/layout.tsx
import { Providers } from '@/components/Providers'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

// app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { authOptions } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
```

### **API Client with Interceptors**

```typescript
// lib/api/client.ts
import axios, { AxiosInstance } from 'axios'
import { getSession } from 'next-auth/react'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      timeout: 10000,
    })

    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        const session = await getSession()
        if (session?.accessToken) {
          config.headers.Authorization = `Bearer ${session.accessToken}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true
          
          try {
            await this.refreshToken()
            return this.client(originalRequest)
          } catch (refreshError) {
            window.location.href = '/login'
            return Promise.reject(refreshError)
          }
        }
        
        return Promise.reject(error)
      }
    )
  }

  async refreshToken() {
    const session = await getSession()
    if (!session?.refreshToken) throw new Error('No refresh token')
    
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      refreshToken: session.refreshToken,
    })
    
    // Update session with new tokens
    // Implementation depends on next-auth configuration
  }

  get = this.client.get
  post = this.client.post
  put = this.client.put
  patch = this.client.patch
  delete = this.client.delete
}

export const apiClient = new ApiClient()
```

### **TanStack Query Integration**

```typescript
// lib/hooks/useQuery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'

// Tasks queries
export const useTasks = (filters?: TaskFilters) => {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/tasks', { params: filters })
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useTask = (id: string) => {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tasks/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export const useCreateTask = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (task: CreateTaskDto) => {
      const { data } = await apiClient.post('/tasks', task)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// AI queries with WebSocket integration
export const useAIChat = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const socket = useWebSocket()
  
  useEffect(() => {
    if (!socket) return
    
    socket.on('chat-response', (response: Message) => {
      setMessages(prev => [...prev, response])
    })
    
    return () => {
      socket.off('chat-response')
    }
  }, [socket])
  
  const sendMessage = useCallback((message: string) => {
    if (!socket) return
    
    const userMessage: Message = {
      id: nanoid(),
      content: message,
      role: 'user',
      timestamp: new Date(),
    }
    
    setMessages(prev => [...prev, userMessage])
    socket.emit('chat', { message, context: messages.slice(-10) })
  }, [socket, messages])
  
  return { messages, sendMessage }
}
```

### **Zustand State Management**

```typescript
// store/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (auth: AuthData) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: ({ user, accessToken, refreshToken }) => 
        set({ user, accessToken, refreshToken }),
      clearAuth: () => 
        set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    }
  )
)

// store/taskStore.ts
interface TaskState {
  tasks: Task[]
  filters: TaskFilters
  selectedTask: Task | null
  setTasks: (tasks: Task[]) => void
  setFilters: (filters: TaskFilters) => void
  selectTask: (task: Task | null) => void
  updateTask: (id: string, updates: Partial<Task>) => void
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  filters: {},
  selectedTask: null,
  setTasks: (tasks) => set({ tasks }),
  setFilters: (filters) => set({ filters }),
  selectTask: (task) => set({ selectedTask: task }),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      ),
    })),
}))
```

### **Server Components with Data Fetching**

```typescript
// app/(dashboard)/dashboard/page.tsx
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { TaskList } from '@/components/dashboard/TaskList'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

async function getDashboardData(userId: string) {
  const [stats, recentTasks] = await Promise.all([
    fetch(`${process.env.API_URL}/analytics/stats/${userId}`, {
      cache: 'no-store',
    }).then(res => res.json()),
    fetch(`${process.env.API_URL}/tasks?userId=${userId}&limit=5`, {
      next: { revalidate: 60 },
    }).then(res => res.json()),
  ])
  
  return { stats, recentTasks }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const { stats, recentTasks } = await getDashboardData(session.user.id)
  
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Welcome back, {session.user.name}!</h1>
      
      <Suspense fallback={<SkeletonLoader />}>
        <DashboardStats stats={stats} />
      </Suspense>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaskList tasks={recentTasks} />
        <AIInsights userId={session.user.id} />
      </div>
    </div>
  )
}
```

---

## 🗄️ Database Schema (PostgreSQL)

### **Migration System**

```typescript
// migrations/1700000000000-InitialSchema.ts
export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);
    
    // Create users table
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        roles TEXT[] DEFAULT '{student}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await queryRunner.query(`CREATE INDEX idx_users_email ON users(email)`);
    
    // Create tasks table
    await queryRunner.query(`
      CREATE TABLE tasks (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        subject VARCHAR(100),
        due_date TIMESTAMPTZ,
        completed BOOLEAN DEFAULT FALSE,
        priority VARCHAR(20) DEFAULT 'medium',
        estimated_time INTEGER,
        actual_time INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create compound indexes
    await queryRunner.query(`
      CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_date);
      CREATE INDEX idx_tasks_user_completed ON tasks(user_id, completed);
    `);
    
    // Create documents table
    await queryRunner.query(`
      CREATE TABLE documents (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size BIGINT,
        processed_content TEXT,
        summary TEXT,
        key_concepts TEXT[],
        subject VARCHAR(100),
        upload_status VARCHAR(50) DEFAULT 'processing',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create document embeddings table
    await queryRunner.query(`
      CREATE TABLE document_embeddings (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        chunk_text TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        embedding VECTOR(1536),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create vector index for similarity search
    await queryRunner.query(`
      CREATE INDEX idx_embeddings_vector 
      ON document_embeddings 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
    
    // Create AI interactions table
    await queryRunner.query(`
      CREATE TABLE ai_interactions (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        thread_id UUID REFERENCES conversation_threads(id),
        interaction_type VARCHAR(50) NOT NULL,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        model_used VARCHAR(100),
        tokens_used INTEGER,
        confidence_score NUMERIC,
        feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create analytics tables
    await queryRunner.query(`
      CREATE TABLE study_sessions (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
        subject VARCHAR(100),
        duration_minutes INTEGER DEFAULT 0,
        focus_score NUMERIC,
        notes TEXT,
        session_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create spaced repetition cards table
    await queryRunner.query(`
      CREATE TABLE flashcards (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        deck_id UUID REFERENCES flashcard_decks(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        difficulty NUMERIC DEFAULT 2.5,
        ease_factor NUMERIC DEFAULT 2.5,
        interval_days NUMERIC DEFAULT 1,
        repetitions NUMERIC DEFAULT 0,
        last_reviewed TIMESTAMPTZ,
        next_review TIMESTAMPTZ,
        quality_responses NUMERIC[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create update triggers
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();
      
      CREATE TRIGGER update_tasks_updated_at
        BEFORE UPDATE ON tasks
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS flashcards CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS study_sessions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_interactions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_embeddings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS documents CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS tasks CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at CASCADE`);
  }
}
```

---

## 🐳 Docker Configuration

### **docker-compose.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: studyteddy
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: studyteddy_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - studyteddy

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - studyteddy

  api:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://studyteddy:${DB_PASSWORD}@postgres:5432/studyteddy_db
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
    ports:
      - "3000:3000"
    networks:
      - studyteddy

  web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://api:3000
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
    depends_on:
      - api
    ports:
      - "8080:3000"
    networks:
      - studyteddy

  nginx:
    image: nginx:alpine
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api
      - web
    networks:
      - studyteddy

volumes:
  postgres_data:
  redis_data:

networks:
  studyteddy:
    driver: bridge
```

### **API Dockerfile**

```dockerfile
# docker/api.Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY apps/api ./apps/api
COPY libs ./libs

# Build application
RUN npm run build:api

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Install PM2
RUN npm install -g pm2

# Expose port
EXPOSE 3000

# Start application with PM2
CMD ["pm2-runtime", "start", "dist/main.js", "-i", "max"]
```

---

## 🚀 Deployment Configuration

### **Environment Variables**

```bash
# .env.example
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/studyteddy
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=studyteddy
DB_PASSWORD=secure_password
DB_NAME=studyteddy_db

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=redis_password

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# API
API_PORT=3000
API_PREFIX=api/v1

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:8080
NEXTAUTH_SECRET=your_nextauth_secret

# AI Services
OPENAI_API_KEY=your_openai_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key

# Storage
S3_BUCKET=studyteddy-documents
S3_REGION=us-east-1
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

---

## 📊 Performance Optimizations

### **Caching Strategy**

```typescript
// Cache layers implementation
class CacheService {
  constructor(
    private redis: RedisService,
    private cacheConfig: CacheConfig,
  ) {}

  async remember<T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>,
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.redis.get<T>(key);
    if (cached) return cached;
    
    // Fetch and cache
    const result = await callback();
    await this.redis.set(key, result, ttl);
    
    return result;
  }

  @Cacheable({ ttl: 300 }) // 5 minutes
  async getUserStats(userId: string): Promise<UserStats> {
    return this.analyticsService.calculateUserStats(userId);
  }
}
```

### **Database Optimization**

```sql
-- Query optimization with proper indexes
CREATE INDEX CONCURRENTLY idx_tasks_user_status_due 
ON tasks(user_id, completed, due_date) 
WHERE completed = false;

-- Materialized view for analytics
CREATE MATERIALIZED VIEW user_analytics AS
SELECT 
  u.id as user_id,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT t.id) FILTER (WHERE t.completed) as completed_tasks,
  AVG(ss.duration_minutes) as avg_session_duration,
  SUM(ss.duration_minutes) as total_study_time
FROM users u
LEFT JOIN tasks t ON u.id = t.user_id
LEFT JOIN study_sessions ss ON u.id = ss.user_id
GROUP BY u.id;

CREATE UNIQUE INDEX ON user_analytics(user_id);
```

---

This refactored architecture provides:

1. **Scalable Backend**: NestJS with modular architecture, dependency injection, and microservices-ready design
2. **Modern Frontend**: Next.js 14 with App Router, SSR/SSG, and optimized data fetching
3. **Robust Caching**: Redis for sessions, caching, and real-time features
4. **Production Database**: PostgreSQL with pgvector for AI features
5. **Enterprise Features**: Queue processing, WebSocket support, comprehensive error handling
6. **DevOps Ready**: Docker containerization, environment configuration, monitoring integration

The architecture is production-ready, scalable, and follows enterprise best practices for full-stack TypeScript applications.