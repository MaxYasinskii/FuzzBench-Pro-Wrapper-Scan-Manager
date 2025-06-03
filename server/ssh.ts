import { spawn } from 'child_process';
import process from 'process';

export interface ExecOptions {
  command: string;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

export async function execCommand(options: ExecOptions): Promise<number> {
  return new Promise((resolve, reject) => {
    const useSSH = !!process.env.SSH_HOST;
    let child;
    if (useSSH) {
      const args: string[] = [];
      if (process.env.SSH_KEY_PATH) {
        args.push('-i', process.env.SSH_KEY_PATH);
      }
      const port = process.env.SSH_PORT || '22';
      args.push('-p', port);
      const user = process.env.SSH_USER || 'root';
      args.push(`${user}@${process.env.SSH_HOST}`, options.command);
      child = spawn('ssh', args);
    } else {
      child = spawn('sh', ['-c', options.command]);
    }

    child.stdout?.on('data', (d) => options.onStdout?.(d.toString()));
    child.stderr?.on('data', (d) => options.onStderr?.(d.toString()));
    child.on('close', (code) => resolve(code ?? 0));
    child.on('error', reject);
  });
}
