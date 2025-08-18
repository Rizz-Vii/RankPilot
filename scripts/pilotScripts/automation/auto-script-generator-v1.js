/**
 * @pilotbuddy-script
 * @category: automation
 * @problem: Generate scripts automatically when solutions are identified
 * @usage: node pilotScripts/automation/auto-script-generator-v1.js
 * @generated: 2025-07-22T14:50:00Z
 * @pattern-id: AUTO-SCRIPT-GEN-001
 */

const fs = require('fs');
const path = require('path');

class AutoScriptGenerator {
  constructor() {
    this.templatesDir = path.join(__dirname, '../templates');
    this.outputDirs = {
      automation: path.join(__dirname, '../automation'),
      solutions: path.join(__dirname, '../solutions'),
      utilities: path.join(__dirname, '../utilities')
    };
    
    this.scriptCounter = {
      automation: this.getNextId('automation'),
      solutions: this.getNextId('solutions'),
      utilities: this.getNextId('utilities')
    };
  }

  /**
   * Generate a script from a solved problem
   */
  generateSolutionScript(problemData) {
    const {
      category,
      problemDescription,
      solutionCode,
      language = 'javascript',
      patternId
    } = problemData;

    const scriptId = String(this.scriptCounter.solutions).padStart(3, '0');
    const fileName = `solution-${category}-${scriptId}-v1.${this.getExtension(language)}`;
    const filePath = path.join(this.outputDirs.solutions, fileName);

    const scriptContent = this.generateScriptTemplate({
      type: 'solution',
      category,
      problemDescription,
      solutionCode,
      language,
      patternId,
      scriptId
    });

    fs.writeFileSync(filePath, scriptContent);
    this.scriptCounter.solutions++;
    
    console.log(`✅ Generated solution script: ${fileName}`);
    return filePath;
  }

  /**
   * Generate automation script
   */
  generateAutomationScript(automationData) {
    const {
      taskName,
      automationCode,
      language = 'javascript',
      triggers = []
    } = automationData;

    const fileName = `auto-${taskName}-v1.${this.getExtension(language)}`;
    const filePath = path.join(this.outputDirs.automation, fileName);

    const scriptContent = this.generateScriptTemplate({
      type: 'automation',
      taskName,
      automationCode,
      language,
      triggers
    });

    fs.writeFileSync(filePath, scriptContent);
    
    console.log(`✅ Generated automation script: ${fileName}`);
    return filePath;
  }

  /**
   * Generate utility script
   */
  generateUtilityScript(utilityData) {
    const {
      functionName,
      utilityCode,
      language = 'javascript',
      description
    } = utilityData;

    const fileName = `util-${functionName}-v1.${this.getExtension(language)}`;
    const filePath = path.join(this.outputDirs.utilities, fileName);

    const scriptContent = this.generateScriptTemplate({
      type: 'utility',
      functionName,
      utilityCode,
      language,
      description
    });

    fs.writeFileSync(filePath, scriptContent);
    
    console.log(`✅ Generated utility script: ${fileName}`);
    return filePath;
  }

  /**
   * Generate script template based on type
   */
  generateScriptTemplate(data) {
    const header = this.generateHeader(data);
    const body = this.generateBody(data);
    
    return `${header}\n\n${body}`;
  }

  /**
   * Generate script header with metadata
   */
  generateHeader(data) {
    const timestamp = new Date().toISOString();
    
    if (data.language === 'javascript') {
      return `/**
 * @pilotbuddy-script
 * @category: ${data.type}
 * @problem: ${data.problemDescription || data.taskName || data.functionName}
 * @usage: node pilotScripts/${data.type}/${this.getFileName(data)}
 * @generated: ${timestamp}
 * @pattern-id: ${data.patternId || 'AUTO-GEN-' + Date.now()}
 */`;
    } else if (data.language === 'powershell') {
      return `<#
 * @pilotbuddy-script
 * @category: ${data.type}
 * @problem: ${data.problemDescription || data.taskName || data.functionName}
 * @usage: powershell -ExecutionPolicy Bypass -File pilotScripts/${data.type}/${this.getFileName(data)}
 * @generated: ${timestamp}
 * @pattern-id: ${data.patternId || 'AUTO-GEN-' + Date.now()}
#>`;
    } else {
      return `# @pilotbuddy-script
# @category: ${data.type}
# @problem: ${data.problemDescription || data.taskName || data.functionName}
# @generated: ${timestamp}
# @pattern-id: ${data.patternId || 'AUTO-GEN-' + Date.now()}`;
    }
  }

  /**
   * Generate script body
   */
  generateBody(data) {
    if (data.solutionCode) {
      return data.solutionCode;
    }
    
    if (data.automationCode) {
      return data.automationCode;
    }
    
    if (data.utilityCode) {
      return data.utilityCode;
    }
    
    // Generate basic template if no code provided
    return this.generateBasicTemplate(data);
  }

  /**
   * Generate basic script template
   */
  generateBasicTemplate(data) {
    if (data.language === 'javascript') {
      return `console.log('🤖 PilotBuddy Auto-Generated Script');
console.log('Script: ${data.type}');
console.log('Purpose: ${data.problemDescription || data.taskName || data.functionName}');

// TODO: Implement ${data.type} logic here

module.exports = { /* Export your functions here */ };`;
    } else if (data.language === 'powershell') {
      return `Write-Host "🤖 PilotBuddy Auto-Generated Script" -ForegroundColor Green
Write-Host "Script: ${data.type}" -ForegroundColor Cyan
Write-Host "Purpose: ${data.problemDescription || data.taskName || data.functionName}" -ForegroundColor Yellow

# TODO: Implement ${data.type} logic here`;
    } else {
      return `echo "🤖 PilotBuddy Auto-Generated Script"
echo "Script: ${data.type}"
echo "Purpose: ${data.problemDescription || data.taskName || data.functionName}"

# TODO: Implement ${data.type} logic here`;
    }
  }

  /**
   * Get file extension for language
   */
  getExtension(language) {
    const extensions = {
      javascript: 'js',
      typescript: 'ts',
      powershell: 'ps1',
      bash: 'sh',
      python: 'py'
    };
    
    return extensions[language] || 'txt';
  }

  /**
   * Get filename from data
   */
  getFileName(data) {
    if (data.type === 'solution') {
      return `solution-${data.category}-${data.scriptId}-v1.${this.getExtension(data.language)}`;
    } else if (data.type === 'automation') {
      return `auto-${data.taskName}-v1.${this.getExtension(data.language)}`;
    } else {
      return `util-${data.functionName}-v1.${this.getExtension(data.language)}`;
    }
  }

  /**
   * Get next available ID for script type
   */
  getNextId(type) {
    try {
      const dir = this.outputDirs[type];
      const files = fs.readdirSync(dir);
      const nums = files
        .map(f => {
          const match = f.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(n => n > 0);
      
      return nums.length > 0 ? Math.max(...nums) + 1 : 1;
    } catch {
      return 1;
    }
  }

  /**
   * Update package.json with new script commands
   */
  updatePackageJsonScripts(scriptPath, scriptType, scriptName) {
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      
      const scriptCommand = `node ${path.relative(process.cwd(), scriptPath)}`;
      const scriptKey = `pilot:${scriptType}:${scriptName}`;
      
      packageJson.scripts[scriptKey] = scriptCommand;
      
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
      console.log(`📦 Added npm script: ${scriptKey}`);
      
    } catch (error) {
      console.warn('Warning: Could not update package.json:', error.message);
    }
  }
}

// Example usage patterns for PilotBuddy integration
const examples = {
  eslintSolution: {
    category: 'eslint-compatibility',
    problemDescription: 'ESLint v9.x compatibility with Next.js 15.4.1',
    solutionCode: `const { execSync } = require('child_process');

try {
  execSync('npx eslint . --fix', { stdio: 'inherit' });
} catch (error) {
  console.log('Applying fallback ESLint configuration...');
  execSync('node scripts/build-skip-typecheck.js', { stdio: 'inherit' });
}`,
    language: 'javascript',
    patternId: 'ESLINT-COMPAT-001'
  },
  
  markdownAutomation: {
    taskName: 'markdown-lint-watch',
    automationCode: `const { spawn } = require('child_process');

const watcher = spawn('nodemon', [
  '--watch', 'docs',
  '--ext', 'md',
  '--exec', 'npm run lint:md:fix'
], { stdio: 'inherit' });

console.log('👁️ Watching markdown files for changes...');`,
    language: 'javascript',
    triggers: ['file-change', 'markdown-edit']
  }
};

module.exports = { AutoScriptGenerator, examples };
