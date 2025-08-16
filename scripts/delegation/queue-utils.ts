import fs from 'fs';
import path from 'path';
import os from 'os';

export interface DelegationQueueTask {
    taskId: string;
    summary: string;
    files: string[];
    status: 'pending' | 'running' | 'done' | 'failed';
    createdAt: string; // ISO
    updatedAt: string; // ISO
    aideModel?: string;
    notes?: string;
}

export interface DelegationLock {
    pid: number;
    hostname: string;
    taskId: string;
    timestamp: string; // ISO
    expiresAt: string; // ISO
}

export const QUEUE_FILE = path.resolve(process.cwd(), 'sessions/aider-queue.jsonl');
export const LOCK_FILE = path.resolve(process.cwd(), 'sessions/aider-delegation.lock');

export function ensureQueueFile() {
    if (!fs.existsSync(path.dirname(QUEUE_FILE))) {
        fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true });
    }
    if (!fs.existsSync(QUEUE_FILE)) {
        fs.writeFileSync(
            QUEUE_FILE,
            JSON.stringify({ meta: 'delegation queue (JSON Lines). Each line: pending task.' }) + '\n',
            'utf8'
        );
    }
}

export function readQueue(): DelegationQueueTask[] {
    ensureQueueFile();
    const lines = fs.readFileSync(QUEUE_FILE, 'utf8').trim().split(/\n/).filter((l: string) => l.trim() && !l.includes('"meta"'));
    return lines.map((l: string) => {
        try {
            return JSON.parse(l) as DelegationQueueTask;
        } catch {
            return null as any;
        }
    }).filter(Boolean);
}

export function appendTask(task: DelegationQueueTask) {
    ensureQueueFile();
    fs.appendFileSync(QUEUE_FILE, JSON.stringify(task) + '\n');
}

export function writeQueue(tasks: DelegationQueueTask[]) {
    ensureQueueFile();
    const header = JSON.stringify({ meta: 'delegation queue (JSON Lines). Each line: pending task.' });
    const body = tasks.map(t => JSON.stringify(t)).join('\n');
    fs.writeFileSync(QUEUE_FILE, header + '\n' + body + (body ? '\n' : ''), 'utf8');
}

// Lockfile management functions
export function createLock(taskId: string, expiryMinutes: number = 30): boolean {
    try {
        if (isLocked()) {
            return false; // Already locked
        }
        
        const now = new Date();
        const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);
        
        const lock: DelegationLock = {
            pid: process.pid,
            hostname: os.hostname(),
            taskId,
            timestamp: now.toISOString(),
            expiresAt: expiresAt.toISOString()
        };
        
        // Ensure sessions directory exists
        if (!fs.existsSync(path.dirname(LOCK_FILE))) {
            fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
        }
        
        // Atomic write using temp file
        const tempFile = LOCK_FILE + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(lock, null, 2));
        fs.renameSync(tempFile, LOCK_FILE);
        
        return true;
    } catch (error) {
        console.error('[lockfile] Failed to create lock:', error);
        return false;
    }
}

export function isLocked(): boolean {
    try {
        if (!fs.existsSync(LOCK_FILE)) {
            return false;
        }
        
        const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8')) as DelegationLock;
        const now = new Date();
        const expiresAt = new Date(lockData.expiresAt);
        
        if (now > expiresAt) {
            // Lock expired, clean it up
            cleanupLock();
            return false;
        }
        
        return true;
    } catch (error) {
        // Corrupted lock file, clean it up
        cleanupLock();
        return false;
    }
}

export function getLock(): DelegationLock | null {
    try {
        if (!fs.existsSync(LOCK_FILE)) {
            return null;
        }
        
        const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8')) as DelegationLock;
        const now = new Date();
        const expiresAt = new Date(lockData.expiresAt);
        
        if (now > expiresAt) {
            // Lock expired, clean it up
            cleanupLock();
            return null;
        }
        
        return lockData;
    } catch (error) {
        // Corrupted lock file, clean it up
        cleanupLock();
        return null;
    }
}

export function releaseLock(): boolean {
    try {
        if (fs.existsSync(LOCK_FILE)) {
            fs.unlinkSync(LOCK_FILE);
        }
        return true;
    } catch (error) {
        console.error('[lockfile] Failed to release lock:', error);
        return false;
    }
}

export function cleanupLock(): void {
    try {
        if (fs.existsSync(LOCK_FILE)) {
            fs.unlinkSync(LOCK_FILE);
        }
    } catch (error) {
        // Silent cleanup failure
    }
}
