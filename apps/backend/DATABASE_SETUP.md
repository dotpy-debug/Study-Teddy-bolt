# Study Teddy Database Setup

This guide will help you set up PostgreSQL database for the Study Teddy application.

## Prerequisites

1. **PostgreSQL 15+** installed on your system
2. **Node.js 18+** and npm installed
3. Database user with necessary privileges

## Installation Methods

### Option 1: Local PostgreSQL Installation

#### Windows (Recommended)
1. Download PostgreSQL from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` user
4. Default port is `5432`

#### macOS
```bash
# Using Homebrew
brew install postgresql@15
brew services start postgresql@15
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Option 2: Docker (Alternative)
```bash
# Run PostgreSQL in Docker
docker run --name studyteddy-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=studyteddy \
  -p 5432:5432 \
  -d postgres:15
```

## Database Setup Steps

### 1. Access PostgreSQL
```bash
# Connect as postgres user
psql -U postgres -h localhost

# Or on Linux, you might need:
sudo -u postgres psql
```

### 2. Create Database
```sql
-- Option A: Simple setup (use existing postgres user)
CREATE DATABASE studyteddy;

-- Option B: Create dedicated user (recommended for production)
CREATE USER studyteddy_user WITH ENCRYPTED PASSWORD 'your_secure_password';
CREATE DATABASE studyteddy OWNER studyteddy_user;
GRANT ALL PRIVILEGES ON DATABASE studyteddy TO studyteddy_user;
```

### 3. Enable UUID Extension
```sql
-- Connect to studyteddy database
\c studyteddy;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 4. Configure Environment Variables

Copy `.env.example` to `.env` and update the database connection:

```bash
cp .env.example .env
```

Update these values in `.env`:
```env
# For simple setup with postgres user
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/studyteddy

# For dedicated user setup
DATABASE_URL=postgresql://studyteddy_user:your_secure_password@localhost:5432/studyteddy
```

### 5. Install Dependencies and Run Migrations

```bash
# Install dependencies (if not already done)
npm install

# Generate migration files (already done)
npm run db:generate

# Push schema to database
npm run db:push

# Alternative: Run migrations
# npm run db:migrate
```

## Verification

### Test Database Connection
```bash
# Test connection
npm run start:dev

# Check if server starts without database errors
# You should see: "Database connection successful"
```

### Verify Tables
```sql
-- Connect to database
psql -U postgres -d studyteddy

-- List tables
\dt

-- You should see:
-- ai_chats
-- study_sessions
-- study_tasks
-- users
-- drizzle_migrations (if using migrations)
```

### View Table Structure
```sql
-- Describe users table
\d users;

-- Describe study_tasks table
\d study_tasks;
```

## Database Commands Reference

```bash
# Drizzle Kit Commands
npm run db:generate    # Generate migration files
npm run db:push        # Push schema directly to database
npm run db:migrate     # Run pending migrations
npm run db:studio      # Open Drizzle Studio (GUI)

# PostgreSQL Commands
psql -U postgres -d studyteddy  # Connect to database
\l                              # List databases
\dt                             # List tables
\d table_name                   # Describe table
\q                              # Quit psql
```

## Troubleshooting

### Common Issues

1. **Connection refused**
   - Ensure PostgreSQL is running
   - Check port (default: 5432)
   - Verify host (localhost vs 127.0.0.1)

2. **Authentication failed**
   - Check username and password
   - Verify DATABASE_URL format
   - Check pg_hba.conf for auth methods

3. **Database doesn't exist**
   - Create database manually: `CREATE DATABASE studyteddy;`
   - Check database name spelling

4. **Permission denied**
   - Grant proper privileges to user
   - Ensure user owns the database

### Reset Database
```sql
-- If you need to start fresh
DROP DATABASE IF EXISTS studyteddy;
CREATE DATABASE studyteddy;
```

Then run migrations again:
```bash
npm run db:push
```

## Production Considerations

1. **Security**
   - Use strong passwords
   - Limit database user privileges
   - Use SSL connections
   - Regular backups

2. **Performance**
   - Tune connection pool settings
   - Monitor query performance
   - Consider read replicas for scaling

3. **Monitoring**
   - Set up database monitoring
   - Configure alerts for connection issues
   - Monitor disk space and performance

## Cloud Database Options

### Supabase (Recommended)
1. Sign up at [supabase.com](https://supabase.com)
2. Create new project
3. Copy connection string
4. Update DATABASE_URL in .env

### Railway
1. Sign up at [railway.app](https://railway.app)
2. Create PostgreSQL service
3. Copy connection string
4. Update DATABASE_URL in .env

### Render
1. Sign up at [render.com](https://render.com)
2. Create PostgreSQL service
3. Copy connection string
4. Update DATABASE_URL in .env