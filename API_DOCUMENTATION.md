# FuzzBranch Scanner API Documentation

## Authentication Endpoints

### POST /api/auth/login
**Description**: Login with email and password
**Body**:
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```
**Response**: User object with authentication session

### POST /api/auth/logout
**Description**: Logout current user
**Response**: Success message

### GET /api/auth/user
**Description**: Get current authenticated user
**Response**: User object or 401 if not authenticated

## User Management Endpoints

### GET /api/users
**Description**: Get all users (admin only)
**Response**: Array of user objects

### POST /api/users
**Description**: Create new user (admin only)
**Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

### PATCH /api/users/:id/role
**Description**: Update user role (admin only)
**Body**:
```json
{
  "role": "admin"
}
```

### DELETE /api/users/:id
**Description**: Delete user (admin only)

## Tool Management Endpoints

### GET /api/tools
**Description**: Get all security tools
**Response**: Array of tools with installation status

### PATCH /api/tools/:id/install
**Description**: Install/update tool (admin only)
**Body**:
```json
{
  "installCommand": "pip install pyfuzzwrap",
  "runCommand": "pyfuzzwrap --help"
}
```

### POST /api/tools/:id/run
**Description**: Run installed tool (admin only)
**Body**:
```json
{
  "projectPath": "/path/to/project",
  "options": "--verbose"
}
```

## Project Management Endpoints

### GET /api/projects
**Description**: Get user projects
**Response**: Array of project objects

### POST /api/projects
**Description**: Create new project
**Body**:
```json
{
  "name": "My Project",
  "description": "Project description",
  "projectPath": "/path/to/code"
}
```

### DELETE /api/projects/:id
**Description**: Delete project

## Scan Management Endpoints

### GET /api/scans
**Description**: Get user scans
**Response**: Array of scan objects

### POST /api/scans
**Description**: Create new security scan
**Body**:
```json
{
  "projectId": 1,
  "toolId": 10,
  "targetUrl": "https://example.com",
  "options": "--depth 2"
}
```

### GET /api/scans/:id
**Description**: Get scan details and results

## Fuzzing Wrapper Generation Endpoints

### POST /api/wrappers/generate
**Description**: Generate fuzzing wrapper code
**Body**:
```json
{
  "language": "cpp",
  "path": "/path/to/source",
  "binaryPath": "/path/to/binary",
  "options": "{\"functions\": [\"main\", \"parse\"]}"
}
```

### GET /api/wrappers
**Description**: Get user's generated wrappers

### DELETE /api/wrappers/:id
**Description**: Delete wrapper

## Statistics Endpoints

### GET /api/stats
**Description**: Get dashboard statistics
**Response**:
```json
{
  "projects": 5,
  "tools": 12,
  "scansRunning": 2,
  "vulnerabilities": 8
}
```

## WebSocket Endpoints

### WS /ws
**Description**: Terminal output for tool installation and execution
**Events**:
- `subscribed`: Client connected to terminal
- `stdout`: Command output
- `stderr`: Command errors
- `success`: Command completed successfully
- `error`: Command failed
- `end`: Command execution finished

## Supported Languages for Wrapper Generation

- **C/C++**: Uses futage generator for AFL++ integration
- **Ruby**: Uses dewrapper generator for Ruby fuzzing
- **Python**: Uses PyFuzzWrap for Python applications

## Security Tools Categories

### DAST Tools
- AFL++: Advanced fuzzing tool
- libFuzzer: LLVM-based fuzzer
- afl-ruby: Ruby-specific fuzzer
- OWASP ZAP: Web application scanner
- Nikto: Web vulnerability scanner

### SAST Tools
- SonarQube: Code quality analysis
- Semgrep: Static analysis
- RuboCop: Ruby code analyzer
- RubyCritic: Ruby code quality

### Wrapper Generation Tools
- futage: C/C++ wrapper generator
- dewrapper: Ruby wrapper generator
- PyFuzzWrap: Python wrapper generator

## Error Codes

- **400**: Bad Request - Invalid input data
- **401**: Unauthorized - Authentication required
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource not found
- **500**: Internal Server Error - Server error

## Installation Commands

Tools use environment-appropriate installation commands:
- Python tools: `pip install package_name`
- Ruby tools: `gem install package_name`
- System tools: `nix-env -iA nixpkgs.package_name`
- Docker tools: `docker pull image_name`