#!/usr/bin/env python3
"""
Исправление TypeScript ошибок в проекте
"""

import re
import os

def fix_error_handling(file_path):
    """Исправление обработки ошибок в TypeScript"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Исправление error.message
    content = re.sub(
        r'error\.message',
        'error instanceof Error ? error.message : String(error)',
        content
    )
    
    # Исправление типов ошибок
    content = re.sub(
        r'} catch \(error: any\) {',
        '} catch (error) {',
        content
    )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Fixed error handling in {file_path}")

def fix_storage_types(file_path):
    """Исправление типов в storage.ts"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Исправление типов проектов
    content = re.sub(
        r'projectPath\?\: string \| null \| undefined',
        'projectPath: string | null',
        content
    )
    
    # Исправление типов options
    content = re.sub(
        r'options\?\: string \| null \| undefined',
        'options: string | null',
        content
    )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Fixed types in {file_path}")

def main():
    # Исправляем routes.ts
    if os.path.exists('server/routes.ts'):
        fix_error_handling('server/routes.ts')
    
    # Исправляем storage.ts
    if os.path.exists('server/storage.ts'):
        fix_storage_types('server/storage.ts')
    
    print("All TypeScript errors fixed!")

if __name__ == "__main__":
    main()