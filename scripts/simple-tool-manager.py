
#!/usr/bin/env python3
"""
Simple Tool Manager for Replit Host Environment
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path
import argparse

def install_tool(tool_name, install_command):
    """Установка инструмента на хосте Replit"""
    print(f"Installing {tool_name}")
    print(f"Command: {install_command}")
    
    try:
        # Выполняем команду установки
        result = subprocess.run(
            install_command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=300
        )
        
        if result.returncode == 0:
            print(f"✅ {tool_name} installed successfully")
            print(f"Output: {result.stdout}")
            return True
        else:
            print(f"❌ Installation failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"❌ Installation timeout for {tool_name}")
        return False
    except Exception as e:
        print(f"❌ Error installing {tool_name}: {str(e)}")
        return False

def run_tool(tool_name, command, project_path=None):
    """Запуск инструмента"""
    print(f"Running {tool_name}")
    print(f"Command: {command}")
    
    # Определяем рабочую директорию
    cwd = project_path if project_path and os.path.exists(project_path) else os.getcwd()
    
    try:
        # Запускаем инструмент
        process = subprocess.Popen(
            command,
            shell=True,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Читаем вывод в реальном времени
        while True:
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
                break
            if output:
                print(output.strip())
        
        # Получаем финальный код возврата
        return_code = process.poll()
        
        if return_code == 0:
            print(f"✅ {tool_name} completed successfully")
        else:
            stderr = process.stderr.read()
            print(f"❌ {tool_name} failed with code {return_code}")
            if stderr:
                print(f"Error: {stderr}")
        
        return return_code == 0
        
    except Exception as e:
        print(f"❌ Error running {tool_name}: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Simple Tool Manager for Replit")
    parser.add_argument("action", choices=["install", "run"])
    parser.add_argument("--tool-name", help="Tool name")
    parser.add_argument("--command", help="Command to execute")
    parser.add_argument("--project-path", help="Project path")
    
    args = parser.parse_args()
    
    if args.action == "install":
        if not all([args.tool_name, args.command]):
            print("❌ Missing required arguments for install")
            sys.exit(1)
        success = install_tool(args.tool_name, args.command)
        sys.exit(0 if success else 1)
        
    elif args.action == "run":
        if not all([args.tool_name, args.command]):
            print("❌ Missing required arguments for run")
            sys.exit(1)
        success = run_tool(args.tool_name, args.command, args.project_path)
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
