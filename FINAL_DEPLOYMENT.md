# FuzzBranch Scanner - Final Deployment Guide

## Architecture Overview

✅ **Web Application**: FastAPI + Vue (Docker container)  
✅ **Database**: PostgreSQL (Docker container)  
✅ **Security Tools**: Installed on host machine  
✅ **Projects & Data**: Stored on host at `/home/$USER/fuzzbench-data/`  
✅ **Tool Manager**: Python script for host tool management

## Quick Deployment Commands

### 1. Host Machine Preparation
```bash
# Install system dependencies
sudo apt update && sudo apt install -y python3 python3-pip ruby ruby-dev build-essential

# Create directories
mkdir -p ~/devsec-tools/{sast,dast,wrappers}
mkdir -p ~/fuzzbench-data/projects

# Make host-tool-manager executable
chmod +x host-tool-manager.py
```

### 2. Docker Deployment
```bash
# Set environment variables
export SESSION_SECRET="your-secure-session-secret"
export DATABASE_URL="postgresql://fuzzuser:securepassword123@postgres:5432/fuzzbranchdb"

# Start containers
docker-compose up -d

# Initialize database
docker-compose exec app npm run db:push
```

### 3. Access Application
- Open: http://localhost:5000
- Admin: admin@example.com / admin123
- User: user@example.com / user123

## Tool Installation Process

### WebSocket Terminal Interface
When admin clicks "Install" on a tool:
1. Modal opens with installation command
2. Command executes on host via `host-tool-manager.py`
3. Real-time output shown in WebSocket terminal
4. Tool installed in `/home/$USER/devsec-tools/`

### Tool Execution Process
When admin clicks "Run" on installed tool:
1. Modal opens with run command and project selection
2. Command executes on host targeting project in `/home/$USER/fuzzbench-data/projects/`
3. Real-time output shown in WebSocket terminal
4. Results saved to project directory

## File Structure

```
Host Machine:
~/devsec-tools/
├── sast/
│   ├── semgrep/
│   ├── sonarqube/
│   └── rubocop/
├── dast/
│   ├── nikto/
│   ├── owaspzap/
│   └── nuclei/
└── wrappers/
    ├── futag/
    ├── transform.py
    └── pyfuzz_gen/

~/fuzzbench-data/
├── projects/
│   ├── project1/
│   │   ├── source/
│   │   ├── wrappers/
│   │   └── results/
│   └── project2/
└── logs/

Docker Containers:
app container:
├── /app/ (web application)
├── host-tool-manager.py
└── volumes mounted to host

postgres container:
└── /var/lib/postgresql/data/
```

## Supported Tools & Commands

### SAST Tools
- **Semgrep**: `pip3 install semgrep`
- **SonarQube**: `docker pull sonarqube`
- **RuboCop**: `gem install rubocop`
- **RubyCritic**: `gem install rubycritic`

### DAST Tools
- **Nikto**: `apt install nikto`
- **OWASP ZAP**: `docker pull owasp/zap2docker-stable`
- **Nuclei**: `go install github.com/projectdiscovery/nuclei/v2/cmd/nuclei@latest`

### Wrapper Generation Tools
- **futag (C/C++)**: `git clone https://github.com/ispras/futag && cd futag && make`
- **transform.py (Ruby)**: `git clone https://github.com/dewrapper/dewrapper`
- **PyFuzzWrap (Python)**: `pip3 install pyfuzzwrap`

## WebSocket Terminal Features

✅ Real-time command output  
✅ Color-coded messages (stdout/stderr/success/error)  
✅ Installation progress tracking  
✅ Tool execution monitoring  
✅ Clear/Copy terminal functionality  

## Security & Permissions

- Container runs with `privileged: true` for host access
- Tools execute in host environment with full system access
- Admin-only tool installation and execution
- Session-based authentication with secure cookies
- Project isolation by user permissions

## Troubleshooting

### Tool Installation Fails
```bash
# Check host dependencies
python3 --version
pip3 --version
ruby --version

# Check directory permissions
ls -la ~/devsec-tools/
ls -la ~/fuzzbench-data/

# Check host-tool-manager
python3 host-tool-manager.py list
```

### Database Connection Issues
```bash
# Check containers
docker-compose ps

# Check database
docker-compose exec postgres psql -U fuzzuser -d fuzzbranchdb -c "SELECT version();"

# Restart if needed
docker-compose restart
```

### WebSocket Terminal Not Working
```bash
# Check application logs
docker-compose logs app

# Check browser console for WebSocket errors
# Verify WebSocket endpoint: ws://localhost:5000/ws
```

## Production Deployment

### Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### SSL Configuration
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
0 12 * * * /usr/bin/certbot renew --quiet
```

## Complete Setup Script

```bash
#!/bin/bash
set -e

echo "🚀 Setting up FuzzBranch Scanner..."

# System dependencies
sudo apt update
sudo apt install -y python3 python3-pip ruby ruby-dev build-essential docker.io docker-compose

# Create directories
mkdir -p ~/devsec-tools/{sast,dast,wrappers}
mkdir -p ~/fuzzbench-data/projects

# Setup environment
cat > .env << EOF
SESSION_SECRET="$(openssl rand -hex 32)"
DATABASE_URL="postgresql://fuzzuser:securepassword123@postgres:5432/fuzzbranchdb"
EOF

# Start application
docker-compose up -d

# Wait for database
sleep 10

# Initialize database
docker-compose exec app npm run db:push

echo "✅ FuzzBranch Scanner deployed successfully!"
echo "🌐 Access: http://localhost:5000"
echo "👤 Admin: admin@example.com / admin123"
```

This architecture provides secure, isolated tool execution while maintaining a clean containerized web application.