import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { spawn } from "child_process";
import { storage } from "./storage";
import { insertToolSchema, insertProjectSchema, insertScanSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import bcrypt from "bcryptjs";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

// WebSocket соединения для терминалов
const terminalConnections = new Map<number, WebSocket[]>();

// Функция для установки инструмента в фоне
// Функция для запуска инструмента в фоне
async function runToolInBackground(toolId: number, command: string, projectPath: string, userId: string) {
  console.log(`Starting tool ${toolId} with command: ${command}`);

  try {
    const tool = await storage.getToolById(toolId);
    if (!tool) {
      console.error(`Tool ${toolId} not found`);
      return;
    }

    // Уведомляем подключенных клиентов о запуске
    broadcastToTerminal(toolId, {
      type: 'start',
      message: `Starting ${tool.name}...\n`
    });

    // Выполняем команду запуска на хост-машине через host-tool-manager.py
    const child = spawn('sh', ['-c', command], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`Tool ${toolId} stdout:`, output);
      broadcastToTerminal(toolId, {
        type: 'stdout',
        message: output
      });
    });

    child.stderr?.on('data', (data) => {
      const output = data.toString();
      console.log(`Tool ${toolId} stderr:`, output);
      broadcastToTerminal(toolId, {
        type: 'stderr',
        message: output
      });
    });

    child.on('close', async (code) => {
      console.log(`Tool ${toolId} execution finished with code: ${code}`);

      if (code === 0) {
        broadcastToTerminal(toolId, {
          type: 'success',
          message: `\n✅ ${tool.name} completed successfully!\n`
        });
      } else {
        broadcastToTerminal(toolId, {
          type: 'error',
          message: `\n❌ Execution failed with exit code: ${code}\n`
        });
      }

      broadcastToTerminal(toolId, {
        type: 'end',
        message: 'Tool execution completed.\n'
      });
    });

  } catch (error) {
    console.error(`Error running tool ${toolId}:`, error);
    broadcastToTerminal(toolId, {
      type: 'error',
      message: `Error: ${error}\n`
    });
  }
}

async function installToolInBackground(toolId: number, installCommand: string, userId: string) {
  console.log(`Starting installation of tool ${toolId} with command: ${installCommand}`);

  try {
    const tool = await storage.getToolById(toolId);
    if (!tool) {
      console.error(`Tool ${toolId} not found`);
      return;
    }

    // Уведомляем подключенных клиентов о начале установки
    broadcastToTerminal(toolId, {
      type: 'start',
      message: `Starting installation of ${tool.name}...\n`
    });

    const child = spawn('sh', ['-c', installCommand], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`Tool ${toolId} stdout:`, output);
      broadcastToTerminal(toolId, {
        type: 'stdout',
        message: output
      });
    });

    child.stderr?.on('data', (data) => {
      const output = data.toString();
      console.log(`Tool ${toolId} stderr:`, output);
      broadcastToTerminal(toolId, {
        type: 'stderr',
        message: output
      });
    });

    child.on('close', async (code) => {
      console.log(`Tool ${toolId} installation finished with code: ${code}`);

      if (code === 0) {
        // Установка успешна
        await storage.updateToolInstallStatus(toolId, true);
        broadcastToTerminal(toolId, {
          type: 'success',
          message: `\n✅ ${tool.name} installed successfully!\n`
        });
      } else {
        // Установка провалилась
        broadcastToTerminal(toolId, {
          type: 'error',
          message: `\n❌ Installation failed with exit code: ${code}\n`
        });
      }

      broadcastToTerminal(toolId, {
        type: 'end',
        message: 'Installation process completed.\n'
      });
    });

  } catch (error) {
    console.error(`Error installing tool ${toolId}:`, error);
    broadcastToTerminal(toolId, {
      type: 'error',
      message: `\n❌ Installation error: ${error}\n`
    });
  }
}

// Функция для отправки сообщений в терминал
function broadcastToTerminal(toolId: number, data: any) {
  const connections = terminalConnections.get(toolId) || [];
  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  });
}

// Analysis functions based on your scripts
async function runAnalysis(language: string, projectPath: string) {
  switch (language.toLowerCase()) {
    case "cpp":
    case "c":
      return await analyzeCpp(projectPath);
    case "ruby":
      return await analyzeRuby(projectPath);
    default:
      throw new Error(`Analysis not supported for ${language}`);
  }
}

async function runWrapperGeneration(language: string, projectPath: string, binaryPath?: string) {
  switch (language.toLowerCase()) {
    case "cpp":
    case "c":
      return await generateCppWrappers(projectPath);
    case "ruby":
      return await generateRubyWrappers(binaryPath || projectPath);
    default:
      throw new Error(`Wrapper generation not supported for ${language}`);
  }
}

async function analyzeCpp(projectPath: string) {
  try {
    console.log(`Analyzing C++ project at ${projectPath}`);

    // Simulate futag analysis - replace with actual futag integration
    const command = `echo "Analyzing C++ project with futag-like tools at ${projectPath}"`;
    const { stdout, stderr } = await execAsync(command);

    return {
      success: true,
      message: "C++ analysis completed using futag-like analysis",
      output: stdout,
      errors: stderr,
      timestamp: new Date().toISOString(),
      projectPath
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

async function analyzeRuby(projectPath: string) {
  try {
    console.log(`Analyzing Ruby project at ${projectPath}`);

    // Run rubocop and rubycritic as in your script
    const rubocopCommand = `rubocop ${projectPath} 2>/dev/null || echo "Rubocop analysis completed"`;
    const rubycriticCommand = `rubycritic ${projectPath} 2>/dev/null || echo "Rubycritic analysis completed"`;

    const { stdout: rubocopOut } = await execAsync(rubocopCommand);
    const { stdout: rubycriticOut } = await execAsync(rubycriticCommand);

    return {
      success: true,
      message: "Ruby analysis completed",
      rubocop: rubocopOut,
      rubycritic: rubycriticOut,
      timestamp: new Date().toISOString(),
      projectPath
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

async function generateCppWrappers(projectPath: string) {
  try {
    console.log(`Generating C++ wrappers for ${projectPath}`);

    // Simulate futag wrapper generation
    const wrapperCode = `// Generated C++ fuzzing wrapper using futag-like generator
#include <fuzzer/FuzzedDataProvider.h>
#include <iostream>

// Target project: ${projectPath}

extern "C" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    FuzzedDataProvider fuzzed_data(data, size);

    // Add your target function calls here
    // Based on analysis of ${projectPath}

    return 0;
}

// Compile with: clang++ -g -O1 -fsanitize=fuzzer,address -o fuzzer wrapper.cpp
// Run with: ./fuzzer corpus/`;

    return {
      success: true,
      message: "C++ wrappers generated successfully",
      code: wrapperCode,
      filename: `futag_wrapper_${Date.now()}.cpp`,
      projectPath,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

async function generateRubyWrappers(binaryPath: string) {
  try {
    console.log(`Generating Ruby wrapper for ${binaryPath}`);

    const binaryDir = path.dirname(binaryPath);
    const binaryName = path.basename(binaryPath, path.extname(binaryPath));
    const outputFile = path.join(binaryDir, `dewrapper_${binaryName}.rb`);

    // Ruby wrapper code based on your transform.py logic
    const wrapperCode = `#!/usr/bin/env ruby
# Generated Ruby fuzzing wrapper using Dewrapper
# Target: ${binaryPath}

require "afl"

# Initialize AFL
AFL.init
afl_input = $stdin.gets
ARGV.replace(afl_input.split) if afl_input

begin
  # Load the target Ruby file
  load "${binaryPath}"

  # The target will run with fuzzed ARGV

rescue LoadError => e
  puts "Error loading target file: #{e.message}"
rescue => e
  # AFL will catch crashes and hangs automatically
  puts "Runtime error: #{e.message}"
end

# Run with: afl-fuzz -i input_dir -o output_dir ruby #{path.basename(outputFile)}`;

    return {
      success: true,
      message: "Ruby wrapper generated successfully using Dewrapper approach",
      code: wrapperCode,
      filename: path.basename(outputFile),
      outputPath: outputFile,
      binaryPath,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

// Simple authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

// Admin authentication middleware
function requireAdmin(req: any, res: any, next: any) {
  if (req.session && req.session.userId && req.session.userRole === 'admin') {
    return next();
  }
  return res.status(403).json({ message: "Admin access required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));

  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("Login attempt for:", email);

      const user = await storage.getUserByEmail(email);
      console.log("User found:", user ? "Yes" : "No");

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if password is hashed or plain text
      let isValidPassword = false;
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        // Hashed password
        isValidPassword = await bcrypt.compare(password, user.password);
      } else {
        // Plain text password (for backwards compatibility)
        isValidPassword = user.password === password;
        // Update to hashed password
        if (isValidPassword) {
          const hashedPassword = await bcrypt.hash(password, 12);
          await storage.updateUserPassword(user.id, hashedPassword);
        }
      }

      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      (req.session as any).userId = user.id;
      (req.session as any).userRole = user.role;
      res.json({ message: "Login successful", user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Get current user
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Switch role (demo functionality)
  app.post('/api/auth/switch-role', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.body;

      if (!role || !['admin', 'user'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Update session role (for demo purposes)
      req.session.userRole = role;

      res.json({ 
        message: `Role switched to ${role}`,
        role: role
      });
    } catch (error) {
      console.error("Error switching role:", error);
      res.status(500).json({ message: "Failed to switch role" });
    }
  });

  // Tools endpoints
  app.get('/api/tools', requireAuth, async (req: any, res) => {
    try {
      const tools = await storage.getTools();
      res.json(tools);
    } catch (error) {
      console.error("Error fetching tools:", error);
      res.status(500).json({ message: "Failed to fetch tools" });
    }
  });

  app.patch('/api/tools/:id/install', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const toolId = parseInt(req.params.id);
      const { installCommand, runCommand } = req.body;

      const tool = await storage.getToolById(toolId);
      if (!tool) {
        return res.status(404).json({ message: "Tool not found" });
      }

      // Начинаем установку в фоне
      installToolInBackground(toolId, installCommand, userId);

      res.json({ message: "Installation started", tool });
    } catch (error) {
      console.error("Error starting installation:", (error as Error).message);
      res.status(500).json({ message: "Failed to start installation" });
    }
  });

  // Новый эндпоинт для запуска инструментов
  app.post('/api/tools/:id/run', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const toolId = parseInt(req.params.id);
      const { command, projectPath } = req.body;

      const tool = await storage.getToolById(toolId);
      if (!tool) {
        return res.status(404).json({ message: "Tool not found" });
      }

      if (!tool.installed) {
        return res.status(400).json({ message: "Tool not installed" });
      }

      // Запускаем инструмент в фоне
      runToolInBackground(toolId, command, projectPath, userId);

      res.json({ message: "Tool execution started", tool });
    } catch (error) {
      console.error("Error starting tool execution:", error);
      res.status(500).json({ message: "Failed to start tool execution" });
    }
  });

  // WebSocket эндпоинт для терминала
  app.get('/api/tools/:id/install-status', requireAuth, async (req: any, res) => {
    try {
      const toolId = parseInt(req.params.id);
      const tool = await storage.getToolById(toolId);

      if (!tool) {
        return res.status(404).json({ message: "Tool not found" });
      }

      res.json({ status: tool.installed ? 'completed' : 'pending' });
    } catch (error) {
      console.error("Error checking installation status:", error);
      res.status(500).json({ message: "Failed to check status" });
    }
  });

  app.post('/api/tools', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const toolData = insertToolSchema.parse({
        ...req.body,
        ownerId: user.id,
      });

      const tool = await storage.createTool(toolData);
      res.status(201).json(tool);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid tool data", errors: error.errors });
      }
      console.error("Error creating tool:", error);
      res.status(500).json({ message: "Failed to create tool" });
    }
  });

  app.post('/api/tools/install/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const toolId = parseInt(req.params.id);
      const tool = await storage.getToolById(toolId);

      if (!tool) {
        return res.status(404).json({ message: "Tool not found" });
      }

      // Simulate tool installation
      console.log(`Installing tool: ${tool.name} with command: ${tool.installCommand}`);

      // Update tool status to installed
      const updatedTool = await storage.updateToolInstallStatus(toolId, true);

      res.json({ 
        message: `Tool ${tool.name} installed successfully`,
        tool: updatedTool 
      });
    } catch (error) {
      console.error("Error installing tool:", error);
      res.status(500).json({ message: "Failed to install tool" });
    }
  });

  // Uninstall tool endpoint
  app.delete('/api/tools/:id/uninstall', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const toolId = parseInt(req.params.id);
      const tool = await storage.getToolById(toolId);

      if (!tool) {
        return res.status(404).json({ message: "Tool not found" });
      }

      if (!tool.installed) {
        return res.status(400).json({ message: "Tool is not installed" });
      }

      // Execute uninstall command through host-tool-manager.py
      const uninstallCommand = tool.installCommand ? `sh -c "nix-env -e ${tool.installCommand}"` : `echo "Tool ${tool.name} does not have a remove command"`;

      try {
        await execAsync(uninstallCommand);
        console.log(`Successfully uninstalled tool: ${tool.name}`);
      } catch (execError) {
        console.log(`Uninstall command executed (may show warnings): ${tool.name}`);
      }

      // Update tool status to not installed
      const updatedTool = await storage.updateToolInstallStatus(toolId, false);

      res.json({ 
        message: `Tool ${tool.name} uninstalled successfully`,
        tool: updatedTool 
      });
    } catch (error) {
      console.error("Error uninstalling tool:", error);
      res.status(500).json({ message: "Failed to uninstall tool" });
    }
  });

  // Projects endpoints
  app.get('/api/projects', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);

      let projects;
      if (user?.role === 'admin') {
        // Админы видят все проекты
        projects = await storage.getProjects();
      } else {
        // Обычные пользователи видят только свои проекты
        projects = await storage.getUserProjects(userId);
      }

      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post('/api/projects', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const projectData = insertProjectSchema.parse({
        ...req.body,
        userId,
      });

      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.delete('/api/projects/:id', requireAuth, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.session.userId;
      const user = await storage.getUser(userId);

      // Получаем проект для проверки прав
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Проверяем права: пользователь может удалять только свои проекты, админ - любые
      if (user?.role !== 'admin' && project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const deleted = await storage.deleteProject(projectId);
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Scans endpoints
  app.get('/api/scans', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);

      let scans;
      if (user?.role === 'admin') {
        scans = await storage.getScans();
      } else {
        scans = await storage.getUserScans(userId);
      }

      // Get related project and tool data
      const enrichedScans = await Promise.all(scans.map(async (scan) => {
        const project = await storage.getProjectById(scan.projectId);
        const tool = await storage.getToolById(scan.toolId);
        return {
          ...scan,
          project: project ? { id: project.id, name: project.name, description: project.description } : null,
          tool: tool ? { id: tool.id, name: tool.name, type: tool.type } : null,
        };
      }));

      res.json(enrichedScans);
    } catch (error) {
      console.error("Error fetching scans:", error);
      res.status(500).json({ message: "Failed to fetch scans" });
    }
  });

  app.post('/api/scan', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const scanData = insertScanSchema.parse(req.body);

      // Verify project ownership
      const project = await storage.getProjectById(scanData.projectId);
      const user = await storage.getUser(userId);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (user?.role !== 'admin' && project.userId !== userId) {
        return res.status(403).json({ message: "Access denied to this project" });
      }

      // Verify tool exists and is installed
      const tool = await storage.getToolById(scanData.toolId);
      if (!tool) {
        return res.status(404).json({ message: "Tool not found" });
      }

      if (!tool.installed) {
        return res.status(400).json({ message: "Tool is not installed" });
      }

      // Create scan
      const scan = await storage.createScan({
        ...scanData,
        status: "running",
        startedAt: new Date(),
      });

      // Simulate scan execution
      console.log(`Starting scan: ${tool.name} on project ${project.name}`);
      console.log(`Running command: ${tool.runCommand} ${scanData.targetUrl || ''}`);

      // Simulate async scan completion
      setTimeout(async () => {
        const mockResults = {
          vulnerabilities: Math.floor(Math.random() * 10),
          warnings: Math.floor(Math.random() * 20),
          info: Math.floor(Math.random() * 30),
          scanDuration: "4m 32s",
          timestamp: new Date().toISOString(),
        };

        await storage.updateScanStatus(scan.id, "completed", mockResults);
        console.log(`Scan ${scan.id} completed with results:`, mockResults);
      }, Math.random() * 30000 + 10000); // Complete between 10-40 seconds

      res.status(201).json(scan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid scan data", errors: error.errors });
      }
      console.error("Error creating scan:", error);
      res.status(500).json({ message: "Failed to create scan" });
    }
  });

  app.get('/api/scans/:id', requireAuth, async (req: any, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const scan = await storage.getScanById(scanId);

      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      // Check access permissions
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const project = await storage.getProjectById(scan.projectId);

      if (user?.role !== 'admin' && project?.userId !== userId) {
        return res.status(403).json({ message: "Access denied to this scan" });
      }

      res.json(scan);
    } catch (error) {
      console.error("Error fetching scan:", error);
      res.status(500).json({ message: "Failed to fetch scan" });
    }
  });

  // Dashboard stats endpoint
  app.get('/api/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);

      let projects, scans, tools;

      if (user?.role === 'admin') {
        projects = await storage.getProjects();
        scans = await storage.getScans();
        tools = await storage.getTools();
      } else {
        projects = await storage.getUserProjects(userId);
        scans = await storage.getUserScans(userId);
        tools = await storage.getTools();
      }

type ScanResult = {
  vulnerabilities?: number;
  [key: string]: any;
};

      const runningScans = scans.filter(s => s.status === 'running').length;
      const vulnerabilities = scans
      .filter(s => (s.result as ScanResult)?.vulnerabilities)
      .reduce((sum, s) => sum + ((s.result as ScanResult).vulnerabilities || 0), 0);

      res.json({
        projects: projects.length,
        tools: tools.filter(t => t.installed).length,
        scansRunning: runningScans,
        vulnerabilities,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Fuzzing wrapper generation endpoint
  app.post('/api/wrappers/generate', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { language, path, options } = req.body;

      if (!language || !path) {
        return res.status(400).json({ 
          message: "Language and path are required",
          required: ["language", "path"]
        });
      }

      const supportedLanguages = ['c', 'cpp', 'c_cpp', 'ruby', 'python'];
      if (!supportedLanguages.includes(language.toLowerCase())) {
        return res.status(400).json({ 
          message: "Unsupported language",
          supported: supportedLanguages
        });
      }

      const result = await storage.generateWrapper(language, path, options);

      // Save wrapper to database
      const wrapper = await storage.createWrapper({
        userId,
        language,
        filename: result.filename,
        code: result.code,
        path,
        options: options ? JSON.stringify(options) : null
      });

      console.log(`Generated fuzzing wrapper: ${result.filename} for ${language}`);

      res.json({
        message: "Fuzzing wrapper generated successfully",
        wrapper: {
          id: wrapper.id,
          code: result.code,
          filename: result.filename,
          language,
          path,
          options,
          createdAt: wrapper.createdAt
        }
      });
    } catch (error) {
      console.error("Error generating wrapper:", error);
      res.status(500).json({ message: "Failed to generate wrapper" });
    }
  });

  // Get wrappers endpoint
  app.get('/api/wrappers', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      let wrappers;
      if (user.role === 'admin') {
        wrappers = await storage.getWrappers(); // Admin sees all wrappers
      } else {
        wrappers = await storage.getUserWrappers(userId); // Users see only their wrappers
      }

      res.json(wrappers);
    } catch (error) {
      console.error("Error fetching wrappers:", error);
      res.status(500).json({ message: "Failed to fetch wrappers" });
    }
  });

  // Delete wrapper endpoint
  app.delete('/api/wrappers/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const wrapperId = parseInt(req.params.id);
      const success = await storage.deleteWrapper(wrapperId, userId);

      if (!success) {
        return res.status(404).json({ message: "Wrapper not found or access denied" });
      }

      res.json({ message: "Wrapper deleted successfully" });
    } catch (error) {
      console.error("Error deleting wrapper:", error);
      res.status(500).json({ message: "Failed to delete wrapper" });
    }
  });

  // Analysis and wrapper generation endpoint
  app.post('/api/analysis/run', requireAuth, async (req: any, res) => {
    try {
      const { language, projectPath, binaryPath, analyze, generate } = req.body;

      if (!language || !projectPath) {
        return res.status(400).json({ message: "Language and project path are required" });
      }

      const results = [];

      if (analyze) {
        try {
          const analysisResult = await runAnalysis(language, projectPath);
          results.push({ type: 'analysis', result: analysisResult });
        } catch (error) {
          results.push({ type: 'analysis', error: error instanceof Error ? error.message : String(error) });
        }
      }

      if (generate) {
        try {
          const generationResult = await runWrapperGeneration(language, projectPath, binaryPath);
          results.push({ type: 'generation', result: generationResult });
        } catch (error) {
          results.push({ type: 'generation', error: error instanceof Error ? error.message : String(error) });
        }
      }

      res.json({ 
        message: "Process completed",
        results: results,
        language,
        projectPath
      });
    } catch (error) {
      console.error("Error running analysis:", error);
      res.status(500).json({ message: "Analysis failed", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Tool configure endpoint
  app.patch("/api/tools/:id/configure", requireAuth, requireAdmin, async (req, res) => {
    try {
      const toolId = parseInt(req.params.id);
      const { installCommand, runCommand, description } = req.body;

      const tool = await storage.getToolById(toolId);
      if (!tool) {
        return res.status(404).json({ message: "Tool not found" });
      }

      // Update tool configuration
      const updatedTool = await storage.updateToolConfiguration(toolId, {
        installCommand,
        runCommand,
        description
      });

      if (!updatedTool) {
        return res.status(500).json({ message: "Failed to update tool configuration" });
      }

      res.json({ 
        message: "Tool configuration updated successfully",
        tool: updatedTool
      });

    } catch (error) {
      console.error("Configure tool error:", error);
      res.status(500).json({ message: "Failed to configure tool", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Admin user management endpoints
  app.get('/api/admin/users', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/admin/users', requireAuth, async (req: any, res) => {
    try {
      const currentUserId = req.session.userId;
      const user = await storage.getUser(currentUserId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { email, password, firstName, lastName, role } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          message: "Email and password are required" 
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Generate unique ID
      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newUser = await storage.createUser({
        id: newUserId,
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        profileImageUrl: null,
        role: role || 'user',
      });

      // Remove password from response
      const { password: _, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put('/api/admin/users/:id/role', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role || !['admin', 'user'].includes(role)) {
        return res.status(400).json({ 
          message: "Invalid role. Must be 'admin' or 'user'" 
        });
      }

      const updatedUser = await storage.updateUserRole(id, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const currentUserId = req.session.userId;
      const { id } = req.params;

      // Prevent admin from deleting themselves
      if (currentUserId === id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Run tool endpoint
  app.post('/api/tools/:id/run', requireAuth, async (req: any, res) => {
    try {
      const toolId = parseInt(req.params.id);
      const { projectPath } = req.body;

      if (!projectPath) {
        return res.status(400).json({ message: "Project path is required" });
      }

      const tool = await storage.getToolById(toolId);
      if (!tool) {
        return res.status(404).json({ message: "Tool not found" });
      }

      if (!tool.installed) {
        return res.status(400).json({ message: "Tool is not installed" });
      }

      // Run the tool based on its type
      let analysisResult;
      if (tool.type === 'SAST') {
        if (tool.name === 'RuboCop') {
          analysisResult = await runRuboCopAnalysis(projectPath);
        } else if (tool.name === 'RubyCritic') {
          analysisResult = await runRubyCriticAnalysis(projectPath);
        } else {
          analysisResult = await runGenericSASTTool(tool, projectPath);
        }
      } else {
        analysisResult = await runGenericTool(tool, projectPath);
      }

      res.json({
        message: `${tool.name} analysis completed`,
        tool: tool.name,
        projectPath,
        result: analysisResult
      });
    } catch (error) {
      console.error(`Error running tool:`, error);
      res.status(500).json({ message: "Failed to run tool analysis" });
    }
  });

  const httpServer = createServer(app);

  // Настройка WebSocket сервера для терминала
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws/terminal' 
  });

  wss.on('connection', (ws, req) => {
    console.log('Terminal WebSocket connection established');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'subscribe' && data.toolId) {
          // Подписываемся на терминал конкретного инструмента
          const toolId = parseInt(data.toolId);
          if (!terminalConnections.has(toolId)) {
            terminalConnections.set(toolId, []);
          }
          terminalConnections.get(toolId)?.push(ws);

          console.log(`Client subscribed to terminal for tool ${toolId}`);

          ws.send(JSON.stringify({
            type: 'subscribed',
            toolId: toolId,
            message: `Connected to terminal for tool ${toolId}\n`
          }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Terminal WebSocket connection closed');
      // Удаляем соединение из всех подписок
      terminalConnections.forEach((connections, toolId) => {
        const index = connections.indexOf(ws);
        if (index > -1) {
          connections.splice(index, 1);
        }
      });
    });

    ws.on('error', (error) => {
      console.error('Terminal WebSocket error:', error);
    });
  });

  return httpServer;
}

// Helper functions for running analysis tools
async function runRuboCopAnalysis(projectPath: string) {
  try {
    console.log(`Running RuboCop analysis on ${projectPath}`);
    const command = `rubocop ${projectPath} --format json || echo "RuboCop analysis completed"`;
    const { stdout } = await execAsync(command);

    return {
      success: true,
      message: "RuboCop analysis completed",
      output: stdout,
      timestamp: new Date().toISOString(),
      projectPath
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

async function runRubyCriticAnalysis(projectPath: string) {
  try {
    console.log(`Running RubyCritic analysis on ${projectPath}`);
    const command = `rubycritic ${projectPath} --format json || echo "RubyCritic analysis completed"`;
    const { stdout } = await execAsync(command);

    return {
      success: true,
      message: "RubyCritic analysis completed",
      output: stdout,
      timestamp: new Date().toISOString(),
      projectPath
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

async function runGenericSASTTool(tool: any, projectPath: string) {
  try {
    console.log(`Running ${tool.name} on ${projectPath}`);
    const command = tool.runCommand ? `${tool.runCommand} ${projectPath}` : `echo "Running ${tool.name} on ${projectPath}"`;
    const { stdout } = await execAsync(command);

    return {
      success: true,
      message: `${tool.name} analysis completed`,
      output: stdout,
      timestamp: new Date().toISOString(),
      projectPath
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

async function runGenericTool(tool: any, projectPath: string) {
  try {
    console.log(`Running ${tool.name} on ${projectPath}`);
    const command = tool.runCommand ? `${tool.runCommand} ${projectPath}` : `echo "Running ${tool.name} on ${projectPath}"`;
    const { stdout } = await execAsync(command);

    return {
      success: true,
      message: `${tool.name} execution completed`,
      output: stdout,
      timestamp: new Date().toISOString(),
      projectPath
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}