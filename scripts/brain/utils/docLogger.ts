/**
 * Documentation logging utilities for PilotBuddy Central Brain
 * Handles automatic logging to CHANGE_LOG.md and EVENT_BACKBONE_REFERENCE.md
 */

import fs from 'fs';
import path from 'path';

interface LogEntry {
  timestamp: string;
  action: string;
  details?: string;
}

/**
 * Redacts sensitive information from text
 */
export function redactSecrets(text: string): string {
  const sensitivePatterns = [
    /apiKey['\"]?\s*[:=]\s*['\"]?[a-zA-Z0-9_-]+/gi,
    /openaiKey['\"]?\s*[:=]\s*['\"]?sk-[a-zA-Z0-9_-]+/gi,
    /authToken['\"]?\s*[:=]\s*['\"]?[a-zA-Z0-9_.-]+/gi,
    /password['\"]?\s*[:=]\s*['\"]?[^'\"\s]+/gi,
    /secret['\"]?\s*[:=]\s*['\"]?[a-zA-Z0-9_.-]+/gi,
    /Bearer\s+[a-zA-Z0-9_.-]+/gi,
    /Authorization['\"]?\s*[:=]\s*['\"]?[^'\"\s]+/gi,
  ];

  let redacted = text;
  sensitivePatterns.forEach(pattern => {
    redacted = redacted.replace(pattern, (match) => {
      const parts = match.split(/[:=]/);
      if (parts.length > 1) {
        return `${parts[0]}:***REDACTED***`;
      }
      return '***REDACTED***';
    });
  });

  return redacted;
}

/**
 * Appends a single-line entry to CHANGE_LOG.md for execute runs (idempotent)
 */
export async function logExecuteRun(action: string, details?: string): Promise<void> {
  try {
    const changeLogPath = path.join(process.cwd(), 'docs', 'CHANGE_LOG.md');
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const logEntry = `## ${timestamp} PilotBuddy Brain Execute: ${action}${details ? ` - ${details}` : ''}`;
    
    // Read existing content
    let content = '';
    if (fs.existsSync(changeLogPath)) {
      content = fs.readFileSync(changeLogPath, 'utf-8');
    }
    
    // Check if this exact entry already exists (idempotent)
    if (content.includes(logEntry)) {
      return; // Entry already exists, skip
    }
    
    // Find the insertion point (after the first heading)
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Look for the first ## heading or insert at the beginning
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('## ')) {
        insertIndex = i;
        break;
      }
    }
    
    // Insert the new entry
    lines.splice(insertIndex, 0, logEntry, '');
    
    // Write back to file
    fs.writeFileSync(changeLogPath, lines.join('\n'));
    console.log(`✓ Logged execute run to CHANGE_LOG.md: ${action}`);
    
  } catch (error) {
    console.warn(`⚠ Failed to log to CHANGE_LOG.md:`, error);
  }
}

/**
 * Appends a note to EVENT_BACKBONE_REFERENCE.md when event-related files are touched
 */
export async function logEventFileChange(filePath: string, action: string): Promise<void> {
  try {
    // Check if this is an event-related file
    const eventPatterns = [
      /event/i,
      /backbone/i,
      /src\/lib\/events/,
      /publishEvent/,
      /event-types/,
      /onEventWrite/,
      /event-mirror/
    ];
    
    const isEventRelated = eventPatterns.some(pattern => 
      pattern.test(filePath) || pattern.test(action)
    );
    
    if (!isEventRelated) {
      return; // Not an event-related change
    }
    
    const eventRefPath = path.join(process.cwd(), 'docs', 'EVENT_BACKBONE_REFERENCE.md');
    const timestamp = new Date().toISOString().split('T')[0];
    const logEntry = `## ${timestamp} Event System Change\n\n- **File**: ${filePath}\n- **Action**: ${action}\n- **Source**: PilotBuddy Central Brain\n`;
    
    // Read existing content
    let content = '';
    if (fs.existsSync(eventRefPath)) {
      content = fs.readFileSync(eventRefPath, 'utf-8');
    }
    
    // Check if similar entry exists for today (idempotent by date)
    const today = timestamp;
    if (content.includes(`## ${today} Event System Change`)) {
      return; // Entry for today already exists
    }
    
    // Find insertion point (after main header)
    const lines = content.split('\n');
    let insertIndex = lines.length;
    
    // Look for existing date headers and insert in chronological order
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^## \d{4}-\d{2}-\d{2}/)) {
        insertIndex = i;
        break;
      }
    }
    
    // Insert the new entry
    lines.splice(insertIndex, 0, ...logEntry.split('\n'), '');
    
    // Write back to file
    fs.writeFileSync(eventRefPath, lines.join('\n'));
    console.log(`✓ Logged event file change to EVENT_BACKBONE_REFERENCE.md: ${filePath}`);
    
  } catch (error) {
    console.warn(`⚠ Failed to log to EVENT_BACKBONE_REFERENCE.md:`, error);
  }
}

/**
 * Creates a redacted execution log entry
 */
export function createRedactedLogEntry(entry: LogEntry): string {
  const redactedDetails = entry.details ? redactSecrets(entry.details) : '';
  return JSON.stringify({
    ...entry,
    details: redactedDetails
  }, null, 2);
}

/**
 * Writes execution logs with secrets redaction
 */
export async function writeRedactedExecutionLog(
  logName: string, 
  content: any
): Promise<void> {
  try {
    const artifactsDir = path.join(process.cwd(), 'artifacts', 'brain');
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logPath = path.join(artifactsDir, `${logName}-${timestamp}.json`);
    
    // Ensure content is string and redact secrets
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    const redactedContent = redactSecrets(contentStr);
    
    fs.writeFileSync(logPath, redactedContent);
    console.log(`✓ Created redacted execution log: ${logPath}`);
    
  } catch (error) {
    console.warn(`⚠ Failed to write redacted execution log:`, error);
  }
}