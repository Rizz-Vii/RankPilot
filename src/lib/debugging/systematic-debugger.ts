/**
 * Systematic Debugging Framework for RankPilot
 * Enforces step-by-step debugging approach based on PilotBuddy V01 standards
 */

export interface DebuggingStep {
    id: string;
    name: string;
    description: string;
    required: boolean;
    completed: boolean;
    result?: string;
    timeSpent?: number;
}

export interface DebuggingSession {
    id: string;
    problem: string;
    startTime: Date;
    endTime?: Date;
    steps: DebuggingStep[];
    patterns: string[];
    resolution?: string;
    effectiveness: 'high' | 'medium' | 'low';
}

export class SystematicDebugger {
    private session: DebuggingSession | null = null;
    private patterns: Map<string, string> = new Map();

    /**
     * Systematic Debugging Checklist (MANDATORY)
     */
    private readonly SYSTEMATIC_STEPS: Omit<DebuggingStep, 'completed' | 'result' | 'timeSpent'>[] = [
        {
            id: 'config-validation',
            name: 'Configuration Validation',
            description: 'Check basic configuration (environment variables, URLs, file paths)',
            required: true,
        },
        {
            id: 'error-analysis',
            name: 'Error Analysis',
            description: 'Analyze actual error messages and stack traces',
            required: true,
        },
        {
            id: 'recent-changes',
            name: 'Recent Changes Review',
            description: 'Check recent commits, dependencies, configuration changes',
            required: true,
        },
        {
            id: 'environment-check',
            name: 'Environment Consistency',
            description: 'Verify environment consistency (dev vs prod, dependencies)',
            required: true,
        },
        {
            id: 'pattern-matching',
            name: 'Pattern Recognition',
            description: 'Check against known patterns and previous solutions',
            required: true,
        },
        {
            id: 'isolation-testing',
            name: 'Problem Isolation',
            description: 'Isolate the problem to specific components or services',
            required: false,
        },
        {
            id: 'hypothesis-testing',
            name: 'Hypothesis Testing',
            description: 'Test specific hypotheses systematically',
            required: false,
        },
        {
            id: 'solution-validation',
            name: 'Solution Validation',
            description: 'Validate solution and capture for future reference',
            required: true,
        },
    ];

    /**
     * Start a new systematic debugging session
     */
    startSession(problem: string): string {
        const sessionId = `debug-${Date.now()}`;
        this.session = {
            id: sessionId,
            problem,
            startTime: new Date(),
            steps: this.SYSTEMATIC_STEPS.map(step => ({
                ...step,
                completed: false,
            })),
            patterns: [],
            effectiveness: 'medium',
        };

        console.log(`🔍 Starting Systematic Debugging Session: ${sessionId}`);
        console.log(`📋 Problem: ${problem}`);
        console.log(`✅ Systematic Steps Required: ${this.getRequiredSteps().length}`);

        return sessionId;
    }

    /**
     * Complete a debugging step
     */
    completeStep(stepId: string, _result: string, timeSpent?: number): boolean {
        if (!this.session) {
            throw new Error('No active debugging session. Call startSession() first.');
        }

        const step = this.session.steps.find(s => s.id === stepId);
        if (!step) {
            throw new Error(`Unknown step: ${stepId}`);
        }

        step.completed = true;
        step.result = _result;
        step.timeSpent = timeSpent;

        console.log(`✅ Completed: ${step.name}`);
        console.log(`📝 Result: ${_result}`);

        // Check if this reveals a known pattern
        this.checkPatterns(stepId, _result);

        return this.canProceed();
    }

    /**
     * Check if we can proceed (all required steps completed)
     */
    canProceed(): boolean {
        if (!this.session) return false;

        const requiredSteps = this.session.steps.filter(s => s.required);
        const completedRequired = requiredSteps.filter(s => s.completed);

        const progress = completedRequired.length / requiredSteps.length;
        console.log(`📊 Progress: ${Math.round(progress * 100)}% (${completedRequired.length}/${requiredSteps.length} required steps)`);

        return progress >= 0.8; // Allow proceeding at 80% completion
    }

    /**
     * Get current session status
     */
    getStatus(): DebuggingSession | null {
        return this.session;
    }

    /**
     * Complete the debugging session
     */
    completeSession(resolution: string, effectiveness: 'high' | 'medium' | 'low' = 'medium'): void {
        if (!this.session) {
            throw new Error('No active session to complete.');
        }

        this.session.endTime = new Date();
        this.session.resolution = resolution;
        this.session.effectiveness = effectiveness;

        // Calculate total time
        const totalTime = this.session.endTime.getTime() - this.session.startTime.getTime();
        console.log(`🎯 Debugging Session Completed in ${Math.round(totalTime / 1000)}s`);
        console.log(`📈 Effectiveness: ${effectiveness}`);
        console.log(`🔧 Resolution: ${resolution}`);

        // Save pattern for future use
        this.savePattern();
    }

    /**
     * Get required steps that haven't been completed
     */
    getRequiredSteps(): DebuggingStep[] {
        if (!this.session) return [];
        return this.session.steps.filter(s => s.required && !s.completed);
    }

    /**
     * Get next suggested step
     */
    getNextStep(): DebuggingStep | null {
        const required = this.getRequiredSteps();
        if (required.length > 0) {
            return required[0];
        }

        // If all required steps done, suggest optional steps
        if (!this.session) return null;
        const optional = this.session.steps.filter(s => !s.required && !s.completed);
        return optional[0] || null;
    }

    /**
     * Check for matching patterns
     */
    private checkPatterns(stepId: string, _result: string): void {
        // Simple pattern matching - can be enhanced with ML
        if (stepId === 'config-validation' && _result.includes('URL mismatch')) {
            console.log('🎯 Pattern Detected: Configuration URL Mismatch');
            this.session?.patterns.push('config-url-mismatch');
        }

        if (stepId === 'error-analysis' && _result.includes('infinite retry')) {
            console.log('🎯 Pattern Detected: Infinite Retry Loop');
            this.session?.patterns.push('infinite-retry-loop');
        }
    }

    /**
     * Save successful patterns for future use
     */
    private savePattern(): void {
        if (!this.session || !this.session.resolution) return;

        const pattern = {
            problem: this.session.problem,
            patterns: this.session.patterns,
            resolution: this.session.resolution,
            effectiveness: this.session.effectiveness,
            timestamp: new Date().toISOString(),
        };

        // In a real implementation, this would save to a database or file
        console.log('💾 Pattern Saved:', pattern);
    }

    /**
     * Force systematic approach - prevents skipping steps
     */
    enforceSystematicApproach(): void {
        if (!this.session) {
            throw new Error('❌ SYSTEMATIC DEBUGGING REQUIRED: Must start debugging session before proceeding.');
        }

        const requiredIncomplete = this.getRequiredSteps();
        if (requiredIncomplete.length > 0) {
            throw new Error(`❌ SYSTEMATIC APPROACH VIOLATION: Complete required steps first: ${requiredIncomplete.map(s => s.name).join(', ')}`);
        }
    }
}

// Global instance for easy access
export const systematicDebugger = new SystematicDebugger();

// Convenience function for quick debugging
export function startDebugging(problem: string): string {
    return systematicDebugger.startSession(problem);
}

// Export for use in other modules
export default SystematicDebugger;
