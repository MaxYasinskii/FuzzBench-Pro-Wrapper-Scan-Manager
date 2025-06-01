
#!/usr/bin/env python3
"""
Простой менеджер инструментов для установки на хост-машине
"""

import subprocess
import sys
import os
import json
from pathlib import Path

class HostToolManager:
    def __init__(self):
        self.tools = {
            'afl++': {
                'install': 'sudo apt-get update && sudo apt-get install -y afl++',
                'check': 'which afl-fuzz'
            },
            'libfuzzer': {
                'install': 'sudo apt-get update && sudo apt-get install -y clang',
                'check': 'which clang'
            },
            'rubocop': {
                'install': 'gem install rubocop',
                'check': 'which rubocop'
            },
            'rubycritic': {
                'install': 'gem install rubycritic',
                'check': 'which rubycritic'
            },
            'semgrep': {
                'install': 'python3 -m pip install semgrep',
                'check': 'which semgrep'
            },
            'bandit': {
                'install': 'python3 -m pip install bandit',
                'check': 'which bandit'
            }
        }

    def run_command(self, command, shell=True):
        """Выполнить команду на хост-машине"""
        try:
            result = subprocess.run(
                command,
                shell=shell,
                capture_output=True,
                text=True,
                timeout=300
            )
            return {
                'returncode': result.returncode,
                'stdout': result.stdout,
                'stderr': result.stderr
            }
        except subprocess.TimeoutExpired:
            return {
                'returncode': 124,
                'stdout': '',
                'stderr': 'Command timed out'
            }
        except Exception as e:
            return {
                'returncode': 1,
                'stdout': '',
                'stderr': str(e)
            }

    def install_tool(self, tool_name):
        """Установить инструмент на хост-машину"""
        if tool_name not in self.tools:
            return {
                'success': False,
                'error': f'Unknown tool: {tool_name}'
            }

        tool_config = self.tools[tool_name]
        
        print(f"Installing {tool_name}...")
        result = self.run_command(tool_config['install'])
        
        if result['returncode'] == 0:
            # Проверяем установку
            check_result = self.run_command(tool_config['check'])
            if check_result['returncode'] == 0:
                return {
                    'success': True,
                    'message': f'{tool_name} installed successfully',
                    'output': result['stdout']
                }
            else:
                return {
                    'success': False,
                    'error': f'{tool_name} installation verification failed'
                }
        else:
            return {
                'success': False,
                'error': result['stderr'],
                'output': result['stdout']
            }

    def run_tool(self, tool_name, target_path, options=None):
        """Запустить инструмент на хост-машине"""
        if tool_name == 'rubocop':
            command = f'rubocop {target_path} --format json'
        elif tool_name == 'rubycritic':
            command = f'rubycritic {target_path}'
        elif tool_name == 'semgrep':
            command = f'semgrep --config=auto {target_path}'
        elif tool_name == 'bandit':
            command = f'bandit -r {target_path} -f json'
        elif tool_name == 'afl++':
            command = f'afl-fuzz -i input -o output {target_path}'
        else:
            command = f'{tool_name} {target_path}'

        print(f"Running {tool_name} on {target_path}...")
        result = self.run_command(command)
        
        return {
            'success': result['returncode'] == 0,
            'output': result['stdout'],
            'error': result['stderr'],
            'tool': tool_name,
            'target': target_path
        }

if __name__ == '__main__':
    manager = HostToolManager()
    
    if len(sys.argv) < 3:
        print("Usage: python3 simple-tool-manager.py <action> <tool_name> [target_path]")
        print("Actions: install, run, check")
        sys.exit(1)
    
    action = sys.argv[1]
    tool_name = sys.argv[2]
    
    if action == 'install':
        result = manager.install_tool(tool_name)
        print(json.dumps(result, indent=2))
    elif action == 'run':
        if len(sys.argv) < 4:
            print("Target path required for run action")
            sys.exit(1)
        target_path = sys.argv[3]
        result = manager.run_tool(tool_name, target_path)
        print(json.dumps(result, indent=2))
    elif action == 'check':
        if tool_name in manager.tools:
            result = manager.run_command(manager.tools[tool_name]['check'])
            print(json.dumps({
                'installed': result['returncode'] == 0,
                'tool': tool_name
            }, indent=2))
        else:
            print(json.dumps({
                'installed': False,
                'error': f'Unknown tool: {tool_name}'
            }, indent=2))
    else:
        print(f"Unknown action: {action}")
        sys.exit(1)
