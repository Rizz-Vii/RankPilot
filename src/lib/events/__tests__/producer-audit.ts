/**
 * Event Producer Audit Test
 * Scans the codebase for event producers and validates they're all registered
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  validateRegistryCompleteness,
  isEventTypeRegistered,
  EVENT_TYPE_REGISTRY
} from '../registry';
import { EventType } from '../types';

// Test utilities
class EventProducerAuditor {
  private foundEventTypes = new Set<string>();
  private sourceFiles: string[] = [];

  /**
   * Recursively find all TypeScript files in the project
   */
  private findTSFiles(dir: string, files: string[] = []): string[] {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other unnecessary directories
        if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(item)) {
          this.findTSFiles(fullPath, files);
        }
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Scan a file for event publishing patterns
   */
  private scanFileForEventProducers(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Look for publishEvent calls
      const publishEventRegex = /publishEvent\s*\(\s*EventType\.([A-Z_]+)/g;
      let match;
      
      while ((match = publishEventRegex.exec(content)) !== null) {
        this.foundEventTypes.add(match[1]);
      }
      
      // Look for EventPublisher utility calls
      const eventPublisherRegex = /EventPublisher\.\w+\s*\([^)]*EventType\.([A-Z_]+)/g;
      while ((match = eventPublisherRegex.exec(content)) !== null) {
        this.foundEventTypes.add(match[1]);
      }
      
      // Look for direct enum references in event publishing contexts
      const directEventTypeRegex = /EventType\.([A-Z_]+)/g;
      while ((match = directEventTypeRegex.exec(content)) !== null) {
        // Only count if it's in a context that looks like event publishing
        const surroundingText = content.slice(Math.max(0, match.index - 50), match.index + 50);
        if (surroundingText.includes('publishEvent') || 
            surroundingText.includes('EventPublisher') ||
            surroundingText.includes('event') ||
            surroundingText.includes('type:')) {
          this.foundEventTypes.add(match[1]);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan file ${filePath}:`, error);
    }
  }

  /**
   * Audit the entire codebase for event producers
   */
  auditEventProducers(projectRoot: string): {
    foundEventTypes: string[];
    registeredEventTypes: string[];
    missingFromRegistry: string[];
    validEventTypes: string[];
    invalidEventTypes: string[];
  } {
    // Find all TypeScript files
    this.sourceFiles = this.findTSFiles(projectRoot);
    
    // Scan each file for event producers
    for (const file of this.sourceFiles) {
      this.scanFileForEventProducers(file);
    }
    
    const foundEventTypes = Array.from(this.foundEventTypes);
    const registeredEventTypes = Array.from(EVENT_TYPE_REGISTRY).map(et => et.toString());
    const allValidEventTypes = Object.values(EventType);
    
    // Check which found event types are missing from registry
    const missingFromRegistry = foundEventTypes.filter(eventType => {
      const enumValue = `${eventType.toLowerCase()}` as EventType;
      return !isEventTypeRegistered(enumValue);
    });
    
    // Separate valid vs invalid event types
    const validEventTypes = foundEventTypes.filter(eventType => 
      allValidEventTypes.includes(eventType.toLowerCase() as EventType)
    );
    
    const invalidEventTypes = foundEventTypes.filter(eventType => 
      !allValidEventTypes.includes(eventType.toLowerCase() as EventType)
    );
    
    return {
      foundEventTypes,
      registeredEventTypes,
      missingFromRegistry,
      validEventTypes,
      invalidEventTypes,
    };
  }
}

// Simple test runner
class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> | void }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => Promise<void> | void) {
    this.tests.push({ name, fn });
  }

  expect(actual: any) {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${actual} to be ${expected}`);
        }
      },
      toHaveLength: (expected: number) => {
        if (!actual || actual.length !== expected) {
          throw new Error(`Expected length ${expected}, got ${actual?.length || 'undefined'}`);
        }
      },
      toEqual: (expected: any) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
        }
      },
    };
  }

  async run() {
    console.log('🔍 Running Event Producer Audit Tests...\n');

    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Audit Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Create test runner and auditor
const runner = new TestRunner();
const auditor = new EventProducerAuditor();

// Get project root (go up from current test file location)
const projectRoot = path.resolve(__dirname, '../../../../');

runner.test('all event producers are registered in the registry', () => {
  const auditResults = auditor.auditEventProducers(projectRoot);
  
  console.log('🔍 Event Producer Audit Results:');
  console.log(`   Found ${auditResults.foundEventTypes.length} event type references in code`);
  console.log(`   Registry contains ${auditResults.registeredEventTypes.length} event types`);
  
  if (auditResults.foundEventTypes.length > 0) {
    console.log(`   Event types found in code: ${auditResults.foundEventTypes.join(', ')}`);
  }
  
  if (auditResults.invalidEventTypes.length > 0) {
    console.log(`   ⚠️  Invalid event types found: ${auditResults.invalidEventTypes.join(', ')}`);
  }
  
  // The main assertion: no event types should be missing from registry
  runner.expect(auditResults.missingFromRegistry).toHaveLength(0);
  
  if (auditResults.missingFromRegistry.length > 0) {
    throw new Error(`Found event producers not in registry: ${auditResults.missingFromRegistry.join(', ')}`);
  }
});

runner.test('registry completeness validation passes', () => {
  const validation = validateRegistryCompleteness();
  
  runner.expect(validation.isComplete).toBe(true);
  runner.expect(validation.missingTypes).toHaveLength(0);
  runner.expect(validation.extraTypes).toHaveLength(0);
});

runner.test('no orphaned event types in registry', () => {
  const auditResults = auditor.auditEventProducers(projectRoot);
  
  // Check that all registered types have corresponding enum values
  const validation = validateRegistryCompleteness();
  runner.expect(validation.extraTypes).toHaveLength(0);
});

// Run the audit
runner.run().catch(console.error);