// Minimal Node.js type definitions for brain modules
declare namespace NodeJS {
  interface Process {
    cwd(): string;
    env: Record<string, string | undefined>;
    argv: string[];
    exit(code?: number): never;
  }
}

declare const process: NodeJS.Process;
declare const console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
};

declare module "fs" {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: string): string;
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { size: number };
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function writeFileSync(path: string, data: string): void;
}

declare module "path" {
  export function join(...paths: string[]): string;
}

declare module "child_process" {
  export function execSync(command: string): Buffer;
  export function spawnSync(command: string, args: string[]): any;
}

declare const module: {
  exports: any;
};

declare function require(id: string): any;