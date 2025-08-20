#!/usr/bin/env node
// PilotBuddy Dynamic Content Aggregator
// Auto-generates comprehensive development context from project files
// Version 1.0 - July 22, 2025

const fs = require('fs');
const path = require('path');

function listFilesRecursive(dir) {
  try {
    if (!fs.existsSync(dir)) return [];
    const result = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(entry => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        result.push(...listFilesRecursive(full));
      } else {
        result.push(full);
      }
    });
    return result;
  } catch (err) {
    return [];
  }
}

function getProjectMetrics() {
  const metrics = {};
  
  try {
    // Count test files (recursive)
    const testFiles = listFilesRecursive('tests').filter(f => f.endsWith('.spec.ts'));
    metrics.testFiles = testFiles.length;
    
    // Count components (recursive)
    const componentFiles = listFilesRecursive('src/components').filter(f => f.endsWith('.tsx'));
    metrics.components = componentFiles.length;
    
    // Count documentation (recursive)
    const docFiles = listFilesRecursive('docs').filter(f => f.endsWith('.md'));
    metrics.documentationFiles = docFiles.length;
    
    // Count scripts (non-recursive)
    const scriptFiles = fs.existsSync('scripts') ? fs.readdirSync('scripts').filter(f => f.endsWith('.js') || f.endsWith('.ps1') || f.endsWith('.sh')) : [];
    metrics.scripts = scriptFiles.length;

    // Count pilotScripts
    let pilotScriptCount = 0;
    try {
      const pilotScriptFiles = listFilesRecursive('pilotScripts').filter(f => 
        f.endsWith('.js') || f.endsWith('.ps1') || f.endsWith('.sh') || f.endsWith('.ts'));
      pilotScriptCount = pilotScriptFiles.length;
    } catch (error) {
      // pilotScripts directory may not exist yet
      pilotScriptCount = 0;
    }
    metrics.pilotScripts = pilotScriptCount;
    
  } catch (error) {
    console.log('Warning: Could not read some directories:', error.message);
    metrics.testFiles = 0;
    metrics.components = 0;
    metrics.documentationFiles = 0;
    metrics.scripts = 0;
    metrics.pilotScripts = 0;
  }
  
  return metrics;
}

function getScriptInventory() {
  const scripts = {};
  
  try {
    const scriptFiles = fs.existsSync('scripts') ? fs.readdirSync('scripts') : [];
    
    scriptFiles.forEach(script => {
      let category = 'Utilities';
      
      if (script.includes('test')) category = 'Testing';
      else if (script.includes('build')) category = 'Build';
      else if (script.includes('fix')) category = 'Fixes';
      else if (script.includes('pilotbuddy')) category = 'PilotBuddy';
      
      if (!scripts[category]) scripts[category] = [];
      scripts[category].push(script);
    });

    // Add pilotScripts inventory
    try {
      const pilotDirs = ['automation', 'solutions', 'utilities'];
      scripts['PilotScripts'] = [];
      
      pilotDirs.forEach(dir => {
        const fullPath = path.join('pilotScripts', dir);
        if (fs.existsSync(fullPath)) {
          const pilotFiles = fs.readdirSync(fullPath);
          pilotFiles.forEach(file => {
            scripts['PilotScripts'].push(`${dir}/${file}`);
          });
        }
      });
    } catch (error) {
      // pilotScripts directory may not exist yet
      scripts['PilotScripts'] = [];
    }
    
  } catch (error) {
    console.log('Warning: Could not read scripts directory:', error.message);
  }
  
  return scripts;
}

function getPackageJsonScripts() {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    return packageJson.scripts || {};
  } catch (error) {
    console.warn('Warning: Could not read package.json scripts');
    return {};
  }
}

function generateDynamicContent() {
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const metrics = getProjectMetrics();
  const scripts = getScriptInventory();
  const packageScripts = getPackageJsonScripts();
  
  let content = `# PilotBuddy Dynamic Development Assistant v5.0

**Auto-Generated:** ${timestamp} UTC  
**Project:** RankPilot (Studio) - AI-First SEO SaaS Platform  
**Status:** Phase 4 - Production Readiness with Continuous Evolution  

## Live Project Metrics

### Current State
- **Test Files**: ${metrics.testFiles} Playwright test specifications
- **Components**: ${metrics.components} React/TypeScript components  
- **Documentation**: ${metrics.documentationFiles} markdown files
- **Scripts**: ${metrics.scripts} automation and utility scripts
- **PilotScripts**: ${metrics.pilotScripts} auto-generated solution scripts

## Script Inventory

`;

  // Add script categories
  for (const [category, scriptList] of Object.entries(scripts)) {
    content += `### ${category} Scripts\n`;
    scriptList.forEach(script => {
      content += `- \`${script}\`\n`;
    });
    content += '\n';
  }

  content += `## Autonomous Learning System

### Core Patterns Learned
1. **ESLint Compatibility**: Fallback configurations for build stability
2. **Testing Framework**: Enhanced authentication with graceful error handling
3. **Mobile Performance**: 48px touch targets and responsive utilities
4. **AI Service Orchestration**: 6-engine coordination with quota management
5. **Tier-Based Authentication**: 5-tier system with inheritance patterns

### Decision Framework
- **Build Failures**: Apply ESLint fallback configuration
- **Test Issues**: Use enhanced authentication utilities
- **Mobile Problems**: Activate responsive component patterns
- **AI Service Errors**: Implement orchestrator with degradation

### Automated Enhancement Protocols
- **Markdown Quality**: Auto-lint on .md file changes
- **Solution Scripting**: Generate reusable scripts from solved problems
- **Package.json Integration**: Auto-add pilot commands for new scripts

### Key File References
- \`eslint.config.mjs\` - Enhanced with fallback configuration for stability
- \`testing/utils/enhanced-auth.ts\` - 5-tier authentication with graceful fallbacks
- \`testing/utils/test-orchestrator.ts\` - Role-based testing with mobile validation
- \`scripts/build-skip-typecheck.js\` - Emergency build script for deployment
- \`src/lib/mobile-responsive-utils.ts\` - 8 custom hooks for mobile detection
- \`pilotScripts/automation/auto-markdown-lint-v1.js\` - Auto markdown quality enforcement
- \`pilotScripts/automation/auto-script-generator-v1.js\` - Solution script automation

## Available Package.json Scripts (${Object.keys(packageScripts).length} total)

### PilotBuddy Integration Scripts
`;

  // Add pilot-specific scripts first
  const pilotScripts = Object.entries(packageScripts)
    .filter(([key, value]) => key.includes('pilot') || key.includes('pilotbuddy'))
    .sort();
  
  pilotScripts.forEach(([key, value]) => {
    content += `- \`${key}\` - ${value}\n`;
  });

  content += `
### Development Scripts (${Object.keys(packageScripts).filter(k => k.includes('dev')).length} commands)
`;
  
  const devScripts = Object.entries(packageScripts)
    .filter(([key, value]) => key.includes('dev') && !key.includes('pilot'))
    .slice(0, 5); // Show top 5
  
  devScripts.forEach(([key, value]) => {
    content += `- \`${key}\` - Primary development server\n`;
  });

  content += `
### Testing Scripts (${Object.keys(packageScripts).filter(k => k.includes('test')).length} commands)
`;
  
  const testScripts = Object.entries(packageScripts)
    .filter(([key, value]) => key.includes('test'))
    .slice(0, 5); // Show top 5
  
  testScripts.forEach(([key, value]) => {
    content += `- \`${key}\` - Testing automation\n`;
  });

  content += `
### Build & Deploy Scripts (${Object.keys(packageScripts).filter(k => k.includes('build')).length} commands)
`;
  
  const buildScripts = Object.entries(packageScripts)
    .filter(([key, value]) => key.includes('build'))
    .slice(0, 3); // Show top 3
  
  buildScripts.forEach(([key, value]) => {
    content += `- \`${key}\` - Build pipeline\n`;
  });

  content += `
### Evolution Indicators
- **Build Success Rate**: Monitor npm run build consistency
- **Test Stability**: Track Playwright test pass rates
- **Mobile Performance**: Core Web Vitals compliance
- **AI Service Uptime**: NeuroSEO suite availability
- **Script Generation**: Auto-created ${metrics.pilotScripts} solution scripts

---

**Last Updated:** ${timestamp}  
**Auto-Refresh:** Every development session  
**Memory Persistence:** Continuous learning enabled  
**Growth Model:** Pattern recognition with autonomous improvement
`;

  return content;
}

// Main execution
console.log('🤖 PilotBuddy Dynamic Content Aggregator v1.0');
console.log('Analyzing project state and generating insights...');

try {
  const dynamicContent = generateDynamicContent();
  const outputPath = '.github/pilotbuddy-dynamic.md';
  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  
  fs.writeFileSync(outputPath, dynamicContent, 'utf8');
  
  console.log(`✅ Dynamic content generated: ${outputPath}`);
  
  const metrics = getProjectMetrics();
  console.log('\n📋 Project Summary:');
  console.log(`   Tests: ${metrics.testFiles} | Components: ${metrics.components} | Docs: ${metrics.documentationFiles}`);
  console.log(`   Scripts: ${metrics.scripts}`);
  
} catch (error) {
  console.error('Failed to generate dynamic content:', error.message);
  process.exit(1);
}

console.log('\n🎯 PilotBuddy is now autonomous and ready for continuous evolution!');
