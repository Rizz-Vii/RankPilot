// 🤖 RankPilot TypeScript Guardian Agent
// Implementation Date: July 30, 2025
// Priority: CRITICAL - Foundation Stabilization Phase 1.1

import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

export interface RankPilotAgent {
    name: string;
    version: string;
    capabilities: AgentCapability[];
    safetyConstraints: SafetyConstraint;
    execute(): Promise<boolean>;
    rollback(): Promise<boolean>;
    validateFix(): Promise<boolean>;
}

/**
 * TypeScript Guardian Agent - Autonomous TypeScript error detection and resolution
 *
 * Critical Issues Targeted:
 * 1. src/components/ui/polymorphic-card.tsx - Motion props conflict
 * 2. src/lib/scaling/connection-pool.ts - Queue type inference issues
 * 3. src/lib/security/security-operations-center.ts - Missing error types
 */
export class TypeScriptGuardianAgent implements RankPilotAgent {
    name = 'TypeScript Guardian';
    version = '1.0.0';

    capabilities: AgentCapability[] = [
        {
            name: 'Motion Props Conflict Resolution',
            description: 'Fix Framer Motion prop conflicts in polymorphic components',
            canAutoFix: true,
            riskLevel: 'low'
        },
        {
            name: 'Generic Type Inference',
            description: 'Resolve TypeScript generic type inference issues',
            canAutoFix: true,
            riskLevel: 'medium'
        },
        {
            name: 'Missing Type Definitions',
            description: 'Add missing error type definitions and imports',
            canAutoFix: true,
            riskLevel: 'low'
        },
        {
            name: 'Strict Mode Compliance',
            description: 'Ensure TypeScript strict mode compliance',
            canAutoFix: true,
            riskLevel: 'medium'
        }
    ];

    safetyConstraints: SafetyConstraint = {
        requiresBackup: true,
        requiresHumanApproval: false, // Auto-approved for low-risk fixes
        rollbackAvailable: true,
        maxConcurrentFixes: 3
    };

    private backupPath = './.typescript-guardian-backups';
    private fixedFiles: string[] = [];

    /**
     * Main execution method - implements systematic debugging approach
     */
    async execute(): Promise<boolean> {
        console.log('🤖 TypeScript Guardian Agent - Starting execution...');

        try {
            // Step 1: Configuration Validation
            await this.validateConfiguration();

            // Step 2: Error Analysis
            const errors = await this.analyzeTypeScriptErrors();
            console.log(`📊 Found ${errors.length} TypeScript errors to resolve`);

            // Step 3: Create backup
            await this.createBackup();

            // Step 4: Apply fixes systematically
            let fixCount = 0;
            for (const error of errors) {
                if (await this.canAutoFix(error)) {
                    console.log(`🔧 Fixing: ${error.file}:${error.line} - ${error.code}`);
                    const success = await this.applyFix(error);
                    if (success) {
                        fixCount++;

                        // Pass error context to validation for potential future heuristics (currently unused)
                        const isValid = await this.validateFix();
                        if (!isValid) {
                            console.warn(`⚠️  Fix validation failed for ${error.file}, rolling back...`);
                            await this.rollbackFile(error.file);
                            fixCount--;
                        }
                    }
                }
            }

            // Step 5: Final validation
            const finalValidation = await this.runTypeScriptCheck();

            if (finalValidation.success) {
                console.log(`✅ TypeScript Guardian completed successfully! Fixed ${fixCount} errors.`);
                await this.logPatternSuccess(errors, fixCount);
                return true;
            } else {
                console.error('❌ Final validation failed, rolling back all changes...');
                await this.rollback();
                return false;
            }

        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error('🚨 TypeScript Guardian execution failed:', err);
            await this.rollback();
            return false;
        }
    }

    /**
     * Configuration validation - Step 1 of systematic debugging
     */
    private async validateConfiguration(): Promise<void> {
        // Validate TypeScript configuration
        const tsconfigPath = './tsconfig.json';
        try {
            await fs.access(tsconfigPath);
            console.log('✅ TypeScript configuration found');
        } catch {
            throw new Error('TypeScript configuration not found');
        }

        // Validate project structure
        const requiredDirs = ['./src', './src/components', './src/lib'];
        for (const dir of requiredDirs) {
            try {
                await fs.access(dir);
            } catch {
                throw new Error(`Required directory not found: ${dir}`);
            }
        }

        console.log('✅ Configuration validation complete');
    }

    /**
     * Error analysis - Step 2 of systematic debugging
     */
    private async analyzeTypeScriptErrors(): Promise<TypeScriptError[]> {
        try {
            // Run typecheck; we intentionally ignore stdout/stderr content when successful
            await execAsync('npm run typecheck');
            // If typecheck passes, no errors to fix
            return [];
        } catch (error: unknown) {
            // Extract compiler output from thrown error
            let out = '';
            if (typeof error === 'object' && error !== null) {
                const e = error as { stdout?: unknown; stderr?: unknown };
                out = String(e.stdout || e.stderr || '');
            }
            return this.parseTypeScriptErrors(out);
        }
    }

    /**
     * Parse TypeScript compiler output into structured errors
     */
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

    /**
     * Create backup before making changes
     */
    private async createBackup(): Promise<void> {
        try {
            await fs.mkdir(this.backupPath, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            // Backup files that will be modified
            const filesToBackup = [
                'src/components/ui/polymorphic-card.tsx',
                'src/lib/scaling/connection-pool.ts',
                'src/lib/security/security-operations-center.ts'
            ];

            for (const file of filesToBackup) {
                try {
                    const content = await fs.readFile(file, 'utf8');
                    const backupFile = path.join(this.backupPath, `${timestamp}-${path.basename(file)}`);
                    await fs.writeFile(backupFile, content);
                    console.log(`📁 Backed up: ${file}`);
                } catch (error: unknown) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    console.warn(`⚠️  Could not backup ${file}:`, err);
                }
            }
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error('Failed to create backup:', err);
            throw err;
        }
    }

    /**
     * Check if error can be auto-fixed
     */
    private async canAutoFix(error: TypeScriptError): Promise<boolean> {
        // Known fixable patterns
        const fixablePatterns = [
            'TS2322', // Type assignment issues
            'TS2345', // Argument type issues
            'TS2339', // Property does not exist
            'TS2304', // Cannot find name
            'TS18046' // Type unknown issues
        ];

        return fixablePatterns.includes(error.code);
    }

    /**
     * Apply fix for specific error
     */
    private async applyFix(error: TypeScriptError): Promise<boolean> {
        try {
            switch (error.file) {
                case 'src/components/ui/polymorphic-card.tsx':
                    return await this.fixPolymorphicCardMotionProps();

                case 'src/lib/scaling/connection-pool.ts':
                    return await this.fixConnectionPoolTypes();

                case 'src/lib/security/security-operations-center.ts':
                    return await this.fixSecurityCenterTypes();

                default:
                    console.log(`🔍 Unknown file for auto-fix: ${error.file}`);
                    return false;
            }
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(`❌ Failed to apply fix:`, err);
            return false;
        }
    }

    /**
     * Fix Motion props conflict in polymorphic-card.tsx
     */
    private async fixPolymorphicCardMotionProps(): Promise<boolean> {
        const filePath = 'src/components/ui/polymorphic-card.tsx';

        try {
            let content = await fs.readFile(filePath, 'utf8');

            // Fix: Exclude conflicting HTML event handlers from motion props
            const motionPropsPattern = /const\s+motionProps\s*=\s*{\s*([^}]+)\s*}/;
            const match = content.match(motionPropsPattern);

            if (match) {
                const newMotionProps = `const motionProps = {
        ...rest,
        // Exclude HTML drag events that conflict with Framer Motion
        onDrag: undefined,
        onDragEnd: undefined,
        onDragStart: undefined,
        onDrop: undefined,
        onDragEnter: undefined,
        onDragLeave: undefined,
        onDragOver: undefined,
    } as HTMLMotionProps<typeof Comp>`;

                content = content.replace(motionPropsPattern, newMotionProps);
                await fs.writeFile(filePath, content);
                this.fixedFiles.push(filePath);
                return true;
            }

            return false;
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error('Failed to fix polymorphic-card motion props:', err);
            return false;
        }
    }

    /**
     * Fix connection pool type inference issues
     */
    private async fixConnectionPoolTypes(): Promise<boolean> {
        const filePath = 'src/lib/scaling/connection-pool.ts';

        try {
            let content = await fs.readFile(filePath, 'utf8');

            // Add proper queue item interface
            const queueInterface = `
interface QueueItem {
    endpoint: string;
    options: RequestInit;
    resolve: (value: unknown) => void;
    reject: (reason?: any) => void;
}
`;

            // Insert interface at the top of the file after imports
            const importEndIndex = content.lastIndexOf('import');
            if (importEndIndex !== -1) {
                const lineEnd = content.indexOf('\n', importEndIndex);
                content = content.slice(0, lineEnd + 1) + queueInterface + content.slice(lineEnd + 1);
            }

            // Fix queue declaration
            content = content.replace(
                /private\s+queue:\s*[^;]+;/,
                'private queue: QueueItem[] = [];'
            );

            await fs.writeFile(filePath, content);
            this.fixedFiles.push(filePath);
            return true;
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error('Failed to fix connection pool types:', err);
            return false;
        }
    }

    /**
     * Fix security center missing error types
     */
    private async fixSecurityCenterTypes(): Promise<boolean> {
        const filePath = 'src/lib/security/security-operations-center.ts';

        try {
            let content = await fs.readFile(filePath, 'utf8');

            // Add missing error type definitions
            const errorTypes = `
// Custom error types for security operations
class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}

class DataCorruptionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DataCorruptionError';
    }
}
`;

            // Insert error types after imports
            const importEndIndex = content.lastIndexOf('import');
            if (importEndIndex !== -1) {
                const lineEnd = content.indexOf('\n', importEndIndex);
                content = content.slice(0, lineEnd + 1) + errorTypes + content.slice(lineEnd + 1);
            }

            // Fix error handling with proper type checking
            content = content.replace(
                /error\.message/g,
                '(error as Error).message'
            );

            await fs.writeFile(filePath, content);
            this.fixedFiles.push(filePath);
            return true;
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error('Failed to fix security center types:', err);
            return false;
        }
    }

    /**
     * Validate fix by running TypeScript check
     */
    async validateFix(): Promise<boolean> {
        try {
            const result = await this.runTypeScriptCheck();
            return result.success || result.errorCount < result.previousErrorCount;
        } catch (err: unknown) {
            // Swallow validation errors; return false to trigger rollback logic upstream
            const _msg = err instanceof Error ? err.message : String(err); // intentional underscore to avoid unused var lint
            return false;
        }
    }

    /**
     * Run TypeScript check and return results
     */
    private async runTypeScriptCheck(): Promise<{ success: boolean, errorCount: number, previousErrorCount: number; }> {
        try {
            await execAsync('npm run typecheck');
            return { success: true, errorCount: 0, previousErrorCount: 11 };
        } catch (error: unknown) {
            let stdout = '';
            let stderr = '';
            if (typeof error === 'object' && error !== null) {
                const e = error as { stdout?: unknown; stderr?: unknown };
                stdout = String(e.stdout ?? '');
                stderr = String(e.stderr ?? '');
            }
            const output = stdout || stderr;
            const errors = this.parseTypeScriptErrors(output);
            return { success: false, errorCount: errors.length, previousErrorCount: 11 };
        }
    }

    /**
     * Rollback all changes
     */
    async rollback(): Promise<boolean> {
        console.log('🔄 Rolling back TypeScript Guardian changes...');

        try {
            // Restore from git if possible
            await execAsync('git checkout HEAD -- src/components/ui/polymorphic-card.tsx src/lib/scaling/connection-pool.ts src/lib/security/security-operations-center.ts');
            console.log('✅ Rollback completed via git checkout');
            return true;
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error('❌ Rollback failed:', err);
            return false;
        }
    }

    /**
     * Rollback specific file
     */
    private async rollbackFile(filePath: string): Promise<boolean> {
        try {
            await execAsync(`git checkout HEAD -- ${filePath}`);
            console.log(`✅ Rolled back: ${filePath}`);
            return true;
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(`❌ Failed to rollback ${filePath}:`, err);
            return false;
        }
    }

    /**
     * Log successful pattern for future learning
     */
    private async logPatternSuccess(errors: TypeScriptError[], fixCount: number): Promise<void> {
        const pattern = {
            timestamp: new Date().toISOString(),
            agent: this.name,
            errorsFound: errors.length,
            errorsFixed: fixCount,
            successRate: (fixCount / errors.length) * 100,
            patterns: errors.map(e => ({ code: e.code, file: path.basename(e.file) }))
        };

        console.log('📈 Pattern logged for autonomous learning:', pattern);

        // Could store this in a learning database for future pattern recognition
        // await this.storePattern(pattern);
    }
}

// Export singleton instance for immediate use
export const typeScriptGuardian = new TypeScriptGuardianAgent();
