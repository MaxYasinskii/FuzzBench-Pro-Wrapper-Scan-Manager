#!/usr/bin/env python3
"""
Host Tool Manager - Управление инструментами безопасности на хост-машине
"""

import os
import sys
import json
import subprocess
import shutil
from pathlib import Path
import argparse

# Базовые пути на хосте
HOME = os.path.expanduser("~")
TOOLS_DIR = Path(HOME) / "devsec-tools"
DATA_DIR = Path(HOME) / "fuzzbench-data"
PROJECTS_DIR = DATA_DIR / "projects"

def ensure_directories():
    """Создание необходимых директорий"""
    TOOLS_DIR.mkdir(exist_ok=True)
    DATA_DIR.mkdir(exist_ok=True)
    PROJECTS_DIR.mkdir(exist_ok=True)
    
    # Создание поддиректорий для инструментов
    (TOOLS_DIR / "sast").mkdir(exist_ok=True)
    (TOOLS_DIR / "dast").mkdir(exist_ok=True)
    (TOOLS_DIR / "wrappers").mkdir(exist_ok=True)

def install_tool(tool_name, tool_type, install_command):
    """Установка инструмента на хост"""
    print(f"Installing {tool_name} ({tool_type})")
    print(f"Command: {install_command}")
    
    tool_dir = TOOLS_DIR / tool_type.lower() / tool_name.lower()
    tool_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Специальная логика для локальных скриптов
        if tool_name.lower() == "pyfuzzwrap":
            # Копируем Python скрипт из проекта
            source_script = Path("./scripts/pyfuzz_gen.py")
            if source_script.exists():
                import shutil
                shutil.copy(source_script, tool_dir / "pyfuzz_gen.py")
                print(f"✅ {tool_name} installed successfully (copied from project)")
                return True
            else:
                print(f"❌ Source script not found: {source_script}")
                return False
                
        elif tool_name.lower() == "dewrapper":
            # Копируем Ruby AFL transformer из проекта
            source_script = Path("./scripts/transform.py")
            if source_script.exists():
                import shutil
                shutil.copy(source_script, tool_dir / "transform.py")
                print(f"✅ {tool_name} installed successfully (copied AFL Ruby transformer)")
                return True
            else:
                print(f"❌ Source script not found: {source_script}")
                return False
            
        else:
            # Обычная установка для других инструментов
            result = subprocess.run(
                install_command,
                shell=True,
                cwd=tool_dir,
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

def remove_tool(tool_name, tool_type):
    """Удаление инструмента с хоста"""
    print(f"Removing {tool_name} ({tool_type})")
    
    tool_dir = TOOLS_DIR / tool_type.lower() / tool_name.lower()
    
    if tool_dir.exists():
        shutil.rmtree(tool_dir)
        print(f"✅ {tool_name} removed successfully")
        return True
    else:
        print(f"⚠️ Tool directory not found: {tool_dir}")
        return False

def run_tool(tool_name, command, project_path=None):
    """Запуск инструмента"""
    print(f"Running {tool_name}")
    print(f"Command: {command}")
    
    # Определяем рабочую директорию
    if project_path and (PROJECTS_DIR / project_path).exists():
        cwd = PROJECTS_DIR / project_path
    else:
        cwd = PROJECTS_DIR
    
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
            print(f"Error: {stderr}")
        
        return return_code == 0
        
    except Exception as e:
        print(f"❌ Error running {tool_name}: {str(e)}")
        return False

def generate_wrapper(language, project_path, generator_options=None):
    """Генерация обёртки для фаззинга"""
    print(f"Generating wrapper for {language} project: {project_path}")
    
    project_full_path = PROJECTS_DIR / project_path
    if not project_full_path.exists():
        print(f"❌ Project path not found: {project_full_path}")
        return False
    
    wrapper_dir = project_full_path / "wrappers"
    wrapper_dir.mkdir(exist_ok=True)
    
    try:
        if language.lower() == "ruby":
            # Ruby через transform.py
            transform_script = TOOLS_DIR / "wrappers" / "transform.py"
            if not transform_script.exists():
                print("❌ transform.py not found. Install dewrapper first.")
                return False
            
            command = f"python3 {transform_script} {project_full_path}"
            
        elif language.lower() in ["c", "cpp", "c++"]:
            # C/C++ через futag
            futag_path = TOOLS_DIR / "wrappers" / "futag"
            if not futag_path.exists():
                print("❌ futag not found. Install futag first.")
                return False
            
            command = f"{futag_path}/bin/futag-gen {project_full_path}"
            
        elif language.lower() == "python":
            # Python собственный генератор
            command = f"python3 -c \"import sys; sys.path.append('{TOOLS_DIR}/wrappers'); import pyfuzz_gen; pyfuzz_gen.generate('{project_full_path}')\""
            
        else:
            print(f"❌ Unsupported language: {language}")
            return False
        
        # Выполняем генерацию
        result = subprocess.run(
            command,
            shell=True,
            cwd=wrapper_dir,
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode == 0:
            print(f"✅ Wrapper generated successfully")
            print(f"Output: {result.stdout}")
            return True
        else:
            print(f"❌ Wrapper generation failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error generating wrapper: {str(e)}")
        return False

def list_tools():
    """Список установленных инструментов"""
    print("Installed tools:")
    
    for tool_type in ["sast", "dast", "wrappers"]:
        type_dir = TOOLS_DIR / tool_type
        if type_dir.exists():
            print(f"\n{tool_type.upper()}:")
            for tool_dir in type_dir.iterdir():
                if tool_dir.is_dir():
                    print(f"  - {tool_dir.name}")

def main():
    parser = argparse.ArgumentParser(description="Host Tool Manager")
    parser.add_argument("action", choices=["install", "remove", "run", "generate", "list"])
    parser.add_argument("--tool-name", help="Tool name")
    parser.add_argument("--tool-type", help="Tool type (SAST/DAST/WRAPPER)")
    parser.add_argument("--command", help="Command to execute")
    parser.add_argument("--language", help="Programming language for wrapper generation")
    parser.add_argument("--project-path", help="Project path")
    parser.add_argument("--options", help="Additional options as JSON")
    
    args = parser.parse_args()
    
    # Создаем необходимые директории
    ensure_directories()
    
    if args.action == "install":
        if not all([args.tool_name, args.tool_type, args.command]):
            print("❌ Missing required arguments for install")
            sys.exit(1)
        success = install_tool(args.tool_name, args.tool_type, args.command)
        sys.exit(0 if success else 1)
        
    elif args.action == "remove":
        if not all([args.tool_name, args.tool_type]):
            print("❌ Missing required arguments for remove")
            sys.exit(1)
        success = remove_tool(args.tool_name, args.tool_type)
        sys.exit(0 if success else 1)
        
    elif args.action == "run":
        if not all([args.tool_name, args.command]):
            print("❌ Missing required arguments for run")
            sys.exit(1)
        success = run_tool(args.tool_name, args.command, args.project_path)
        sys.exit(0 if success else 1)
        
    elif args.action == "generate":
        if not all([args.language, args.project_path]):
            print("❌ Missing required arguments for generate")
            sys.exit(1)
        success = generate_wrapper(args.language, args.project_path, args.options)
        sys.exit(0 if success else 1)
        
    elif args.action == "list":
        list_tools()
        sys.exit(0)

if __name__ == "__main__":
    main()