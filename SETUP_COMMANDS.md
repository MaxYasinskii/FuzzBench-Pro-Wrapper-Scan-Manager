# FuzzBranch Scanner - Quick Setup Commands

## Download and Setup

### 1. Download Project Archive
```bash
# Extract downloaded archive
unzip fuzzbrach-scanner.zip
cd fuzzbrach-scanner
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your database settings
nano .env
```

Required `.env` content:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/fuzzbranchdb"
SESSION_SECRET="your-256-bit-random-session-secret"
NODE_ENV="production"
```

### 4. Database Setup
```bash
# Create PostgreSQL database
createdb fuzzbranchdb

# Initialize database schema
npm run db:push
```

### 5. Start Application
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## Git Repository Setup

### 1. Initialize Git Repository
```bash
git init
git add .
git commit -m "Initial commit: FuzzBranch Scanner"
```

### 2. Add Remote Repository
```bash
git remote add origin https://github.com/yourusername/fuzzbrach-scanner.git
git branch -M main
git push -u origin main
```

## Default Login Credentials

- **Admin**: admin@example.com / admin123
- **User**: user@example.com / user123

**Change these passwords immediately in production!**

## Verification Commands

### Check Application Health
```bash
curl http://localhost:5000/api/stats
```

### Check Database Connection
```bash
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

Expected tables: sessions, users, tools, projects, scans, wrappers

### Test API Endpoints
```bash
# Login test
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Tools list
curl http://localhost:5000/api/tools
```

## Production Deployment Checklist

- [ ] PostgreSQL database created and accessible
- [ ] Environment variables configured
- [ ] Database schema pushed successfully
- [ ] Default passwords changed
- [ ] HTTPS configured
- [ ] Firewall rules set
- [ ] System dependencies installed (Python, Ruby, Docker)
- [ ] Process manager configured (PM2/systemd)
- [ ] Backup strategy implemented
- [ ] Monitoring setup

## Troubleshooting

### Database Issues
```bash
# Check PostgreSQL status
systemctl status postgresql

# Test database connection
psql $DATABASE_URL -c "SELECT version();"
```

### Application Issues
```bash
# Check Node.js version
node --version  # Should be 18+

# Check logs
npm run dev  # Development logs
journalctl -u your-app-service  # Production logs
```

### Tool Installation Issues
```bash
# Check Python
python3 --version
pip --version

# Check Ruby
ruby --version
gem --version

# Check Docker
docker --version
```

## Quick Commands Summary

```bash
# Complete setup
git clone <repository-url>
cd fuzzbrach-scanner
npm install
cp .env.example .env
# Edit .env with your settings
npm run db:push
npm run dev

# Production deployment
npm run build
npm start
```

Access application at: http://localhost:5000