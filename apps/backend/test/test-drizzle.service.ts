import { Injectable } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../src/db/schema';

@Injectable()
export class TestDrizzleService {
  private _db: ReturnType<typeof drizzle>;
  private sqlite: Database.Database;

  constructor() {
    this.initializeTestDatabase();
  }

  private initializeTestDatabase() {
    // Create in-memory SQLite database for tests
    this.sqlite = new Database(':memory:');

    // Enable foreign keys
    this.sqlite.pragma('foreign_keys = ON');

    // Create drizzle database instance
    this._db = drizzle(this.sqlite, { schema });

    // Create test tables (simplified schema for testing)
    this.createTestTables();
  }

  private createTestTables() {
    // Create test tables with simplified schema
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        name TEXT NOT NULL,
        avatar_url TEXT,
        role TEXT DEFAULT 'student' NOT NULL,
        auth_provider TEXT DEFAULT 'local' NOT NULL,
        google_id TEXT UNIQUE,
        refresh_token TEXT,
        refresh_token_expires_at DATETIME,
        reset_password_token TEXT,
        reset_password_expires DATETIME,
        email_verified BOOLEAN DEFAULT 0 NOT NULL,
        email_verification_token TEXT,
        last_login_at DATETIME,
        is_active BOOLEAN DEFAULT 1 NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT,
        timezone TEXT DEFAULT 'UTC',
        language TEXT DEFAULT 'en',
        theme TEXT DEFAULT 'light',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#3B82F6',
        icon TEXT,
        is_archived BOOLEAN DEFAULT 0 NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS study_sessions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
        task_id TEXT,
        duration_minutes INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        notes TEXT,
        mood TEXT DEFAULT 'neutral',
        productivity_rating INTEGER CHECK(productivity_rating >= 1 AND productivity_rating <= 5),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS study_tasks (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        due_date DATETIME,
        completed_at DATETIME,
        estimated_duration_minutes INTEGER,
        actual_duration_minutes INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ai_chats (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_type TEXT DEFAULT 'chat',
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        model TEXT NOT NULL,
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        cost_in_cents DECIMAL(10,4) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS flashcard_decks (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT 0 NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS flashcards (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        deck_id TEXT NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        hint TEXT,
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_date DATETIME,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'submitted')),
        grade DECIMAL(5,2),
        max_grade DECIMAL(5,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info' CHECK(type IN ('info', 'success', 'warning', 'error')),
        is_read BOOLEAN DEFAULT 0 NOT NULL,
        action_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
      CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_study_sessions_subject_id ON study_sessions(subject_id);
      CREATE INDEX IF NOT EXISTS idx_study_tasks_user_id ON study_tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_study_tasks_subject_id ON study_tasks(subject_id);
      CREATE INDEX IF NOT EXISTS idx_ai_chats_user_id ON ai_chats(user_id);
      CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user_id ON flashcard_decks(user_id);
      CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards(deck_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    `);
  }

  get db() {
    return this._db;
  }

  async clearAllTables(): Promise<void> {
    // Clear all tables in proper order (respect foreign keys)
    const tables = [
      'flashcards',
      'flashcard_decks',
      'assignments',
      'notifications',
      'ai_chats',
      'study_tasks',
      'study_sessions',
      'subjects',
      'profiles',
      'users',
    ];

    for (const table of tables) {
      this.sqlite.exec(`DELETE FROM ${table}`);
    }
  }

  async closeConnection(): Promise<void> {
    if (this.sqlite) {
      this.sqlite.close();
    }
  }

  // Test utility methods
  async executeRaw(sql: string): Promise<any> {
    return this.sqlite.exec(sql);
  }

  async getTableCount(tableName: string): Promise<number> {
    const result = this.sqlite.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as {
      count: number;
    };
    return result.count;
  }

  async checkConnection(): Promise<boolean> {
    try {
      this.sqlite.prepare('SELECT 1').get();
      return true;
    } catch (error) {
      return false;
    }
  }
}
