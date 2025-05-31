#!/usr/bin/env python3
"""
AFL Ruby Transformer - Добавление поддержки AFL в Ruby код
Адаптировано для проекта FuzzBranch Scanner
"""

import re
import sys
import shutil
import argparse
import os
from pathlib import Path
import json


def transform_ruby_code(input_code):
    """
    Универсальное добавление поддержки AFL в Ruby-скрипт.
    """
    # Проверяем, есть ли блок лицензии
    license_pattern = r'(Licensed under the Apache License, Version [\d.]+.*?# limitations under the License\.\s*#[-]+ #)'
    if re.search(license_pattern, input_code, re.DOTALL):
        input_code = re.sub(license_pattern, r'\1\nrequire "afl"\n', input_code, flags=re.DOTALL)
    else:
        # Если лицензии нет, добавляем require "afl" в начало
        input_code = 'require "afl"\n' + input_code
    
    # Вставка кода инициализации AFL перед разбором аргументов
    afl_init_code = '''\nAFL.init\nafl_input = $stdin.gets\nARGV.replace(afl_input.split)\n'''
    
    if "CommandParser::CmdParser.new(ARGV)" in input_code:
        input_code = input_code.replace("CommandParser::CmdParser.new(ARGV)", afl_init_code + "CommandParser::CmdParser.new(ARGV)")
    else:
        # Если не найден разбор аргументов, добавляем перед первым `ARGV`
        input_code = re.sub(r'ARGV', afl_init_code + 'ARGV', input_code, count=1)
    
    return input_code


def analyze_ruby_files(project_path):
    """Анализ Ruby файлов в проекте"""
    project_path = Path(project_path)
    ruby_files = list(project_path.rglob("*.rb"))
    
    files_info = []
    for rb_file in ruby_files:
        try:
            with open(rb_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Поиск методов
            method_pattern = r'def\s+(\w+)(?:\(([^)]*)\))?'
            methods = []
            for match in re.finditer(method_pattern, content, re.MULTILINE):
                method_name = match.group(1)
                params = match.group(2) if match.group(2) else ""
                line_num = content[:match.start()].count('\n') + 1
                
                methods.append({
                    'name': method_name,
                    'line': line_num,
                    'params': [p.strip() for p in params.split(',') if p.strip()]
                })
            
            files_info.append({
                'file': str(rb_file.relative_to(project_path)),
                'full_path': str(rb_file),
                'methods': methods,
                'size': len(content),
                'lines': content.count('\n') + 1
            })
            
        except Exception as e:
            print(f"Error analyzing {rb_file}: {e}")
    
    return files_info


def transform_ruby_project(project_path, output_dir=None, target_files=None):
    """Трансформация всех Ruby файлов в проекте для поддержки AFL"""
    project_path = Path(project_path)
    
    if not project_path.exists():
        raise ValueError(f"Project path does not exist: {project_path}")
    
    # Создание выходной директории
    if not output_dir:
        output_dir = project_path / "afl_transformed"
    else:
        output_dir = Path(output_dir)
    
    output_dir.mkdir(exist_ok=True)
    
    # Анализ и трансформация файлов
    files_info = analyze_ruby_files(project_path)
    transformed_files = []
    
    for file_info in files_info:
        # Если указаны конкретные файлы, обрабатываем только их
        if target_files and file_info['file'] not in target_files:
            continue
            
        try:
            # Читаем исходный файл
            with open(file_info['full_path'], 'r', encoding='utf-8') as f:
                original_code = f.read()
            
            # Применяем трансформацию
            transformed_code = transform_ruby_code(original_code)
            
            # Создаем структуру директорий в выходной папке
            rel_path = Path(file_info['file'])
            output_file = output_dir / rel_path
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            # Записываем трансформированный файл
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(transformed_code)
            
            transformed_files.append({
                'original': file_info['full_path'],
                'transformed': str(output_file),
                'methods_count': len(file_info['methods']),
                'status': 'success'
            })
            
            print(f"Transformed: {file_info['file']} -> {output_file}")
            
        except Exception as e:
            print(f"Error transforming {file_info['file']}: {e}")
            transformed_files.append({
                'original': file_info['full_path'],
                'transformed': None,
                'methods_count': len(file_info['methods']),
                'status': 'error',
                'error': str(e)
            })
    
    # Создание отчета
    report = {
        'project_path': str(project_path),
        'output_dir': str(output_dir),
        'total_files': len(files_info),
        'transformed_files': len([f for f in transformed_files if f['status'] == 'success']),
        'failed_files': len([f for f in transformed_files if f['status'] == 'error']),
        'files': transformed_files,
        'summary': {
            'total_methods': sum(f['methods_count'] for f in transformed_files),
            'files_processed': len(transformed_files)
        }
    }
    
    # Сохранение отчета
    report_file = output_dir / "transformation_report.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print(f"\nTransformation completed!")
    print(f"Output directory: {output_dir}")
    print(f"Files transformed: {report['transformed_files']}/{report['total_files']}")
    print(f"Report saved: {report_file}")
    
    return report


def transform_single_file(input_filename, output_filename=None):
    """Трансформация отдельного файла (оригинальная логика)"""
    # Если файл не имеет расширения .rb, создаем копию с .rb
    if not input_filename.endswith(".rb"):
        rb_filename = input_filename + ".rb"
        try:
            shutil.copy(input_filename, rb_filename)
            print(f"Создан новый файл: {rb_filename}")
            input_filename = rb_filename
        except FileNotFoundError:
            print(f"Ошибка: Файл '{input_filename}' не найден.")
            sys.exit(1)

    try:
        # Читаем исходный Ruby-код из файла
        with open(input_filename, "r", encoding="utf-8") as file:
            ruby_code = file.read()
    except FileNotFoundError:
        print(f"Ошибка: Файл '{input_filename}' не найден.")
        sys.exit(1)

    # Определяем имя выходного файла
    if not output_filename:
        output_filename = "afl_" + os.path.basename(input_filename)

    # Применяем трансформацию
    transformed_code = transform_ruby_code(ruby_code)

    # Записываем результат в новый файл
    with open(output_filename, "w", encoding="utf-8") as file:
        file.write(transformed_code)

    print(f"Трансформация завершена. Результат сохранён в {output_filename}")
    
    return {
        'input_file': input_filename,
        'output_file': output_filename,
        'status': 'success'
    }


def main():
    parser = argparse.ArgumentParser(description="AFL Ruby Transformer")
    parser.add_argument("input", help="Path to Ruby file or project directory")
    parser.add_argument("output", nargs='?', help="Output file or directory")
    parser.add_argument("--project", action="store_true", help="Process entire project directory")
    parser.add_argument("--files", nargs="+", help="Specific files to transform (for project mode)")
    parser.add_argument("--analyze-only", action="store_true", help="Only analyze, don't transform")
    
    args = parser.parse_args()
    
    try:
        if args.project or os.path.isdir(args.input):
            # Режим обработки проекта
            if args.analyze_only:
                files_info = analyze_ruby_files(args.input)
                print(f"Found {len(files_info)} Ruby files:")
                for file_info in files_info:
                    print(f"  {file_info['file']}: {len(file_info['methods'])} methods, {file_info['lines']} lines")
                    for method in file_info['methods'][:3]:
                        params = ', '.join(method['params']) if method['params'] else ''
                        print(f"    - {method['name']}({params}) at line {method['line']}")
            else:
                result = transform_ruby_project(args.input, args.output, args.files)
                print(f"\nProject transformation completed!")
                return result
        else:
            # Режим обработки отдельного файла (оригинальная логика)
            result = transform_single_file(args.input, args.output)
            return result
            
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    # Поддержка оригинального интерфейса для обратной совместимости
    if len(sys.argv) >= 2 and not any(arg.startswith('--') for arg in sys.argv[1:]):
        # Оригинальный интерфейс: python transform.py input_file [output_file]
        input_filename = sys.argv[1]
        output_filename = sys.argv[2] if len(sys.argv) > 2 else None
        transform_single_file(input_filename, output_filename)
    else:
        # Новый интерфейс с argparse
        main()