# Database Migration Guide

This guide explains how to set up and run database migrations for the DevSec Scanner platform.

## Current Setup

The application currently uses **in-memory storage** for development, which means data is lost when the server restarts. For production use, you should migrate to PostgreSQL.

## Migration to PostgreSQL

### 1. Set Up PostgreSQL Database

**Option A: Using Docker**
```bash
# Start PostgreSQL container
docker run --name devsec-postgres \
  -e POSTGRES_DB=devsec_scanner \
  -e POSTGRES_USER=devsec \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  -d postgres:15
```

**Option B: Install PostgreSQL locally**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql

# Create database
createdb devsec_scanner
```

### 2. Configure Database Connection

Update your `.env` file:
```env
# Add PostgreSQL connection
DATABASE_URL=postgresql://devsec:secure_password@localhost:5432/devsec_scanner

# Keep existing variables
REPLIT_DOMAINS=localhost:5000
SESSION_SECRET=your-secret-key
NODE_ENV=development
```

### 3. Run Migrations

```bash
# Install additional dependencies
npm install postgres drizzle-orm

# Run the migration script
npm run db:migrate
```

### 4. Switch to Database Storage

Update `server/storage.ts` to use database storage:

```typescript
// Replace the export at the bottom
import { DatabaseStorage } from './database-storage';

export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();
```

### 5. Update Authentication Session Storage

Update `server/replitAuth.ts`:

```typescript
import connectPg from "connect-pg-simple";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  
  // Use PostgreSQL for session storage when DATABASE_URL is available
  if (process.env.DATABASE_URL) {
    const pgStore = connectPg(session);
    const sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: sessionTtl,
      tableName: "sessions",
    });
    
    return session({
      secret: process.env.SESSION_SECRET!,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: sessionTtl,
      },
    });
  }
  
  // Fallback to memory store for development
  const memoryStore = MemoryStore(session);
  // ... rest of memory store config
}
```

## Database Schema Overview

The migration creates these tables:

- **sessions** - User session storage (required for authentication)
- **users** - User profiles with roles (admin/user)
- **tools** - Security tools (SAST/DAST) with installation status
- **projects** - User projects for organizing scans
- **scans** - Security scan records with results

## Available Commands

```bash
# Generate new migration (after schema changes)
npx drizzle-kit generate

# Run migrations
npm run db:migrate

# Push schema changes directly (development only)
npm run db:push

# Open database studio
npm run db:studio
```

## Troubleshooting

### Connection Issues
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check connection string in `.env`
- Ensure database exists: `createdb devsec_scanner`

### Migration Errors
- Check database permissions
- Verify migration files in `drizzle/migrations/`
- Run migrations manually: `tsx server/migrate.ts`

### Schema Changes
After modifying `shared/schema.ts`:
1. Generate migration: `npx drizzle-kit generate`
2. Review generated SQL in `drizzle/migrations/`
3. Run migration: `npm run db:migrate`

## Production Deployment

For production:

1. **Use managed PostgreSQL** (AWS RDS, Google Cloud SQL, etc.)
2. **Set production DATABASE_URL**
3. **Run migrations** before starting the application
4. **Enable SSL** in production database connections
5. **Set up database backups**

Example production DATABASE_URL:
```
DATABASE_URL=postgresql://username:password@production-host:5432/devsec_scanner?sslmode=require
```

## Data Migration

To migrate existing data from in-memory storage:

1. Export data while using memory storage
2. Switch to database storage  
3. Import data using database insert operations
4. Verify data integrity

The application will automatically populate default security tools when using database storage.