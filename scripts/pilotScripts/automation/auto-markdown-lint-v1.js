/**
 * @pilotbuddy-script
 * @category: automation
 * @problem: Automatic markdown linting on file changes
 * @usage: node pilotScripts/automation/auto-markdown-lint-v1.js
 * @generated: 2025-07-22T14:45:00Z
 * @pattern-id: AUTO-LINT-001
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AutoMarkdownLinter {
  constructor() {
    this.watchedDirectories = ['docs', 'pilotScripts'];
    this.excludePatterns = ['.git', 'node_modules', '.next'];
  }

  /**
   * Fix all markdown files in project
   */
  fixAllMarkdown() {
    console.log('🔧 PilotBuddy Auto-Markdown Linter v1.0');
    console.log('Fixing all markdown files...');
    
    try {
      // Run markdownlint fix on all markdown files
      execSync('npm run lint:md:fix', { stdio: 'inherit' });
      console.log('✅ All markdown files linted successfully');
      
      // Update PilotBuddy metrics
      this.updatePilotBuddyMetrics();
      
    } catch (error) {
      console.error('❌ Markdown linting failed:', error.message);
      
      // Attempt graceful fallback
      this.attemptGracefulFix();
    }
  }

  /**
   * Graceful fallback for markdown issues
   */
  attemptGracefulFix() {
    console.log('🔄 Attempting graceful markdown fix...');
    
    try {
      // Fix common markdown issues manually
      const docsDir = path.join(process.cwd(), 'docs');
      const markdownFiles = this.findMarkdownFiles(docsDir);
      
      markdownFiles.forEach(file => {
        this.fixCommonMarkdownIssues(file);
      });
      
      console.log('✅ Graceful markdown fix completed');
      
    } catch (fallbackError) {
      console.error('❌ Graceful fix failed:', fallbackError.message);
    }
  }

  /**
   * Find all markdown files recursively
   */
  findMarkdownFiles(dir) {
    const files = [];
    
    try {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !this.excludePatterns.includes(item)) {
          files.push(...this.findMarkdownFiles(fullPath));
        } else if (item.endsWith('.md')) {
          files.push(fullPath);
        }
      });
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dir}`);
    }
    
    return files;
  }

  /**
   * Fix common markdown linting issues
   */
  fixCommonMarkdownIssues(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      
      // Fix MD022: Headings should be surrounded by blank lines
      content = content.replace(/(^|\n)(#{1,6}[^\n]*)\n([^#\n])/gm, '$1$2\n\n$3');
      content = content.replace(/([^#\n])\n(#{1,6}[^\n]*)/gm, '$1\n\n$2');
      
      // Fix MD032: Lists should be surrounded by blank lines
      content = content.replace(/(^|\n)([^-*+\n].*)\n([-*+])/gm, '$1$2\n\n$3');
      content = content.replace(/([-*+].*)\n([^-*+\n\s])/gm, '$1\n\n$2');
      
      // Fix MD031: Fenced code blocks should be surrounded by blank lines
      content = content.replace(/(^|\n)([^`\n].*)\n(```)/gm, '$1$2\n\n$3');
      content = content.replace(/(```.*\n)\n([^`\n])/gm, '$1\n$2');
      
      fs.writeFileSync(filePath, content);
      console.log(`📝 Fixed: ${path.relative(process.cwd(), filePath)}`);
      
    } catch (error) {
      console.warn(`Warning: Could not fix ${filePath}: ${error.message}`);
    }
  }

  /**
   * Update PilotBuddy metrics after linting
   */
  updatePilotBuddyMetrics() {
    try {
      execSync('npm run pilotbuddy:update', { stdio: 'inherit' });
      console.log('📊 PilotBuddy metrics updated');
    } catch (error) {
      console.warn('Warning: Could not update PilotBuddy metrics');
    }
  }

  /**
   * Set up file watcher for continuous linting
   */
  setupWatcher() {
    console.log('👁️ Setting up markdown file watcher...');
    
    // Use nodemon-like approach for watching
    const watchCommand = `nodemon --watch docs --watch pilotScripts --ext md --exec "node pilotScripts/automation/auto-markdown-lint-v1.js"`;
    
    try {
      execSync(watchCommand, { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Watcher setup failed:', error.message);
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const linter = new AutoMarkdownLinter();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--watch')) {
    linter.setupWatcher();
  } else {
    linter.fixAllMarkdown();
  }
}

module.exports = AutoMarkdownLinter;
