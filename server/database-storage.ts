import { eq, or } from "drizzle-orm";
import { db } from "./db";
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
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const usersFound = await db.select().from(users).where(eq(users.id, username));
    if (usersFound.length > 0) return usersFound[0];
    
    const usersByEmail = await db.select().from(users).where(eq(users.email, username));
    return usersByEmail.length > 0 ? usersByEmail[0] : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const usersByEmail = await db.select().from(users).where(eq(users.email, email));
    return usersByEmail.length > 0 ? usersByEmail[0] : undefined;
  }

  async updateUserPassword(id: string, password: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ password })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Tool operations
  async getTools(): Promise<Tool[]> {
    return await db.select().from(tools);
  }

  async getToolById(id: number): Promise<Tool | undefined> {
    const [tool] = await db.select().from(tools).where(eq(tools.id, id));
    return tool;
  }

  async createTool(toolData: InsertTool): Promise<Tool> {
    const [tool] = await db.insert(tools).values(toolData).returning();
    return tool;
  }

  async updateToolInstallStatus(id: number, installed: boolean): Promise<Tool | undefined> {
    const [tool] = await db
      .update(tools)
      .set({ installed })
      .where(eq(tools.id, id))
      .returning();
    return tool;
  }

  async updateToolConfiguration(id: number, config: { installCommand?: string; runCommand?: string; description?: string }): Promise<Tool | undefined> {
    const updateData: any = {};
    if (config.installCommand !== undefined) updateData.installCommand = config.installCommand;
    if (config.runCommand !== undefined) updateData.runCommand = config.runCommand;
    if (config.description !== undefined) updateData.description = config.description;

    const [tool] = await db
      .update(tools)
      .set(updateData)
      .where(eq(tools.id, id))
      .returning();
    return tool;
  }

  // Project operations
  async getProjects(userId?: string): Promise<Project[]> {
    if (userId) {
      return await db.select().from(projects).where(eq(projects.userId, userId));
    }
    return await db.select().from(projects);
  }

  async getProjectById(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId));
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(eq(projects.id, id));
    return result.length > 0;
  }

  // Scan operations
  async getScans(userId?: string): Promise<Scan[]> {
    if (userId) {
      const userProjects = await this.getUserProjects(userId);
      const userProjectIds = userProjects.map(p => p.id);
      if (userProjectIds.length === 0) return [];
      
      return await db.select().from(scans).where(
        eq(scans.projectId, userProjectIds[0]) // This would need proper IN clause handling
      );
    }
    return await db.select().from(scans);
  }

  async getScanById(id: number): Promise<Scan | undefined> {
    const [scan] = await db.select().from(scans).where(eq(scans.id, id));
    return scan;
  }

  async createScan(scanData: InsertScan): Promise<Scan> {
    const [scan] = await db.insert(scans).values(scanData).returning();
    return scan;
  }

  async updateScanStatus(id: number, status: string, result?: any): Promise<Scan | undefined> {
    const updateData: any = { status };
    if (result) updateData.result = result;
    if (status === "completed" || status === "failed") {
      updateData.finishedAt = new Date();
    }

    const [scan] = await db
      .update(scans)
      .set(updateData)
      .where(eq(scans.id, id))
      .returning();
    return scan;
  }

  async getUserScans(userId: string): Promise<Scan[]> {
    return this.getScans(userId);
  }

  // Wrapper generation
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    return this.upsertUser(userData);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id));
    return result.length > 0;
  }

  async generateWrapper(language: string, path: string, options?: any): Promise<{ code: string; filename: string }> {
    const templates: Record<string, string> = {
      python: `#!/usr/bin/env python3
"""
Fuzzing wrapper for ${path}
Generated by FuzzBranch Scanner using PyFuzzWrap
"""

import os
import sys
import subprocess
import json
from typing import Dict, Any

class FuzzingWrapper:
    def __init__(self, target_path: str = "${path}"):
        self.target_path = target_path
        self.options = ${JSON.stringify(options || {}, null, 8)}
    
    def run_fuzz_test(self, input_data: str) -> Dict[str, Any]:
        """Execute fuzzing test with given input"""
        try:
            result = subprocess.run(
                [sys.executable, self.target_path],
                input=input_data,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            return {
                "success": True,
                "return_code": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "crashed": result.returncode != 0
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Timeout"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def generate_test_cases(self) -> list:
        """Generate basic test cases for fuzzing"""
        return [
            "",  # Empty input
            "A" * 1000,  # Buffer overflow attempt
            "\\x00\\x01\\x02",  # Binary data
            "../../../etc/passwd",  # Path traversal
            "<script>alert('xss')</script>",  # XSS payload
            "'; DROP TABLE users; --",  # SQL injection
        ]

if __name__ == "__main__":
    wrapper = FuzzingWrapper()
    test_cases = wrapper.generate_test_cases()
    
    print(f"Running fuzzing tests on {wrapper.target_path}")
    for i, test_case in enumerate(test_cases):
        print(f"Test {i+1}: {repr(test_case[:50])}")
        result = wrapper.run_fuzz_test(test_case)
        if result.get("crashed"):
            print(f"  CRASH DETECTED: {result}")
        else:
            print(f"  OK: {result['return_code']}")
`,
      javascript: `#!/usr/bin/env node
/**
 * Fuzzing wrapper for ${path}
 * Generated by DevSec Scanner
 */

const { spawn } = require('child_process');

class FuzzingWrapper {
    constructor(targetPath = '${path}') {
        this.targetPath = targetPath;
        this.options = ${JSON.stringify(options || {}, null, 8)};
    }
    
    async runFuzzTest(inputData) {
        return new Promise((resolve) => {
            const child = spawn('node', [this.targetPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 30000
            });
            
            child.stdin.write(inputData);
            child.stdin.end();
            
            let stdout = '';
            let stderr = '';
            
            child.stdout.on('data', (data) => stdout += data);
            child.stderr.on('data', (data) => stderr += data);
            
            child.on('close', (code) => {
                resolve({
                    success: true,
                    returnCode: code,
                    stdout,
                    stderr,
                    crashed: code !== 0
                });
            });
            
            child.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message
                });
            });
        });
    }
    
    generateTestCases() {
        return [
            '',  // Empty input
            'A'.repeat(1000),  // Buffer overflow attempt
            '\\x00\\x01\\x02',  // Binary data
            '../../../etc/passwd',  // Path traversal
            '<script>alert("xss")</script>',  // XSS payload
            "'; DROP TABLE users; --",  // SQL injection
        ];
    }
}

module.exports = FuzzingWrapper;
`,
      go: `package main

// Fuzzing wrapper for ${path}
// Generated by DevSec Scanner

import (
    "fmt"
    "os/exec"
    "strings"
    "time"
)

type FuzzingWrapper struct {
    TargetPath string
    Options    map[string]interface{}
}

type TestResult struct {
    Success    bool
    ReturnCode int
    Stdout     string
    Stderr     string
    Crashed    bool
    Error      string
}

func NewFuzzingWrapper() *FuzzingWrapper {
    return &FuzzingWrapper{
        TargetPath: "${path}",
        Options:    map[string]interface{}{},
    }
}

func (fw *FuzzingWrapper) RunFuzzTest(inputData string) TestResult {
    cmd := exec.Command("go", "run", fw.TargetPath)
    cmd.Stdin = strings.NewReader(inputData)
    
    done := make(chan TestResult, 1)
    go func() {
        output, err := cmd.CombinedOutput()
        result := TestResult{
            Success:    true,
            ReturnCode: cmd.ProcessState.ExitCode(),
            Stdout:     string(output),
            Crashed:    cmd.ProcessState.ExitCode() != 0,
        }
        if err != nil {
            result.Error = err.Error()
        }
        done <- result
    }()
    
    select {
    case result := <-done:
        return result
    case <-time.After(30 * time.Second):
        return TestResult{Success: false, Error: "Timeout"}
    }
}

func (fw *FuzzingWrapper) GenerateTestCases() []string {
    return []string{
        "",                                    // Empty input
        strings.Repeat("A", 1000),            // Buffer overflow attempt
        "\\x00\\x01\\x02",                     // Binary data
        "../../../etc/passwd",                // Path traversal
        "<script>alert('xss')</script>",      // XSS payload
        "'; DROP TABLE users; --",            // SQL injection
    }
}

func main() {
    wrapper := NewFuzzingWrapper()
    testCases := wrapper.GenerateTestCases()
    
    fmt.Printf("Running fuzzing tests on %s\\n", wrapper.TargetPath)
    
    for i, testCase := range testCases {
        fmt.Printf("Test %d: %q\\n", i+1, testCase)
        
        result := wrapper.RunFuzzTest(testCase)
        if result.Crashed {
            fmt.Printf("  CRASH DETECTED: %+v\\n", result)
        } else {
            fmt.Printf("  OK: %d\\n", result.ReturnCode)
        }
    }
}
`,

      c: `/*
 * Fuzzing wrapper for ${path}
 * Generated by FuzzBranch Scanner using futage
 * Designed for AFL++ and libFuzzer integration
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/wait.h>

typedef struct {
    char* input;
    int return_code;
    int crashed;
    char* error;
} FuzzResult;

typedef struct {
    char* target_path;
} FuzzingWrapper;

FuzzingWrapper* new_fuzzing_wrapper() {
    FuzzingWrapper* wrapper = malloc(sizeof(FuzzingWrapper));
    wrapper->target_path = strdup("${path}");
    return wrapper;
}

char** generate_test_cases() {
    static char* test_cases[] = {
        "",                                    // Empty input
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",  // Buffer overflow attempt
        "\\x00\\x01\\x02",                     // Binary data
        "../../../etc/passwd",                // Path traversal
        "<script>alert('xss')</script>",      // XSS payload
        "'; DROP TABLE users; --",            // SQL injection
        NULL
    };
    return test_cases;
}

FuzzResult run_fuzz_test(FuzzingWrapper* wrapper, const char* test_input) {
    FuzzResult result = {0};
    result.input = strdup(test_input);
    
    pid_t pid = fork();
    if (pid == 0) {
        execl(wrapper->target_path, wrapper->target_path, (char*)NULL);
        exit(1);
    } else if (pid > 0) {
        int status;
        waitpid(pid, &status, 0);
        result.return_code = WEXITSTATUS(status);
        result.crashed = (result.return_code != 0);
    } else {
        result.crashed = 1;
        result.error = strdup("Fork failed");
    }
    
    return result;
}

int main() {
    FuzzingWrapper* wrapper = new_fuzzing_wrapper();
    char** test_cases = generate_test_cases();
    
    printf("Running fuzzing tests on %s\\n", wrapper->target_path);
    
    for (int i = 0; test_cases[i] != NULL; i++) {
        printf("Test %d: \\"%s\\"\\n", i+1, test_cases[i]);
        
        FuzzResult result = run_fuzz_test(wrapper, test_cases[i]);
        if (result.crashed) {
            printf("  CRASH DETECTED: Return code %d\\n", result.return_code);
            if (result.error) {
                printf("  Error: %s\\n", result.error);
            }
        } else {
            printf("  OK: %d\\n", result.return_code);
        }
        
        free(result.input);
        if (result.error) free(result.error);
    }
    
    free(wrapper->target_path);
    free(wrapper);
    return 0;
}
`,

      cpp: `/*
 * Fuzzing wrapper for ${path}
 * Generated by FuzzBranch Scanner using futage
 * Designed for AFL++ and libFuzzer integration
 */
#include <iostream>
#include <vector>
#include <string>
#include <cstdlib>
#include <cstdio>
#include <memory>
#include <stdexcept>
#include <array>

class FuzzingWrapper {
private:
    std::string target_path;

public:
    FuzzingWrapper() : target_path("${path}") {}

    std::vector<std::string> generateTestCases() {
        return {
            "",                                    // Empty input
            std::string(1000, 'A'),               // Buffer overflow attempt
            "\\x00\\x01\\x02",                    // Binary data
            "../../../etc/passwd",               // Path traversal
            "<script>alert('xss')</script>",     // XSS payload
            "'; DROP TABLE users; --"            // SQL injection
        };
    }

    struct FuzzResult {
        std::string input;
        int return_code;
        std::string output;
        bool crashed;
        std::string error;
    };

    FuzzResult runFuzzTest(const std::string& test_input) {
        FuzzResult result;
        result.input = test_input;
        result.crashed = false;

        try {
            std::string command = target_path + " 2>&1";
            std::unique_ptr<FILE, decltype(&pclose)> pipe(popen(command.c_str(), "r"), pclose);
            
            if (!pipe) {
                result.crashed = true;
                result.error = "Failed to create pipe";
                return result;
            }

            std::array<char, 128> buffer;
            while (fgets(buffer.data(), buffer.size(), pipe.get()) != nullptr) {
                result.output += buffer.data();
            }

            result.return_code = pclose(pipe.release());
            result.crashed = (result.return_code != 0);
        } catch (const std::exception& e) {
            result.crashed = true;
            result.error = e.what();
        }

        return result;
    }
};

int main() {
    FuzzingWrapper wrapper;
    auto test_cases = wrapper.generateTestCases();
    
    std::cout << "Running fuzzing tests on ${path}" << std::endl;
    
    for (size_t i = 0; i < test_cases.size(); ++i) {
        std::cout << "Test " << (i+1) << ": \\"" << test_cases[i] << "\\"" << std::endl;
        
        auto result = wrapper.runFuzzTest(test_cases[i]);
        if (result.crashed) {
            std::cout << "  CRASH DETECTED: " << result.return_code << std::endl;
            if (!result.error.empty()) {
                std::cout << "  Error: " << result.error << std::endl;
            }
        } else {
            std::cout << "  OK: " << result.return_code << std::endl;
        }
    }
    
    return 0;
}
`,

      c_cpp: `/*
 * Fuzzing wrapper for ${path}
 * Generated by FuzzBranch Scanner using futage
 * Designed for AFL++ and libFuzzer integration
 */
#include <iostream>
#include <vector>
#include <string>
#include <cstdlib>
#include <cstdio>
#include <memory>
#include <stdexcept>
#include <array>

class FuzzingWrapper {
private:
    std::string target_path;

public:
    FuzzingWrapper() : target_path("${path}") {}

    std::vector<std::string> generateTestCases() {
        return {
            "",                                    // Empty input
            std::string(1000, 'A'),               // Buffer overflow attempt
            "\\x00\\x01\\x02",                    // Binary data
            "../../../etc/passwd",               // Path traversal
            "<script>alert('xss')</script>",     // XSS payload
            "'; DROP TABLE users; --"            // SQL injection
        };
    }

    struct FuzzResult {
        std::string input;
        int return_code;
        std::string output;
        bool crashed;
        std::string error;
    };

    FuzzResult runFuzzTest(const std::string& test_input) {
        FuzzResult result;
        result.input = test_input;
        result.crashed = false;

        try {
            std::string command = target_path + " 2>&1";
            std::unique_ptr<FILE, decltype(&pclose)> pipe(popen(command.c_str(), "r"), pclose);
            
            if (!pipe) {
                result.crashed = true;
                result.error = "Failed to create pipe";
                return result;
            }

            std::array<char, 128> buffer;
            while (fgets(buffer.data(), buffer.size(), pipe.get()) != nullptr) {
                result.output += buffer.data();
            }

            result.return_code = pclose(pipe.release());
            result.crashed = (result.return_code != 0);
        } catch (const std::exception& e) {
            result.crashed = true;
            result.error = e.what();
        }

        return result;
    }
};

int main() {
    FuzzingWrapper wrapper;
    auto test_cases = wrapper.generateTestCases();
    
    std::cout << "Running fuzzing tests on ${path}" << std::endl;
    
    for (size_t i = 0; i < test_cases.size(); ++i) {
        std::cout << "Test " << (i+1) << ": \\"" << test_cases[i] << "\\"" << std::endl;
        
        auto result = wrapper.runFuzzTest(test_cases[i]);
        if (result.crashed) {
            std::cout << "  CRASH DETECTED: " << result.return_code << std::endl;
            if (!result.error.empty()) {
                std::cout << "  Error: " << result.error << std::endl;
            }
        } else {
            std::cout << "  OK: " << result.return_code << std::endl;
        }
    }
    
    return 0;
}
`,

      ruby: `#!/usr/bin/env ruby
# Fuzzing wrapper for ${path}
# Generated by FuzzBranch Scanner using dewrapper
# Custom Ruby fuzzing wrapper generator

class FuzzingWrapper
  def initialize(target_path = "${path}")
    @target_path = target_path
  end

  def generate_test_cases
    [
      "",                                    # Empty input
      "A" * 1000,                          # Buffer overflow attempt
      "\\x00\\x01\\x02",                   # Binary data
      "../../../etc/passwd",              # Path traversal
      "<script>alert('xss')</script>",    # XSS payload
      "'; DROP TABLE users; --"           # SQL injection
    ]
  end

  def run_fuzz_test(test_input)
    result = {
      input: test_input,
      return_code: nil,
      stdout: "",
      stderr: "",
      crashed: false,
      error: nil
    }

    begin
      require 'open3'
      
      stdout, stderr, status = Open3.capture3(@target_path, stdin_data: test_input, timeout: 10)
      
      result[:return_code] = status.exitstatus
      result[:stdout] = stdout
      result[:stderr] = stderr
      result[:crashed] = status.exitstatus != 0
    rescue Timeout::Error
      result[:crashed] = true
      result[:error] = "Timeout"
    rescue => e
      result[:crashed] = true
      result[:error] = e.message
    end

    result
  end
end

if __FILE__ == $0
  wrapper = FuzzingWrapper.new
  test_cases = wrapper.generate_test_cases
  
  puts "Running fuzzing tests on ${path}"
  
  test_cases.each_with_index do |test_case, i|
    puts "Test #{i+1}: #{test_case.inspect}"
    
    result = wrapper.run_fuzz_test(test_case)
    if result[:crashed]
      puts "  CRASH DETECTED: #{result}"
    else
      puts "  OK: #{result[:return_code]}"
    end
  end
end
`
    };

    const code = templates[language.toLowerCase()] || templates.python;
    const extensions: Record<string, string> = {
      python: 'py',
      c: 'c',
      cpp: 'cpp',
      c_cpp: 'cpp',
      ruby: 'rb'
    };
    
    const ext = extensions[language.toLowerCase()] || 'py';
    const filename = `fuzzing_wrapper_${Date.now()}.${ext}`;
    
    return { code, filename };
  }

  // Wrapper storage operations
  async createWrapper(wrapperData: InsertWrapper): Promise<Wrapper> {
    const [wrapper] = await db
      .insert(wrappers)
      .values(wrapperData)
      .returning();
    return wrapper;
  }

  async getWrappers(userId?: string): Promise<Wrapper[]> {
    if (!userId) {
      return await db.select().from(wrappers);
    }
    return await db.select().from(wrappers).where(eq(wrappers.userId, userId));
  }

  async getUserWrappers(userId: string): Promise<Wrapper[]> {
    return await db.select().from(wrappers).where(eq(wrappers.userId, userId));
  }

  async deleteWrapper(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(wrappers)
      .where(eq(wrappers.id, id))
      .returning();
    return result.length > 0;
  }
}