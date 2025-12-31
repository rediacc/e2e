import { Client, ConnectConfig } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';

export interface SSHClientOptions {
  host: string;
  user: string;
  port?: number;
  keyPath?: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

/**
 * SSH client for executing commands on remote VMs.
 * Used by bridge tests to verify command execution on worker machines.
 */
export class SSHClient {
  private config: ConnectConfig;

  constructor(options: SSHClientOptions) {
    const keyPath = options.keyPath || path.join(process.env.HOME || '', '.ssh', 'id_rsa');

    this.config = {
      host: options.host,
      port: options.port || 22,
      username: options.user,
      privateKey: fs.readFileSync(keyPath),
    };
  }

  /**
   * Execute a command on the remote host.
   * @param command - The shell command to execute
   * @returns Promise with stdout, stderr, and exit code
   */
  async exec(command: string): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let stdout = '';
      let stderr = '';

      conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }

          stream.on('data', (data: Buffer) => {
            stdout += data.toString();
          });

          stream.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });

          stream.on('close', (code: number) => {
            conn.end();
            resolve({ stdout, stderr, code: code || 0 });
          });
        });
      });

      conn.on('error', (err) => {
        reject(err);
      });

      conn.connect(this.config);
    });
  }

  /**
   * Check if a file exists on the remote host.
   * @param filePath - The path to check
   * @returns Promise<boolean>
   */
  async fileExists(filePath: string): Promise<boolean> {
    const result = await this.exec(`test -f "${filePath}" && echo "exists" || echo "not found"`);
    return result.stdout.trim() === 'exists';
  }

  /**
   * Get the content of a file from the remote host.
   * @param filePath - The path to read
   * @returns Promise<string>
   */
  async readFile(filePath: string): Promise<string> {
    const result = await this.exec(`cat "${filePath}"`);
    if (result.code !== 0) {
      throw new Error(`Failed to read file: ${result.stderr}`);
    }
    return result.stdout;
  }
}
