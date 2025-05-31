# FuzzBranch Scanner - Deployment Guide

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Git
- Python 3.11+ (for security tools)

## Quick Setup Commands

### 1. Clone and Install
```bash
git clone <your-repository-url>
cd fuzzbrach-scanner
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```

Edit `.env` file:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/fuzzbranchdb"
SESSION_SECRET="your-256-bit-random-string"
NODE_ENV="production"
```

### 3. Database Setup
```bash
# Create database
createdb fuzzbranchdb

# Push schema
npm run db:push
```

### 4. Start Application
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Database Migration Verification

The application uses these tables - verify they exist:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Expected tables:
-- sessions, users, tools, projects, scans, wrappers
```

## Default Authentication

Login credentials for testing:
- **Admin**: admin@example.com / admin123
- **User**: user@example.com / user123

**Important**: Change these passwords in production!

## API Endpoints Summary

### Core Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  
- `GET /api/auth/user` - Current user info

### Admin User Management
- `GET /api/users` - List all users (admin only)
- `POST /api/users` - Create user (admin only)
- `PATCH /api/users/:id/role` - Update role (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

### Security Tools
- `GET /api/tools` - List available tools
- `PATCH /api/tools/:id/install` - Install tool (admin only)
- `POST /api/tools/:id/run` - Run tool (admin only)

### Project Management
- `GET /api/projects` - User projects
- `POST /api/projects` - Create project
- `DELETE /api/projects/:id` - Delete project

### Security Scanning
- `GET /api/scans` - User scans
- `POST /api/scans` - Create scan
- `GET /api/scans/:id` - Scan results

### Fuzzing Wrapper Generation
- `POST /api/wrappers/generate` - Generate wrapper
- `GET /api/wrappers` - User wrappers
- `DELETE /api/wrappers/:id` - Delete wrapper

### Statistics
- `GET /api/stats` - Dashboard stats

### WebSocket
- `WS /ws` - Real-time terminal output

## Production Deployment Checklist

### Security
- [ ] Change default passwords
- [ ] Set strong SESSION_SECRET
- [ ] Configure HTTPS
- [ ] Set up firewall rules
- [ ] Regular security updates

### Database
- [ ] PostgreSQL configured and running
- [ ] Database backups configured
- [ ] Connection limits set appropriately

### Application
- [ ] Environment variables set
- [ ] Process manager (PM2/systemd) configured
- [ ] Log rotation configured
- [ ] Monitoring setup

### System Dependencies
- [ ] Python 3.11+ installed
- [ ] Ruby installed (for Ruby tools)
- [ ] Docker installed (for containerized tools)
- [ ] Build tools installed (gcc, make)

## Troubleshooting

### Common Issues

1. **Database connection fails**:
   - Verify DATABASE_URL format
   - Check PostgreSQL is running
   - Verify credentials and permissions

2. **Tool installation fails**:
   - Check Python/pip is available
   - Verify system dependencies
   - Check network connectivity

3. **Session issues**:
   - Verify SESSION_SECRET is set
   - Check session table exists
   - Clear browser cookies

4. **Permission errors**:
   - Verify user roles in database
   - Check authentication middleware
   - Verify session is valid

### Log Locations

- Application logs: console output
- Database logs: PostgreSQL logs
- Tool installation: WebSocket terminal output

## Performance Optimization

### Database
- Create indexes on frequently queried columns
- Regular VACUUM and ANALYZE
- Connection pooling

### Application
- Enable gzip compression
- Static file caching
- CDN for assets

### Security Tools
- Limit concurrent tool executions
- Implement timeout mechanisms
- Resource usage monitoring

## Backup Strategy

### Database Backup
```bash
pg_dump fuzzbranchdb > backup_$(date +%Y%m%d).sql
```

### Application Backup
- Source code (Git repository)
- Configuration files
- Generated wrappers
- Log files

## Monitoring

### Health Checks
- `/api/auth/user` - Application health
- Database connectivity
- Disk space usage
- Memory usage

### Metrics to Monitor
- Response times
- Error rates
- Database performance
- Tool execution success rates
- User activity

## Support

For deployment issues:
1. Check logs for error messages
2. Verify all prerequisites are met
3. Test database connectivity
4. Verify environment variables
5. Check system dependencies