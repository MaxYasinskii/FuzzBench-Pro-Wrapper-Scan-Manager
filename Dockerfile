FROM node:18-alpine

WORKDIR /app

# Install system dependencies including utilities for host access
RUN apk add --no-cache \
    bash \
    curl \
    git \
    util-linux \
    python3 \
    py3-pip

# Copy package files
COPY package*.json ./

# Install dependencies
# RUN npm ci --only=production

RUN npm ci

# Copy source code
COPY . .

# Copy host tool manager script
COPY scripts/host-tool-manager.py /app/scripts/host-tool-manager.py
RUN chmod +x /app/scripts/host-tool-manager.py

# Build the application
RUN npm run build

# Create directories for local deployment
RUN mkdir -p /app/data /app/tools

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]

# ========================================
# ALTERNATIVE DOCKERFILE FOR LOCAL DEPLOYMENT
# ========================================
# Comment out the above and uncomment below for standalone local development
#
# FROM node:18-alpine
# 
# WORKDIR /app
# 
# # Install development tools
# RUN apk add --no-cache \
#     bash \
#     curl \
#     git \
#     python3 \
#     py3-pip \
#     gcc \
#     g++ \
#     make
# 
# # Copy package files
# COPY package*.json ./
# RUN npm ci
# 
# # Copy source code
# COPY . .
# 
# # Create local directories
# RUN mkdir -p /app/data /app/tools /app/projects
# 
# # Build application
# RUN npm run build
# 
# EXPOSE 5000
# CMD ["npm", "run", "dev"]