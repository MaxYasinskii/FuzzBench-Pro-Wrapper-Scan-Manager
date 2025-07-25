#!/usr/bin/env python3
"""
PyFuzzWrap - Python Fuzzing Wrapper Generator
Генератор fuzzing-оберток для Python приложений
"""

import os
import sys
import ast
import argparse
from pathlib import Path
import json


def analyze_python_code(file_path):
    """Анализ Python кода для поиска функций"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        tree = ast.parse(content)
        functions = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                functions.append({
                    'name': node.name,
                    'line': node.lineno,
                    'args': [arg.arg for arg in node.args.args]
                })
        
        return functions
    except Exception as e:
        print(f"Error analyzing {file_path}: {e}")
        return []


def generate_fuzzing_wrapper(project_path, target_functions=None, output_dir=None):
    """Генерация fuzzing wrapper для Python проекта"""
    project_path = Path(project_path)
    
    if not project_path.exists():
        raise ValueError(f"Project path does not exist: {project_path}")
    
    # Поиск Python файлов
    python_files = list(project_path.rglob("*.py"))
    
    if not python_files:
        raise ValueError("No Python files found in project")
    
    # Анализ функций
    all_functions = {}
    for py_file in python_files[:5]:  # Ограничиваем анализ первыми 5 файлами
        rel_path = py_file.relative_to(project_path)
        functions = analyze_python_code(py_file)
        if functions:
            all_functions[str(rel_path)] = functions
    
    # Генерация wrapper кода
    wrapper_code = generate_wrapper_code(project_path, all_functions, target_functions)
    
    # Сохранение wrapper
    if not output_dir:
        output_dir = project_path / "fuzzing_wrappers"
    else:
        output_dir = Path(output_dir)
    
    output_dir.mkdir(exist_ok=True)
    
    wrapper_file = output_dir / "python_fuzz_wrapper.py"
    with open(wrapper_file, 'w', encoding='utf-8') as f:
        f.write(wrapper_code)
    
    return {
        "wrapper_file": str(wrapper_file),
        "functions_found": sum(len(funcs) for funcs in all_functions.values())
    }


def generate_wrapper_code(project_path, all_functions, target_functions):
    """Генерация кода wrapper"""
    
    code = f'''#!/usr/bin/env python3
"""
Auto-generated Python Fuzzing Wrapper
Project: {project_path.name}
Generated by: PyFuzzWrap
"""

import sys
import os
import random
import string
import json
from pathlib import Path

# Добавляем путь к проекту
sys.path.insert(0, "{project_path}")

class FuzzTester:
    """Класс для fuzzing тестирования Python функций"""
    
    def __init__(self):
        self.results = []
        self.errors = []
    
    def fuzz_string(self, length=100):
        """Генерация случайной строки"""
        return ''.join(random.choices(string.ascii_letters + string.digits + string.punctuation, k=length))
    
    def fuzz_number(self, min_val=-1000, max_val=1000):
        """Генерация случайного числа"""
        return random.randint(min_val, max_val)
    
    def test_function(self, module_name, func_name, args_count):
        """Тестирование функции с случайными данными"""
        try:
            module = __import__(module_name.replace('.py', '').replace('/', '.'))
            func = getattr(module, func_name)
            
            # Генерация аргументов
            args = []
            for i in range(args_count):
                arg_type = random.choice(['string', 'number', 'none'])
                if arg_type == 'string':
                    args.append(self.fuzz_string())
                elif arg_type == 'number':
                    args.append(self.fuzz_number())
                else:
                    args.append(None)
            
            # Вызов функции
            result = func(*args)
            self.results.append({{
                "function": f"{{module_name}}.{{func_name}}",
                "status": "success"
            }})
            
        except Exception as e:
            self.errors.append({{
                "function": f"{{module_name}}.{{func_name}}",
                "error": str(e),
                "error_type": type(e).__name__
            }})

# Обнаруженные функции для фаззинга
FUNCTIONS_TO_FUZZ = {json.dumps(all_functions, indent=2)}

def run_fuzzing_session(iterations=100):
    """Запуск сессии фаззинга"""
    tester = FuzzTester()
    
    print(f"Starting Python fuzzing session with {{iterations}} iterations...")
    
    for i in range(iterations):
        for file_path, functions in FUNCTIONS_TO_FUZZ.items():
            for func_info in functions:
                tester.test_function(
                    file_path, 
                    func_info['name'], 
                    len(func_info['args'])
                )
        
        if i % 10 == 0:
            print(f"Progress: {{i}}/{{iterations}} iterations completed")
    
    # Вывод результатов
    print(f"\\nFuzzing completed!")
    print(f"Successful calls: {{len(tester.results)}}")
    print(f"Errors found: {{len(tester.errors)}}")
    
    if tester.errors:
        print("\\nErrors detected:")
        for error in tester.errors[:5]:
            print(f"  - {{error['function']}}: {{error['error_type']}}")
    
    return len(tester.errors) == 0

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Python Fuzzing Wrapper")
    parser.add_argument("--iterations", type=int, default=100, help="Number of fuzzing iterations")
    
    args = parser.parse_args()
    
    success = run_fuzzing_session(args.iterations)
    sys.exit(0 if success else 1)
'''
    
    return code


def main():
    parser = argparse.ArgumentParser(description="PyFuzzWrap - Python Fuzzing Wrapper Generator")
    parser.add_argument("project_path", help="Path to Python project")
    parser.add_argument("--functions", nargs="+", help="Specific functions to target")
    parser.add_argument("--output", help="Output directory for wrapper")
    
    args = parser.parse_args()
    
    try:
        result = generate_fuzzing_wrapper(
            args.project_path, 
            args.functions, 
            args.output
        )
        
        print("Fuzzing wrapper generated successfully!")
        print(f"Wrapper file: {result['wrapper_file']}")
        print(f"Functions found: {result['functions_found']}")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()