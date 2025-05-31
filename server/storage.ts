import {
  users,
  tools,
  projects,
  scans,
  wrappers,
  type User,
  type UpsertUser,
  type Tool,
  type InsertTool,
  type Project,
  type InsertProject,
  type Scan,
  type InsertScan,
  type Wrapper,
  type InsertWrapper,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserPassword(id: string, password: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  
  // Tool operations
  getTools(): Promise<Tool[]>;
  getToolById(id: number): Promise<Tool | undefined>;
  createTool(tool: InsertTool): Promise<Tool>;
  updateToolInstallStatus(id: number, installed: boolean): Promise<Tool | undefined>;
  updateToolConfiguration(id: number, config: { installCommand?: string; runCommand?: string; description?: string }): Promise<Tool | undefined>;
  
  // Project operations
  getProjects(userId?: string): Promise<Project[]>;
  getProjectById(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  deleteProject(id: number): Promise<boolean>;
  getUserProjects(userId: string): Promise<Project[]>;
  
  // Scan operations
  getScans(userId?: string): Promise<Scan[]>;
  getScanById(id: number): Promise<Scan | undefined>;
  createScan(scan: InsertScan): Promise<Scan>;
  updateScanStatus(id: number, status: string, result?: any): Promise<Scan | undefined>;
  getUserScans(userId: string): Promise<Scan[]>;
  
  // Wrapper generation operations
  generateWrapper(language: string, path: string, options?: any): Promise<{ code: string; filename: string }>;
  
  // Wrapper storage operations
  createWrapper(wrapper: InsertWrapper): Promise<Wrapper>;
  getWrappers(userId?: string): Promise<Wrapper[]>;
  getUserWrappers(userId: string): Promise<Wrapper[]>;
  deleteWrapper(id: number, userId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private tools: Map<number, Tool> = new Map();
  private projects: Map<number, Project> = new Map();
  private scans: Map<number, Scan> = new Map();
  private wrappers: Map<number, Wrapper> = new Map();
  private currentToolId = 1;
  private currentProjectId = 1;
  private currentScanId = 1;
  private currentWrapperId = 1;

  constructor() {
    this.initializeDefaultTools();
    this.initializeDefaultAdmin();
  }

  private initializeDefaultTools() {
    const defaultTools: InsertTool[] = [
      // DAST/Fuzzing tools
      {
        name: "AFL++",
        type: "DAST",
        description: "Advanced fuzzing for C/C++ binaries",
        installCommand: "git clone https://github.com/AFLplusplus/AFLplusplus && cd AFLplusplus && make",
        runCommand: "afl-fuzz -i input -o output ./target",
        installed: false,
        ownerId: null,
      },
      {
        name: "libFuzzer",
        type: "DAST",
        description: "Coverage-guided fuzzing engine",
        installCommand: "clang -fsanitize=fuzzer,address -g -O1",
        runCommand: "./fuzz_target corpus/",
        installed: false,
        ownerId: null,
      },
      {
        name: "afl-ruby",
        type: "DAST",
        description: "Ruby fuzzing with AFL integration",
        installCommand: "gem install afl",
        runCommand: "afl-fuzz -i input -o output ruby target.rb",
        installed: false,
        ownerId: null,
      },
      
      // SAST tools
      {
        name: "Semgrep",
        type: "SAST",
        description: "Multi-language static analysis",
        installCommand: "pip install semgrep",
        runCommand: "semgrep --config=auto .",
        installed: true,
        ownerId: null,
      },
      {
        name: "SonarQube",
        type: "SAST",
        description: "Code quality and security analysis",
        installCommand: "docker pull sonarqube:latest",
        runCommand: "sonar-scanner -Dsonar.projectKey=myproject",
        installed: true,
        ownerId: null,
      },
      {
        name: "RubyCritic",
        type: "SAST",
        description: "Ruby code quality analyzer",
        installCommand: "gem install rubycritic",
        runCommand: "rubycritic --path output lib/",
        installed: false,
        ownerId: null,
      },
      {
        name: "RuboCop",
        type: "SAST",
        description: "Ruby static code analyzer",
        installCommand: "gem install rubocop",
        runCommand: "rubocop --format json",
        installed: false,
        ownerId: null,
      },

      // DAST tools
      {
        name: "OWASP ZAP",
        type: "DAST",
        description: "Web application security scanner",
        installCommand: "docker pull owasp/zap2docker-stable",
        runCommand: "zap-baseline.py -t",
        installed: true,
        ownerId: null,
      },
      // Wrapper Generation Tools
      {
        name: "dewrapper",
        type: "WRAPPER_GEN",
        description: "Ruby fuzzing wrapper generator using transform.py",
        installCommand: "python3 -m pip install --user ruby-transform",
        runCommand: "python3 transform.py",
        installed: true,
        ownerId: null,
      },
      {
        name: "futage",
        type: "WRAPPER_GEN", 
        description: "C/C++ fuzzing wrapper generator",
        installCommand: "git clone https://github.com/futage/futage && cd futage && make install",
        runCommand: "futage",
        installed: true,
        ownerId: null,
      },
      {
        name: "PyFuzzWrap",
        type: "WRAPPER_GEN",
        description: "Python fuzzing wrapper generator",
        installCommand: "pip install pyfuzzwrap",
        runCommand: "pyfuzzwrap",
        installed: true,
        ownerId: null,
      },
      {
        name: "Nikto",
        type: "DAST",
        description: "Web server vulnerability scanner",
        installCommand: "apt-get install nikto",
        runCommand: "nikto -h",
        installed: true,
        ownerId: null,
      },
    ];

    defaultTools.forEach(tool => {
      const newTool: Tool = {
        ...tool,
        id: this.currentToolId++,
        createdAt: new Date(),
        description: tool.description || null,
        installCommand: tool.installCommand || null,
        runCommand: tool.runCommand || null,
        installed: tool.installed || false,
        ownerId: tool.ownerId || null,
      };
      this.tools.set(newTool.id, newTool);
    });
  }

  private initializeDefaultAdmin() {
    const adminUser: User = {
      id: "admin_1",
      email: "admin@example.com",
      password: "admin123",
      firstName: "Admin",
      lastName: "User",
      profileImageUrl: null,
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    const regularUser: User = {
      id: "user_1",
      email: "user@example.com",
      password: "user123",
      firstName: "Regular",
      lastName: "User",
      profileImageUrl: null,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(regularUser.id, regularUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const usersArray = Array.from(this.users.values());
    return usersArray.find(user => user.email === username || user.id === username);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id);
    const user: User = {
      ...userData,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      role: userData.role || "user",
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async getTools(): Promise<Tool[]> {
    return Array.from(this.tools.values());
  }

  async getToolById(id: number): Promise<Tool | undefined> {
    return this.tools.get(id);
  }

  async createTool(toolData: InsertTool): Promise<Tool> {
    const tool: Tool = {
      ...toolData,
      id: this.currentToolId++,
      createdAt: new Date(),
      description: toolData.description || null,
      installCommand: toolData.installCommand || null,
      runCommand: toolData.runCommand || null,
      installed: toolData.installed || false,
      ownerId: toolData.ownerId || null,
    };
    this.tools.set(tool.id, tool);
    return tool;
  }

  async updateToolInstallStatus(id: number, installed: boolean): Promise<Tool | undefined> {
    const tool = this.tools.get(id);
    if (tool) {
      tool.installed = installed;
      this.tools.set(id, tool);
      return tool;
    }
    return undefined;
  }

  async updateToolConfiguration(id: number, config: { installCommand?: string; runCommand?: string; description?: string }): Promise<Tool | undefined> {
    const tool = this.tools.get(id);
    if (tool) {
      const updatedTool: Tool = { 
        ...tool,
        installCommand: config.installCommand !== undefined ? config.installCommand : tool.installCommand,
        runCommand: config.runCommand !== undefined ? config.runCommand : tool.runCommand,
        description: config.description !== undefined ? config.description : tool.description
      };
      this.tools.set(id, updatedTool);
      return updatedTool;
    }
    return undefined;
  }

  async getProjects(userId?: string): Promise<Project[]> {
    let projects = Array.from(this.projects.values());
    if (userId) {
      projects = projects.filter(p => p.userId === userId);
    }
    return projects;
  }

  async getProjectById(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const project: Project = {
      ...projectData,
      id: this.currentProjectId++,
      createdAt: new Date(),
      description: projectData.description || null,
    };
    this.projects.set(project.id, project);
    return project;
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    return this.getProjects(userId);
  }

  async getScans(userId?: string): Promise<Scan[]> {
    let scans = Array.from(this.scans.values());
    if (userId) {
      const userProjects = await this.getUserProjects(userId);
      const userProjectIds = new Set(userProjects.map(p => p.id));
      scans = scans.filter(s => userProjectIds.has(s.projectId));
    }
    return scans;
  }

  async getScanById(id: number): Promise<Scan | undefined> {
    return this.scans.get(id);
  }

  async createScan(scanData: InsertScan): Promise<Scan> {
    const scan: Scan = {
      ...scanData,
      id: this.currentScanId++,
      createdAt: new Date(),
      options: scanData.options || null,
      status: scanData.status || "pending",
      result: scanData.result || null,
      targetUrl: scanData.targetUrl || null,
      startedAt: null,
      finishedAt: null,
    };
    this.scans.set(scan.id, scan);
    return scan;
  }

  async updateScanStatus(id: number, status: string, result?: any): Promise<Scan | undefined> {
    const scan = this.scans.get(id);
    if (scan) {
      const updatedScan: Scan = {
        ...scan,
        status,
        result: result || scan.result,
        finishedAt: status === "completed" || status === "failed" ? new Date() : scan.finishedAt,
      };
      this.scans.set(id, updatedScan);
      return updatedScan;
    }
    return undefined;
  }

  async getUserScans(userId: string): Promise<Scan[]> {
    return this.getScans(userId);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser: User = {
        ...user,
        role,
        updatedAt: new Date(),
      };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    return this.upsertUser(userData);
  }

  async generateWrapper(language: string, path: string, options?: any): Promise<{ code: string; filename: string }> {
    const { generator = 'default' } = options || {};
    
    const templates = {
      c_cpp: {
        futage: {
          code: `// Generated with futage for ${path}
#include <stdint.h>
#include <stddef.h>

// Fuzzing target function
extern "C" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    if (size < 1) return 0;
    
    // Initialize your target with the fuzzing data
    // target_function(data, size);
    
    return 0;
}

// Build with: clang++ -fsanitize=fuzzer,address -g -O1 ${path} -o fuzz_target
// Run with: ./fuzz_target corpus/`,
          filename: `fuzz_${path.replace(/[^a-zA-Z0-9]/g, '_')}.cpp`
        },
        default: {
          code: `// AFL++ wrapper for ${path}
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main() {
    char input[1024];
    
    // Read input from AFL++
    while (fgets(input, sizeof(input), stdin)) {
        // Process input with your target function
        // target_function(input);
    }
    
    return 0;
}

// Compile with: afl-gcc -o target ${path}
// Run with: afl-fuzz -i input -o output ./target`,
          filename: `afl_${path.replace(/[^a-zA-Z0-9]/g, '_')}.c`
        }
      },
      ruby: {
        dewrapper: {
          code: `#!/usr/bin/env ruby
# Generated with Dewrapper for ${path}

require 'afl'

class FuzzWrapper
  def initialize(target_path)
    @target_path = target_path
    require_relative target_path if File.exist?(target_path)
  end
  
  def fuzz_target(input)
    begin
      # Call your target method here
      # YourClass.target_method(input)
    rescue => e
      # Handle exceptions during fuzzing
      puts "Exception: #{e.message}"
    end
  end
  
  def run_fuzzing
    AFL.init
    
    loop do
      input = AFL.get_input
      fuzz_target(input)
      AFL.loop
    end
  end
end

if __FILE__ == $0
  wrapper = FuzzWrapper.new('${path}')
  wrapper.run_fuzzing
end

# Run with: afl-fuzz -i input -o output ruby fuzz_wrapper.rb`,
          filename: `dewrapper_${path.replace(/[^a-zA-Z0-9]/g, '_')}.rb`
        },
        default: {
          code: `#!/usr/bin/env ruby
# Simple Ruby fuzzer for ${path}

require_relative '${path}' if File.exist?('${path}')

class SimpleFuzzer
  def initialize
    @iterations = 1000
  end
  
  def generate_input
    [
      (0...rand(10..100)).map { (65 + rand(26)).chr }.join,
      rand(0..1000).to_s,
      ['', nil, [], {}].sample
    ].sample
  end
  
  def fuzz_target(input)
    begin
      # Replace with your target method
      # YourClass.target_method(input)
    rescue => e
      puts "Found potential issue with input: #{input.inspect}"
      puts "Error: #{e.message}"
    end
  end
  
  def run
    @iterations.times do |i|
      input = generate_input
      fuzz_target(input)
      puts "Iteration #{i + 1}/#{@iterations}" if (i + 1) % 100 == 0
    end
  end
end

SimpleFuzzer.new.run if __FILE__ == $0`,
          filename: `simple_fuzz_${path.replace(/[^a-zA-Z0-9]/g, '_')}.rb`
        }
      },
      go: {
        default: {
          code: `package main

import (
    "fmt"
    "testing"
)

// Go fuzzing wrapper for ${path}
func FuzzTarget(f *testing.F) {
    // Add seed inputs
    f.Add([]byte("test"))
    f.Add([]byte(""))
    f.Add([]byte("hello world"))
    
    f.Fuzz(func(t *testing.T, data []byte) {
        // Call your target function here
        // if err := targetFunction(string(data)); err != nil {
        //     t.Errorf("Target function failed: %v", err)
        // }
        
        // Example validation
        if len(data) > 0 {
            // Process the fuzzing input
            _ = string(data)
        }
    })
}

func main() {
    fmt.Println("Go fuzz wrapper generated for ${path}")
    fmt.Println("Run with: go test -fuzz=FuzzTarget")
}

// Build and run:
// go mod init fuzztest
// go test -fuzz=FuzzTarget -fuzztime=30s`,
          filename: `fuzz_${path.replace(/[^a-zA-Z0-9]/g, '_')}_test.go`
        }
      }
    };

    const langTemplates = templates[language as keyof typeof templates];
    if (!langTemplates) {
      throw new Error(`Unsupported language: ${language}. Supported: c_cpp, ruby, go`);
    }

    const template = langTemplates[generator as keyof typeof langTemplates] || langTemplates.default;
    if (!template) {
      throw new Error(`Unsupported generator: ${generator} for language: ${language}`);
    }

    return template;
  }

  // Wrapper storage operations
  async createWrapper(wrapperData: InsertWrapper): Promise<Wrapper> {
    const wrapper: Wrapper = {
      id: this.currentWrapperId++,
      ...wrapperData,
      createdAt: new Date(),
    };
    this.wrappers.set(wrapper.id, wrapper);
    return wrapper;
  }

  async getWrappers(userId?: string): Promise<Wrapper[]> {
    const allWrappers = Array.from(this.wrappers.values());
    if (!userId) {
      return allWrappers;
    }
    return allWrappers.filter(wrapper => wrapper.userId === userId);
  }

  async getUserWrappers(userId: string): Promise<Wrapper[]> {
    return Array.from(this.wrappers.values()).filter(wrapper => wrapper.userId === userId);
  }

  async deleteWrapper(id: number, userId: string): Promise<boolean> {
    const wrapper = this.wrappers.get(id);
    if (!wrapper || wrapper.userId !== userId) {
      return false;
    }
    return this.wrappers.delete(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async updateUserPassword(id: string, password: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser: User = { ...user, password };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.projects.delete(id);
  }
}

import { DatabaseStorage } from "./database-storage";
export const storage = new DatabaseStorage();