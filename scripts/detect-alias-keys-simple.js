#!/usr/bin/env node
/**
 * Alias FeatureKey Detection Script (Node.js version)
 * 
 * This script scans the repository for usage of alias FeatureKeys
 * and generates a report of their occurrence.
 * 
 * Usage: node scripts/detect-alias-keys-simple.js [--fail-on-found]
 */

const fs = require('fs');
const path = require('path');

function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx'], results = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .git directories
      if (!['node_modules', '.git', '.next', 'dist', 'lib'].includes(file)) {
        findFiles(fullPath, extensions, results);
      }
    } else if (extensions.some(ext => file.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  
  return results;
}

// Import the alias mapping from access-control.ts
function getAliasMapping() {
  const accessControlPath = path.join(__dirname, '../src/lib/access-control.ts');
  const content = fs.readFileSync(accessControlPath, 'utf-8');
  
  // Extract FEATURE_ALIASES from the file
  const aliasMatch = content.match(/export const FEATURE_ALIASES[^}]*\{([^}]*)\}/s);
  if (!aliasMatch) {
    return {};
  }
  
  const aliasContent = aliasMatch[1];
  const aliases = {};
  
  // Parse alias definitions (simple regex for key: "value" patterns)
  const aliasRegex = /(\w+):\s*["']([^"']+)["']/g;
  let match;
  while ((match = aliasRegex.exec(aliasContent)) !== null) {
    aliases[match[1]] = match[2];
  }
  
  return aliases;
}

// Get deprecated alias keys from FEATURE_KEYS.md
function getDeprecatedAliases() {
  const featureKeysPath = path.join(__dirname, '../FEATURE_KEYS.md');
  const content = fs.readFileSync(featureKeysPath, 'utf-8');
  
  const aliases = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Look for lines that contain "alias" type and parse the mapping
    if (line.includes('| alias |') || line.includes('alias | alias |')) {
      const columns = line.split('|').map(col => col.trim());
      if (columns.length >= 6) {
        const key = columns[1];
        const notes = columns[6];
        
        // Extract canonical key from notes like "-> link_view" or "-> export_formats"
        const canonicalMatch = notes.match(/-> (\w+)/);
        if (canonicalMatch) {
          aliases[key] = canonicalMatch[1];
        }
      }
    }
  }
  
  return aliases;
}

// Scan source files for alias usage
function scanForAliasUsage(aliasKeys) {
  const usages = [];
  
  // Get all source and test files
  const srcDir = path.join(__dirname, '../src');
  const testDir = path.join(__dirname, '../testing');
  
  const srcFiles = findFiles(srcDir);
  const testFiles = fs.existsSync(testDir) ? findFiles(testDir) : [];
  const allFiles = [...srcFiles, ...testFiles];
  
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const aliasKey of aliasKeys) {
        // Look for the alias key as a string literal or identifier
        const patterns = [
          new RegExp(`["'\`]${aliasKey}["'\`]`, 'g'), // String literals
          new RegExp(`\\b${aliasKey}\\b(?=\\s*:)`, 'g'), // Object keys
          new RegExp(`feature\\s*=\\s*["'\`]${aliasKey}["'\`]`, 'g'), // JSX feature props
        ];
        
        for (const pattern of patterns) {
          if (pattern.test(line)) {
            usages.push({
              file: path.relative(process.cwd(), file),
              line: i + 1,
              content: line.trim(),
              aliasKey,
            });
          }
        }
      }
    }
  }
  
  return usages;
}

// Generate the alias report
function generateAliasReport() {
  const codeAliases = getAliasMapping();
  const docAliases = getDeprecatedAliases();
  
  // Combine both sources of aliases
  const allAliases = { ...docAliases, ...codeAliases };
  const aliasKeys = Object.keys(allAliases);
  
  const usages = scanForAliasUsage(aliasKeys);
  
  // Add canonical key information to usages
  usages.forEach(usage => {
    usage.canonicalKey = allAliases[usage.aliasKey];
  });
  
  const uniqueFiles = new Set(usages.map(u => u.file)).size;
  
  return {
    aliases: allAliases,
    usages,
    summary: {
      totalAliases: aliasKeys.length,
      totalUsages: usages.length,
      filesWithUsages: uniqueFiles,
    },
  };
}

// Format and display the report
function displayReport(report, format = 'console') {
  if (format === 'json') {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  
  console.log('🔍 Alias FeatureKey Detection Report');
  console.log('=====================================\n');
  
  console.log('📋 Summary:');
  console.log(`   • Total alias keys tracked: ${report.summary.totalAliases}`);
  console.log(`   • Total usages found: ${report.summary.totalUsages}`);
  console.log(`   • Files with usages: ${report.summary.filesWithUsages}`);
  console.log();
  
  if (Object.keys(report.aliases).length > 0) {
    console.log('🏷️  Tracked Alias Keys:');
    for (const [alias, canonical] of Object.entries(report.aliases)) {
      console.log(`   • ${alias} → ${canonical}`);
    }
    console.log();
  }
  
  if (report.usages.length > 0) {
    console.log('⚠️  Found Alias Usages:');
    
    // Group by file for better readability
    const usagesByFile = report.usages.reduce((acc, usage) => {
      if (!acc[usage.file]) acc[usage.file] = [];
      acc[usage.file].push(usage);
      return acc;
    }, {});
    
    for (const [file, fileUsages] of Object.entries(usagesByFile)) {
      console.log(`\n   📄 ${file}:`);
      for (const usage of fileUsages) {
        console.log(`      Line ${usage.line}: ${usage.aliasKey} ${usage.canonicalKey ? `→ ${usage.canonicalKey}` : ''}`);
        console.log(`         ${usage.content}`);
      }
    }
  } else {
    console.log('✅ No alias usages found in codebase!');
  }
  
  console.log();
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const failOnFound = args.includes('--fail-on-found');
  const jsonFormat = args.includes('--json');
  
  try {
    const report = generateAliasReport();
    
    displayReport(report, jsonFormat ? 'json' : 'console');
    
    if (failOnFound && report.usages.length > 0) {
      console.error('❌ Found alias usages - failing as requested');
      process.exit(1);
    }
    
    if (report.usages.length > 0) {
      console.log('💡 Next steps:');
      console.log('   1. Replace alias keys with their canonical equivalents');
      console.log('   2. Remove aliases from FEATURE_ALIASES mapping');
      console.log('   3. Run this script with --fail-on-found to prevent regressions');
    }
    
  } catch (error) {
    console.error('❌ Error running alias detection:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateAliasReport };