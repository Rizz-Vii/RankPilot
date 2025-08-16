import fs from 'fs';
import path from 'path';

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

export const QUEUE_FILE = path.resolve(process.cwd(), 'sessions/aider-queue.jsonl');

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
    const lines = fs.readFileSync(QUEUE_FILE, 'utf8').trim().split(/\n/).filter(l => l.trim() && !l.includes('"meta"'));
    return lines.map(l => {
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
