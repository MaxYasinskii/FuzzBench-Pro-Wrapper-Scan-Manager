# Host Machine Deployment Guide

## Recommended: Direct Host Installation

### System Requirements
- Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- Node.js 18+
- PostgreSQL 12+
- Python 3.8+
- Ruby 2.7+

### Quick Installation Script

```bash
#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Python and development tools
sudo apt install -y python3 python3-pip python3-dev build-essential

# Install Ruby
sudo apt install -y ruby ruby-dev

# Install additional security tools
sudo apt install -y git curl wget nikto

# Setup PostgreSQL
sudo -u postgres createdb fuzzbranchdb
sudo -u postgres psql -c "CREATE USER fuzzuser WITH PASSWORD 'securepassword123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fuzzbranchdb TO fuzzuser;"

echo "System setup complete. Now deploy the application:"
echo "1. git clone <your-repo>"
echo "2. cd fuzzbrach-scanner" 
echo "3. npm install"
echo "4. cp .env.example .env"
echo "5. Edit .env with your database settings"
echo "6. npm run db:push"
echo "7. npm run dev"
```

### Manual Installation Steps

1. **Install Node.js**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

2. **Setup PostgreSQL**:
```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres createdb fuzzbranchdb
sudo -u postgres psql -c "CREATE USER fuzzuser WITH PASSWORD 'securepassword123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fuzzbranchdb TO fuzzuser;"
```

3. **Install Python tools**:
```bash
sudo apt install -y python3 python3-pip python3-dev
```

4. **Install Ruby**:
```bash
sudo apt install -y ruby ruby-dev
```

5. **Deploy application**:
```bash
git clone <your-repository-url>
cd fuzzbrach-scanner
npm install
cp .env.example .env
```

6. **Configure environment** (.env file):
```env
DATABASE_URL="postgresql://fuzzuser:securepassword123@localhost:5432/fuzzbranchdb"
SESSION_SECRET="your-secure-256-bit-session-secret"
NODE_ENV="production"
```

7. **Initialize database**:
```bash
npm run db:push
```

8. **Start application**:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Install Commands for Security Tools

The application will use these commands to install tools on the host:

```bash
# Python-based tools
pip3 install pyfuzzwrap
pip3 install semgrep

# Ruby-based tools
gem install rubycritic
gem install rubocop

# System tools (already available)
nikto --version  # Pre-installed via apt

# Docker-based tools (requires Docker)
docker pull owasp/zap2docker-stable
docker pull sonarqube
```

### Production Setup with systemd

Create service file `/etc/systemd/system/fuzzbrach-scanner.service`:

```ini
[Unit]
Description=FuzzBranch Scanner
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/fuzzbrach-scanner
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable fuzzbrach-scanner
sudo systemctl start fuzzbrach-scanner
sudo systemctl status fuzzbrach-scanner
```

### Nginx Reverse Proxy (Optional)

Install Nginx:
```bash
sudo apt install -y nginx
```

Configure `/etc/nginx/sites-available/fuzzbrach-scanner`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/fuzzbrach-scanner /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Firewall Configuration

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5432/tcp  # PostgreSQL (if external access needed)
sudo ufw enable
```

This setup ensures all security tools install directly on the host machine with full system access.