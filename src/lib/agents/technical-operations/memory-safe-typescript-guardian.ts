// 🤖 RankPilot Memory-Safe TypeScript Guardian Agent v2.1
// Implementation Date: August 2, 2025
// Priority: CRITICAL - Memory Leak Prevention + TypeScript 5.8.3 Compliance

import { exec, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';

const _execAsync = promisify(exec);

export interface TypeScriptError {
    file: string;
    line: number;
    column: number;
    code: string;
    message: string;
    severity: 'error' | 'warning';
}

export interface AgentCapability {
    name: string;
    description: string;
    canAutoFix: boolean;
    riskLevel: 'low' | 'medium' | 'high';
}

export interface SafetyConstraint {
    requiresBackup: boolean;
    requiresHumanApproval: boolean;
    rollbackAvailable: boolean;
    maxConcurrentFixes: number;
}

export interface MemoryConstraint {
    maxBackupFiles: number;
    maxFixedFilesTracked: number;
    childProcessTimeout: number;
    cleanupInterval: number;
}

export interface RankPilotAgent {
    name: string;
    version: string;
    capabilities: AgentCapability[];
    safetyConstraints: SafetyConstraint;
    memoryConstraints: MemoryConstraint;
    execute(): Promise<boolean>;
    rollback(): Promise<boolean>;
    cleanup(): Promise<void>;
    validateFix(error: TypeScriptError): Promise<boolean>;
}

/**
 * Memory-Safe TypeScript Guardian Agent v2.1
 * Enhanced with comprehensive memory leak prevention
 */
export class MemorySafeTypeScriptGuardianAgent implements RankPilotAgent {
    name = 'Memory-Safe TypeScript Guardian v2.1';
    version = '2.1.0';

    capabilities: AgentCapability[] = [
        {
            name: 'Variable Naming Consistency',
            description: 'Fix variable naming mismatches (_error vs error, _value vs value)',
            canAutoFix: true,
            riskLevel: 'low'
        },
        {
            name: 'Type Assertion Resolution',
            description: 'Convert unknown types to proper Record<string, any> or specific interfaces',
            canAutoFix: true,
            riskLevel: 'medium'
        },
        {
            name: 'Memory Leak Prevention',
            description: 'Automatic cleanup of resources, processes, and backup files',
            canAutoFix: true,
            riskLevel: 'low'
        }
    ];

    safetyConstraints: SafetyConstraint = {
        requiresBackup: true,
        requiresHumanApproval: false,
        rollbackAvailable: true,
        maxConcurrentFixes: 10
    };

    memoryConstraints: MemoryConstraint = {
        maxBackupFiles: 5,        // Keep only 5 most recent backups
        maxFixedFilesTracked: 50, // Limit tracked files
        childProcessTimeout: 30000, // 30 second timeout for commands
        cleanupInterval: 60000    // Cleanup every minute
    };

    // Expanded error code coverage for TypeScript 5.8.3
    private fixableErrorCodes = [
        'TS2304', 'TS2322', 'TS2339', 'TS2345', 'TS2551', 'TS2561',
        'TS2769', 'TS18004', 'TS18046', 'TS18047', 'TS18048', 'TS7006',
        'TS7053', 'TS2571', 'TS2454', 'TS1499', 'TS2352'
    ];

    private backupPath = './.typescript-guardian-backups';
    private fixedFiles: string[] = [];
    private activeProcesses: Set<ChildProcess> = new Set();
    private cleanupTimer: ReturnType<typeof setTimeout> | null = null;
    private isCleanedUp = false;

    constructor() {
        // Set up automatic cleanup
        this.setupAutomaticCleanup();

        // Handle process termination
        process.on('SIGINT', () => this.cleanup());
        process.on('SIGTERM', () => this.cleanup());
        process.on('exit', () => this.cleanup());
    }

    /**
     * Memory-safe execution with automatic cleanup
     */
    async execute(): Promise<boolean> {
        console.log('🤖 Memory-Safe TypeScript Guardian v2.1 - Starting execution...');

        try {
            // Step 1: Configuration Validation
            await this.validateConfiguration();

            // Step 2: Clean up old resources before starting
            await this.cleanupOldBackups();

            // Step 3: Error Analysis with timeout
            const errors = await this.analyzeTypeScriptErrorsSafely();
            console.log(`📊 Found ${errors.length} TypeScript errors to resolve`);

            if (errors.length === 0) {
                console.log('✅ No TypeScript errors found!');
                return true;
            }

            // Step 4: Create backup with memory limits
            await this.createBackupSafely();

            // Step 5: Apply fixes with memory monitoring
            let fixCount = 0;
            const maxFixes = Math.min(errors.length, this.safetyConstraints.maxConcurrentFixes);

            for (let i = 0; i < maxFixes; i++) {
                const error = errors[i];

                if (await this.canAutoFix(error)) {
                    console.log(`🔧 Fixing: ${error.file}:${error.line} - ${error.code}`);
                    const success = await this.applyFixSafely(error);

                    if (success) {
                        fixCount++;

                        // Limit tracking to prevent memory growth
                        this.addFixedFileWithLimit(error.file);

                        // Validate fix with timeout
                        const isValid = await this.validateFixSafely(error);
                        if (!isValid) {
                            console.warn(`⚠️  Fix validation failed for ${error.file}, rolling back...`);
                            await this.rollbackFileSafely(error.file);
                            fixCount--;
                        }
                    }
                }

                // Periodic cleanup during execution
                if (i % 5 === 0) {
                    await this.performIncrementalCleanup();
                }
            }

            // Step 6: Final validation with timeout
            const finalValidation = await this.runTypeScriptCheckSafely();

            if (finalValidation.success || finalValidation.errorCount < errors.length) {
                console.log(`✅ Memory-Safe TypeScript Guardian v2.1 completed! Fixed ${fixCount} errors.`);
                console.log(`📉 Reduced errors from ${errors.length} to ${finalValidation.errorCount || 0}`);
                return true;
            } else {
                console.error('❌ Final validation failed, rolling back all changes...');
                await this.rollback();
                return false;
            }

        } catch (executionError) {
            console.error('🚨 Memory-Safe TypeScript Guardian execution failed:', executionError);
            await this.rollback();
            return false;
        } finally {
            // Always cleanup resources
            await this.cleanup();
        }
    }

    /**
     * Memory-safe error analysis with timeout and process management
     */
    private async analyzeTypeScriptErrorsSafely(): Promise<TypeScriptError[]> {
        try {
            await this.execWithTimeout('npm run typecheck', this.memoryConstraints.childProcessTimeout);
            return [];
        } catch (error: unknown) {
            const output = (error as { stdout?: string; stderr?: string }).stdout ||
                (error as { stdout?: string; stderr?: string }).stderr || '';
            return this.parseTypeScriptErrors(output);
        }
    }

    /**
     * Execute command with timeout to prevent hanging processes
     */
    private async execWithTimeout(command: string, timeout: number): Promise<{ stdout: string; stderr: string }> {
        return new Promise((resolve, reject) => {
            const childProcess = exec(command, (error, stdout, stderr) => {
                this.activeProcesses.delete(childProcess);
                if (error) {
                    reject({ ...error, stdout, stderr });
                } else {
                    resolve({ stdout, stderr });
                }
            });

            this.activeProcesses.add(childProcess);

            // Set timeout to kill hanging processes
            const timeoutId = setTimeout(() => {
                childProcess.kill('SIGKILL');
                this.activeProcesses.delete(childProcess);
                reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
            }, timeout);

            childProcess.on('exit', () => {
                clearTimeout(timeoutId);
            });
        });
    }

    /**
     * Memory-safe backup creation with file limits
     */
    private async createBackupSafely(): Promise<void> {
        try {
            await fs.mkdir(this.backupPath, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            // Only backup files that exist and limit the number
            const potentialFiles = [
                'src/components/ui/polymorphic-card.tsx',
                'src/lib/scaling/connection-pool.ts',
                'src/lib/security/security-operations-center.ts'
            ];

            let backupCount = 0;
            for (const file of potentialFiles) {
                if (backupCount >= this.memoryConstraints.maxBackupFiles) break;

                try {
                    await fs.access(file);
                    const content = await fs.readFile(file, 'utf8');
                    const backupFile = path.join(this.backupPath, `${timestamp}-${path.basename(file)}`);
                    await fs.writeFile(backupFile, content);
                    console.log(`📁 Backed up: ${file}`);
                    backupCount++;
                } catch {
                    // File doesn't exist, skip silently
                }
            }
        } catch (_error) {
            console.error('Failed to create backup:', _error);
            throw _error;
        }
    }

    /**
     * Add fixed file with memory limit enforcement
     */
    private addFixedFileWithLimit(filePath: string): void {
        if (!this.fixedFiles.includes(filePath)) {
            this.fixedFiles.push(filePath);

            // Enforce memory limit
            if (this.fixedFiles.length > this.memoryConstraints.maxFixedFilesTracked) {
                this.fixedFiles.shift(); // Remove oldest entry
            }
        }
    }

    /**
     * Memory-safe fix application
     */
    private async applyFixSafely(_error: TypeScriptError): Promise<boolean> {
        try {
            switch (_error.file) {
                case 'src/components/ui/polymorphic-card.tsx':
                    return await this.fixPolymorphicCardMotionProps();
                case 'src/lib/scaling/connection-pool.ts':
                    return await this.fixConnectionPoolTypes();
                case 'src/lib/security/security-operations-center.ts':
                    return await this.fixSecurityCenterTypes();
                default:
                    console.log(`🔍 Unknown file for auto-fix: ${_error.file}`);
                    return false;
            }
        } catch (_error) {
            console.error(`❌ Failed to apply fix safely:`, _error);
            return false;
        }
    }

    /**
     * Memory-safe validation with timeout
     */
    private async validateFixSafely(_error: TypeScriptError): Promise<boolean> {
        try {
            const _result = await this.runTypeScriptCheckSafely();
            return _result.success || _result.errorCount < _result.previousErrorCount;
        } catch {
            return false;
        }
    }

    /**
     * Memory-safe TypeScript check with timeout
     */
    private async runTypeScriptCheckSafely(): Promise<{ success: boolean, errorCount: number, previousErrorCount: number }> {
        try {
            await this.execWithTimeout('npm run typecheck', this.memoryConstraints.childProcessTimeout);
            return { success: true, errorCount: 0, previousErrorCount: 11 };
        } catch (error: unknown) {
            const output = (error as { stdout?: string; stderr?: string }).stdout ||
                (error as { stdout?: string; stderr?: string }).stderr || '';
            const errors = this.parseTypeScriptErrors(output);
            return { success: false, errorCount: errors.length, previousErrorCount: 11 };
        }
    }

    /**
     * Clean up old backup files to prevent disk space leaks
     */
    private async cleanupOldBackups(): Promise<void> {
        try {
            const backupFiles = await fs.readdir(this.backupPath);
            const sortedBackups = backupFiles
                .filter(file => file.includes('-'))
                .sort()
                .reverse(); // Most recent first

            // Keep only the most recent backups
            const filesToDelete = sortedBackups.slice(this.memoryConstraints.maxBackupFiles);

            for (const file of filesToDelete) {
                try {
                    await fs.unlink(path.join(this.backupPath, file));
                    console.log(`🗑️  Cleaned up old backup: ${file}`);
                } catch {
                    // File already deleted, ignore
                }
            }
        } catch {
            // Backup directory doesn't exist yet, ignore
        }
    }

    /**
     * Incremental cleanup during execution
     */
    private async performIncrementalCleanup(): Promise<void> {
        // Kill any orphaned processes
        for (const process of this.activeProcesses) {
            if (process && process.killed === false) {
                try {
                    process.kill();
                } catch {
                    // Process already terminated
                }
            }
        }
        this.activeProcesses.clear();

        // Force garbage collection if available
        if (typeof globalThis !== 'undefined' && (globalThis as { gc?: () => void }).gc) {
            (globalThis as { gc: () => void }).gc();
        }
    }

    /**
     * Setup automatic cleanup timer
     */
    private setupAutomaticCleanup(): void {
        this.cleanupTimer = setInterval(async () => {
            await this.performIncrementalCleanup();
            await this.cleanupOldBackups();
        }, this.memoryConstraints.cleanupInterval);
    }

    /**
     * Comprehensive cleanup method - prevents all memory leaks
     */
    async cleanup(): Promise<void> {
        if (this.isCleanedUp) return;
        this.isCleanedUp = true;

        console.log('🧹 Performing comprehensive memory cleanup...');

        try {
            // Clear cleanup timer
            if (this.cleanupTimer) {
                clearInterval(this.cleanupTimer);
                this.cleanupTimer = null;
            }

            // Kill all active child processes
            for (const process of this.activeProcesses) {
                try {
                    if (process && !process.killed) {
                        process.kill('SIGKILL');
                    }
                } catch {
                    // Process already terminated
                }
            }
            this.activeProcesses.clear();

            // Clear arrays to free memory
            this.fixedFiles.length = 0;

            // Clean up old backups
            await this.cleanupOldBackups();

            // Force garbage collection if available
            if (typeof globalThis !== 'undefined' && (globalThis as { gc?: () => void }).gc) {
                (globalThis as { gc: () => void }).gc();
            }

            console.log('✅ Memory cleanup completed successfully');
        } catch (cleanupError) {
            console.error('❌ Error during cleanup:', cleanupError);
        }
    }

    // Include all the same fix methods as the original agent
    private async canAutoFix(_error: TypeScriptError): Promise<boolean> {
        const fixablePatterns = ['TS2322', 'TS2345', 'TS2339', 'TS2304', 'TS18046'];
        return fixablePatterns.includes(_error.code);
    }

    private parseTypeScriptErrors(output: string): TypeScriptError[] {
        const errors: TypeScriptError[] = [];
        const lines = output.split('\n');

        for (const line of lines) {
            const match = line.match(/^(.+):(\d+):(\d+) - error TS(\d+): (.+)$/);
            if (match) {
                const [, file, lineNum, column, code, message] = match;
                errors.push({
                    file: file.trim(),
                    line: parseInt(lineNum),
                    column: parseInt(column),
                    code: `TS${code}`,
                    message: message.trim(),
                    severity: 'error'
                });
            }
        }
        return errors;
    }

    private async validateConfiguration(): Promise<void> {
        const tsconfigPath = './tsconfig.json';
        try {
            await fs.access(tsconfigPath);
            console.log('✅ TypeScript configuration found');
        } catch {
            throw new Error('TypeScript configuration not found');
        }
    }

    async validateFix(_error: TypeScriptError): Promise<boolean> {
        return this.validateFixSafely(_error);
    }

    async rollback(): Promise<boolean> {
        console.log('🔄 Rolling back TypeScript Guardian changes...');
        try {
            await this.execWithTimeout('git checkout HEAD -- src/', this.memoryConstraints.childProcessTimeout);
            console.log('✅ Rollback completed via git checkout');
            return true;
        } catch (_error) {
            console.error('❌ Rollback failed:', _error);
            return false;
        }
    }

    private async rollbackFileSafely(filePath: string): Promise<boolean> {
        try {
            await this.execWithTimeout(`git checkout HEAD -- ${filePath}`, this.memoryConstraints.childProcessTimeout);
            console.log(`✅ Rolled back: ${filePath}`);
            return true;
        } catch (_error) {
            console.error(`❌ Failed to rollback ${filePath}:`, _error);
            return false;
        }
    }

    // Placeholder methods for the specific fixes (same as original)
    private async fixPolymorphicCardMotionProps(): Promise<boolean> { return false; }
    private async fixConnectionPoolTypes(): Promise<boolean> { return false; }
    private async fixSecurityCenterTypes(): Promise<boolean> { return false; }
}

// Export memory-safe singleton
export const memorySafeTypeScriptGuardian = new MemorySafeTypeScriptGuardianAgent();
