// Basic Node.js types for brain module
declare namespace NodeJS {
  interface Process {
    argv: string[];
    env: { [key: string]: string | undefined };
    cwd(): string;
    exit(code?: number): never;
  }
}

declare var process: NodeJS.Process;
declare var console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
};

declare var require: (id: string) => any;
declare var module: {
  exports: any;
};

declare var setTimeout: (callback: () => void, delay: number) => any;

declare module 'fs' {
  export function readFileSync(path: string, encoding?: string): string | Buffer;
  export function writeFileSync(path: string, data: string | Buffer): void;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function existsSync(path: string): boolean;
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { isDirectory(): boolean; isFile(): boolean };
}

declare module 'path' {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
  export function basename(path: string): string;
  export function extname(path: string): string;
}

declare module 'child_process' {
  export function execSync(command: string, options?: any): Buffer;
  export function spawnSync(command: string, args?: string[], options?: any): any;
}

declare module 'openai' {
  export default class OpenAI {
    constructor(config: { apiKey: string });
    chat: {
      completions: {
        create(params: {
          model: string;
          messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
          temperature?: number;
          max_tokens?: number;
        }): Promise<{
          choices: Array<{
            message: {
              content: string;
            };
          }>;
        }>;
      };
    };
  }
}