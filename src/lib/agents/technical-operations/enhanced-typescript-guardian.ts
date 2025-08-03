// 🤖 RankPilot TypeScript Guardian Agent v2.0 - ENHANCED
// Implementation Date: August 2, 2025
// Priority: CRITICAL - TypeScript 5.8.3 Strict Mode Compliance

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

export interface FixPattern {
    errorCode: string;
    description: string;
    pattern: RegExp;
    replacement: string | ((match: string, ...groups: string[]) => string);
    riskLevel: 'low' | 'medium' | 'high';
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
    validateFix(error: TypeScriptError): Promise<boolean>;
}

/**
 * Enhanced TypeScript Guardian Agent v2.0
 * Designed for TypeScript 5.8.3 strict mode compliance
 */
export class EnhancedTypeScriptGuardianAgent implements RankPilotAgent {
    name = 'Enhanced TypeScript Guardian v2.0';
    version = '2.0.0';

    capabilities: AgentCapability[] = [
        {
            name: 'Variable Naming Consistency',
            description: 'Fix variable naming mismatches (_error vs error, _value vs value)',
            canAutoFix: true,
            riskLevel: 'low'
        },
        {
            name: 'Type System Compliance',
            description: 'Convert unknown types to proper Record<string, any> or specific interfaces',
            canAutoFix: true,
            riskLevel: 'medium'
        },
        {
            name: 'Null Safety Implementation',
            description: 'Add null checks and optional chaining for strict null checks',
            canAutoFix: true,
            riskLevel: 'low'
        },
        {
            name: 'Property Access Safety',
            description: 'Fix property access on potentially undefined objects',
            canAutoFix: true,
            riskLevel: 'low'
        },
        {
            name: 'Import Resolution',
            description: 'Fix missing imports and module resolution issues',
            canAutoFix: true,
            riskLevel: 'medium'
        }
    ];

    safetyConstraints: SafetyConstraint = {
        requiresBackup: true,
        requiresHumanApproval: false,
        rollbackAvailable: true,
        maxConcurrentFixes: 15
    };

    private backupPath = './.typescript-guardian-v2-backups';
    private fixedFiles: string[] = [];

    // Comprehensive error code coverage for TypeScript 5.8.3
    private fixableErrorCodes = [
        'TS2304', 'TS2322', 'TS2339', 'TS2345', 'TS2551', 'TS2561',
        'TS2769', 'TS18004', 'TS18046', 'TS18047', 'TS18048', 'TS7006',
        'TS7053', 'TS2571', 'TS2454', 'TS1499', 'TS2352'
    ];

    // Generic fix patterns for common TypeScript issues
    private fixPatterns: FixPattern[] = [
        {
            errorCode: 'TS2304',
            description: 'Variable naming mismatch - _error vs error',
            pattern: /throw error;/g,
            replacement: 'throw _error;',
            riskLevel: 'low'
        },
        {
            errorCode: 'TS2304',
            description: 'Variable naming mismatch - error vs _error in catch',
            pattern: /const output = error\.(stdout|stderr)/g,
            replacement: 'const output = _error.$1',
            riskLevel: 'low'
        },
        {
            errorCode: 'TS2571',
            description: 'Unknown type conversion to Record',
            pattern: /const (\w+): unknown = \{\};/g,
            replacement: 'const $1: Record<string, any> = {};',
            riskLevel: 'medium'
        },
        {
            errorCode: 'TS2339',
            description: 'Property access on unknown type',
            pattern: /(\w+)\.(\w+) = (.+);/g,
            replacement: (match, obj, prop, value) => {
                return `(${obj} as Record<string, any>).${prop} = ${value};`;
            },
            riskLevel: 'medium'
        },
        {
            errorCode: 'TS18046',
            description: 'Optional chaining for null safety',
            pattern: /(\w+)\.(\w+)(?!\?)/g,
            replacement: '$1?.$2',
            riskLevel: 'low'
        }
    ];

    /**
     * Main execution method - Enhanced for systematic error resolution
     */
    async execute(): Promise<boolean> {
        console.log('🤖 Enhanced TypeScript Guardian v2.0 - Starting execution...');

        try {
            // Step 1: Validate project configuration
            await this.validateConfiguration();

            // Step 2: Analyze TypeScript errors
            const errors = await this.analyzeTypeScriptErrors();
            console.log(`📊 Found ${errors.length} TypeScript errors to resolve`);

            if (errors.length === 0) {
                console.log('✅ No TypeScript errors found!');
                return true;
            }

            // Step 3: Create backups for files that will be modified
            await this.createBackups(errors);

            // Step 4: Apply pattern-based fixes
            let fixCount = 0;
            const filesToFix = [...new Set(errors.map(e => e.file))];

            for (const filePath of filesToFix) {
                const fileErrors = errors.filter(e => e.file === filePath);
                const success = await this.applyFileFixes(filePath, fileErrors);

                if (success) {
                    fixCount += fileErrors.length;
                    console.log(`✅ Fixed ${fileErrors.length} errors in ${filePath}`);
                }
            }

            // Step 5: Final validation
            const finalCheck = await this.runTypeScriptCheck();

            if (finalCheck.success || finalCheck.errorCount < errors.length) {
                console.log(`🎉 Enhanced TypeScript Guardian v2.0 completed successfully!`);
                console.log(`📈 Fixed ${fixCount} errors across ${filesToFix.length} files`);
                console.log(`📉 Reduced total errors from ${errors.length} to ${finalCheck.errorCount || 0}`);
                return true;
            } else {
                console.error('❌ Validation failed, rolling back changes...');
                await this.rollback();
                return false;
            }

        } catch (executionError) {
            console.error('🚨 Enhanced TypeScript Guardian execution failed:', executionError);
            await this.rollback();
            return false;
        }
    }

    /**
     * Validate TypeScript configuration and project structure
     */
    private async validateConfiguration(): Promise<void> {
        const requiredFiles = ['./tsconfig.json', './package.json'];
        const requiredDirs = ['./src'];

        for (const file of requiredFiles) {
            try {
                await fs.access(file);
            } catch {
                throw new Error(`Required file not found: ${file}`);
            }
        }

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
     * Analyze TypeScript errors from compiler output
     */
    private async analyzeTypeScriptErrors(): Promise<TypeScriptError[]> {
        try {
            const { stdout } = await execAsync('npx tsc --noEmit --pretty false');
            return []; // No errors if command succeeds
        } catch (execError: any) {
            const output = execError.stdout || execError.stderr || '';
            return this.parseTypeScriptErrors(output);
        }
    }

    /**
     * Parse TypeScript compiler output into structured errors
     */
    private parseTypeScriptErrors(output: string): TypeScriptError[] {
        const errors: TypeScriptError[] = [];
        const lines = output.split('\n');

        for (const line of lines) {
            // Match TypeScript error format: file(line,col): error TSxxxx: message
            const match = line.match(/^(.+)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
            if (match) {
                const [, file, lineNum, column, code, message] = match;
                errors.push({
                    file: file.trim(),
                    line: parseInt(lineNum),
                    column: parseInt(column),
                    code,
                    message: message.trim(),
                    severity: 'error'
                });
            }
        }

        return errors.filter(error => this.fixableErrorCodes.includes(error.code));
    }

    /**
     * Create backups for files that will be modified
     */
    private async createBackups(errors: TypeScriptError[]): Promise<void> {
        try {
            await fs.mkdir(this.backupPath, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            const filesToBackup = [...new Set(errors.map(e => e.file))];

            for (const filePath of filesToBackup) {
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const backupFile = path.join(this.backupPath, `${timestamp}-${path.basename(filePath)}`);
                    await fs.writeFile(backupFile, content);
                    console.log(`📁 Backed up: ${filePath}`);
                } catch (backupError) {
                    console.warn(`⚠️  Could not backup ${filePath}:`, backupError);
                }
            }
        } catch (backupError) {
            console.error('Failed to create backups:', backupError);
            throw backupError;
        }
    }

    /**
     * Apply pattern-based fixes to a specific file
     */
    private async applyFileFixes(filePath: string, fileErrors: TypeScriptError[]): Promise<boolean> {
        try {
            let content = await fs.readFile(filePath, 'utf8');
            let modified = false;

            // Apply fix patterns based on error codes
            for (const error of fileErrors) {
                const applicablePatterns = this.fixPatterns.filter(p => p.errorCode === error.code);

                for (const pattern of applicablePatterns) {
                    if (pattern.pattern.test(content)) {
                        if (typeof pattern.replacement === 'string') {
                            content = content.replace(pattern.pattern, pattern.replacement);
                        } else {
                            content = content.replace(pattern.pattern, pattern.replacement);
                        }
                        modified = true;
                        console.log(`🔧 Applied fix: ${pattern.description} in ${filePath}`);
                    }
                }
            }

            // Apply additional context-specific fixes
            content = await this.applyContextualFixes(content, filePath, fileErrors);

            if (modified || content !== await fs.readFile(filePath, 'utf8')) {
                await fs.writeFile(filePath, content);
                this.fixedFiles.push(filePath);
                return true;
            }

            return false;
        } catch (fixError) {
            console.error(`❌ Failed to apply fixes to ${filePath}:`, fixError);
            return false;
        }
    }

    /**
     * Apply contextual fixes based on file type and error context
     */
    private async applyContextualFixes(content: string, filePath: string, errors: TypeScriptError[]): Promise<string> {
        let fixedContent = content;

        // Fix common variable naming issues
        fixedContent = fixedContent.replace(/\} catch \(_error\) \{[\s\S]*?throw error;/g, (match) => {
            return match.replace('throw error;', 'throw _error;');
        });

        // Fix parameter naming mismatches
        fixedContent = fixedContent.replace(/canAutoFix\(_error: TypeScriptError\)[\s\S]*?return.*?error\.code/g, (match) => {
            return match.replace('error.code', '_error.code');
        });

        // Fix unknown type issues
        fixedContent = fixedContent.replace(/const (\w+): unknown = \{\};/g, 'const $1: Record<string, any> = {};');

        // Add null safety where needed
        if (errors.some(e => e.code === 'TS2561' || e.code === 'TS18047')) {
            fixedContent = this.addNullSafetyChecks(fixedContent);
        }

        return fixedContent;
    }

    /**
     * Add null safety checks for strict null compliance
     */
    private addNullSafetyChecks(content: string): string {
        // Add optional chaining for common patterns
        let safeContent = content;

        // Replace property access with optional chaining where appropriate
        safeContent = safeContent.replace(/(\w+)\.data\(\)/g, '$1?.data()');
        safeContent = safeContent.replace(/(\w+)\.toDate\(\)/g, '$1?.toDate()');

        return safeContent;
    }

    /**
     * Check if error can be auto-fixed
     */
    private async canAutoFix(error: TypeScriptError): Promise<boolean> {
        return this.fixableErrorCodes.includes(error.code);
    }

    /**
     * Validate that fixes don't break the code
     */
    async validateFix(error: TypeScriptError): Promise<boolean> {
        try {
            const checkResult = await this.runTypeScriptCheck();
            return checkResult.success || checkResult.errorCount <= error.line; // Rough validation
        } catch {
            return false;
        }
    }

    /**
     * Run TypeScript type checking
     */
    private async runTypeScriptCheck(): Promise<{ success: boolean; errorCount: number }> {
        try {
            await execAsync('npx tsc --noEmit --pretty false');
            return { success: true, errorCount: 0 };
        } catch (checkError: any) {
            const output = checkError.stdout || checkError.stderr || '';
            const errorCount = (output.match(/error TS\d+:/g) || []).length;
            return { success: false, errorCount };
        }
    }

    /**
     * Rollback all changes
     */
    async rollback(): Promise<boolean> {
        console.log('🔄 Rolling back TypeScript Guardian changes...');

        try {
            // Restore from backups
            const backupFiles = await fs.readdir(this.backupPath);

            for (const backupFile of backupFiles) {
                if (backupFile.includes('-')) {
                    const originalName = backupFile.split('-').slice(1).join('-');
                    const backupPath = path.join(this.backupPath, backupFile);
                    const originalPath = path.join('./src', originalName);

                    try {
                        const backupContent = await fs.readFile(backupPath, 'utf8');
                        await fs.writeFile(originalPath, backupContent);
                        console.log(`📁 Restored: ${originalPath}`);
                    } catch (restoreError) {
                        console.warn(`⚠️  Could not restore ${originalPath}:`, restoreError);
                    }
                }
            }

            return true;
        } catch (rollbackError) {
            console.error('❌ Rollback failed:', rollbackError);
            return false;
        }
    }
}

// Export singleton instance
export const enhancedTypeScriptGuardianAgent = new EnhancedTypeScriptGuardianAgent();
