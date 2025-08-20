#!/usr/bin/env node
/**
 * RankPilot Complete Documentation Consolidation Script
 * Consolidates ALL folders in docs directory into single files per folder
 * Created: July 26, 2025
 */

'use strict';
const fs = require('fs');
const path = require('path');

const DOCS_DIR = './docs';
const NOW = new Date();
const BACKUP_DIR = './docs-complete-backup-' + NOW.toISOString().slice(0, 19).replace(/:/g, '-');

// Get all subdirectories in docs
function getDocsFolders() {
    try {
        const items = fs.readdirSync(DOCS_DIR, { withFileTypes: true });
        return items
            .filter(item => item.isDirectory())
            .map(item => item.name)
            .sort();
    } catch (error) {
        console.error('❌ Error reading docs directory:', error.message);
        return [];
    }
}

// Get all markdown files in a directory
function getMarkdownFiles(dirPath) {
    try {
        const fullPath = path.join(DOCS_DIR, dirPath);
        if (!fs.existsSync(fullPath)) return [];

        const items = fs.readdirSync(fullPath, { withFileTypes: true });
        return items
            .filter(item => item.isFile() && item.name.endsWith('.md'))
            .map(item => path.join(dirPath, item.name))
            .sort();
    } catch (error) {
        console.warn(`⚠️ Error reading directory ${dirPath}:`, error.message);
        return [];
    }
}

// Read file content safely
function readFileContent(filePath) {
    try {
        const fullPath = path.join(DOCS_DIR, filePath);
        if (fs.existsSync(fullPath)) {
            return fs.readFileSync(fullPath, 'utf8');
        }
        return null;
    } catch (_error) {
        console.warn(`⚠️ Could not read file: ${filePath}`);
        return null;
    }
}

// Create backup directory
function createBackup() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        console.log(`✅ Created backup directory: ${BACKUP_DIR}`);
    }
}

// Consolidate a single folder
function consolidateFolder(folderName) {
    console.log(`📁 Processing folder: ${folderName}`);

    const markdownFiles = getMarkdownFiles(folderName);

    if (markdownFiles.length === 0) {
        console.log(`  ⚠️ No markdown files found in ${folderName}`);
        return { success: false, fileCount: 0 };
    }

    // Create consolidated filename
    const consolidatedFileName = `${folderName.toUpperCase()}_CONSOLIDATED.md`;

    let consolidatedContent = '';
    let validSources = [];

    // Header for consolidated file
    consolidatedContent += `# ${folderName.charAt(0).toUpperCase() + folderName.slice(1)} Documentation Consolidated\n\n`;
    consolidatedContent += `**Generated:** ${NOW.toLocaleDateString()} ${NOW.toLocaleTimeString()}\n`;
    consolidatedContent += `**Folder:** \`docs/${folderName}\`\n`;
    consolidatedContent += `**Files Consolidated:** ${markdownFiles.length}\n`;
    consolidatedContent += `**Source Files:** ${markdownFiles.map(f => path.basename(f)).join(', ')}\n\n`;
    consolidatedContent += `---\n\n`;

    // Add table of contents
    consolidatedContent += `## Table of Contents\n\n`;
    markdownFiles.forEach((file, index) => {
        const sectionTitle = path.basename(file, '.md').replace(/_/g, ' ');
        const anchor = sectionTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
        consolidatedContent += `${index + 1}. [${sectionTitle}](#${anchor})\n`;
    });
    consolidatedContent += `\n---\n\n`;

    // Process each file in the folder
    markdownFiles.forEach((file, index) => {
        const content = readFileContent(file);

        if (content) {
            validSources.push(file);

            // Add section header
            const sectionTitle = path.basename(file, '.md').replace(/_/g, ' ');
            consolidatedContent += `## ${index + 1}. ${sectionTitle}\n\n`;
            consolidatedContent += `**Source File:** \`${file}\`\n`;
            consolidatedContent += `**Last Modified:** ${fs.statSync(path.join(DOCS_DIR, file)).mtime.toLocaleDateString()}\n\n`;

            // Add content (remove existing top-level title if present)
            let cleanContent = content
                .replace(/^#\s+.*$/m, '')  // Remove first # title
                .replace(/^#{1,6}\s+/gm, (match) => '#' + match)  // Increase heading levels
                .trim();

            consolidatedContent += cleanContent + '\n\n';
            consolidatedContent += `---\n\n`;

            console.log(`  ✅ Merged: ${path.basename(file)}`);
        } else {
            console.log(`  ⚠️ Skipped: ${path.basename(file)} (could not read)`);
        }
    });

    // Write consolidated file to root docs directory
    const targetPath = path.join(DOCS_DIR, consolidatedFileName);
    fs.writeFileSync(targetPath, consolidatedContent);
    console.log(`  🎯 Created: ${consolidatedFileName} (${validSources.length} files merged)\n`);

    return {
        success: true,
        fileCount: validSources.length,
        consolidatedFile: consolidatedFileName,
        sourceFiles: validSources
    };
}

// Backup and remove original folders
function backupAndRemoveFolders(consolidationResults) {
    console.log('🔄 Backing up and removing original folders...\n');

    // Create full backup of all directories before removal
    const folders = getDocsFolders();

    folders.forEach(folderName => {
        const sourcePath = path.join(DOCS_DIR, folderName);
        const backupPath = path.join(BACKUP_DIR, folderName);

        if (fs.existsSync(sourcePath)) {
            // Copy entire directory to backup
            copyDirectoryRecursive(sourcePath, backupPath);
            console.log(`  📦 Backed up folder: ${folderName}`);

            // Remove original directory
            fs.rmSync(sourcePath, { recursive: true, force: true });
            console.log(`  🗑️ Removed folder: ${folderName}`);
        }
    });
}

// Recursive directory copy function
function copyDirectoryRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectoryRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Generate comprehensive summary
function generateComprehensiveSummary(consolidationResults) {
    const totalFiles = consolidationResults.reduce((sum, result) => sum + result.fileCount, 0);
    const successfulConsolidations = consolidationResults.filter(r => r.success).length;

    const summaryContent = `# Complete Documentation Consolidation Summary

**Date:** ${NOW.toLocaleDateString()} ${NOW.toLocaleTimeString()}
**Total Folders Processed:** ${consolidationResults.length}
**Successful Consolidations:** ${successfulConsolidations}
**Total Files Consolidated:** ${totalFiles}

## Consolidation Results

${consolidationResults.map(result => {
        if (result.success) {
            return `### ✅ ${result.consolidatedFile}
- **Source Folder:** \`docs/${result.consolidatedFile.toLowerCase().replace('_consolidated.md', '')}\`
- **Files Merged:** ${result.fileCount}
- **Status:** Successfully consolidated`;
        } else {
            return `### ⚠️ ${result.folderName}
- **Status:** No markdown files found or consolidation failed`;
        }
    }).join('\n\n')}

## File Structure After Consolidation

### Root Documentation Files
${consolidationResults
            .filter(r => r.success)
            .map(r => `- \`${r.consolidatedFile}\` (${r.fileCount} files consolidated)`)
            .join('\n')}

### Existing Comprehensive Files
- \`COMPREHENSIVE_PILOTBUDDY_INTELLIGENCE.md\`
- \`COMPREHENSIVE_DEVELOPMENT_WORKFLOW.md\`
- \`COMPREHENSIVE_TESTING_INFRASTRUCTURE.md\`
- \`COMPREHENSIVE_SYSTEM_ARCHITECTURE.md\`
- \`COMPREHENSIVE_SECURITY_PROTOCOLS.md\`
- \`COMPREHENSIVE_MOBILE_PERFORMANCE.md\`
- \`COMPREHENSIVE_PROJECT_STATUS.md\`

## Benefits Achieved

- ✅ **Complete Folder Consolidation**: Each docs subfolder consolidated into a single comprehensive file
- ✅ **Improved Navigation**: All documentation accessible from root docs directory
- ✅ **Eliminated Nested Structure**: Simplified docs organization for better discoverability
- ✅ **Preserved All Content**: Complete backup of original folder structure
- ✅ **Enhanced Search**: Easier to search within consolidated documents
- ✅ **Reduced Complexity**: Simplified documentation maintenance

## Backup Information

**Complete Backup Location:** \`${BACKUP_DIR}\`
- Original folder structure preserved
- All files backed up before removal
- Safe restoration possible if needed

## Next Steps

1. **Validate Content**: Review consolidated files for completeness
2. **Update References**: Update any internal links that reference old folder structure
3. **Test Navigation**: Ensure all documentation is easily discoverable
4. **Consider Cleanup**: Remove backup directory after validation (optional)
`;

    fs.writeFileSync(path.join(DOCS_DIR, 'COMPLETE_CONSOLIDATION_SUMMARY.md'), summaryContent);
    console.log('📋 Generated comprehensive consolidation summary');
}

// Main execution
function main() {
    try {
        console.log('🏗️ RankPilot Complete Documentation Consolidation');
        console.log('==============================================\n');

        createBackup();

        const folders = getDocsFolders();

        if (folders.length === 0) {
            console.log('ℹ️ No subdirectories found in docs folder');
            return;
        }

        console.log(`📊 Found ${folders.length} folders to consolidate: ${folders.join(', ')}\n`);

        const consolidationResults = [];

        // Consolidate each folder
        folders.forEach(folderName => {
            const result = consolidateFolder(folderName);
            consolidationResults.push({
                folderName,
                ...result
            });
        });

        // Backup and remove original folders
        backupAndRemoveFolders(consolidationResults);

        // Generate summary
        generateComprehensiveSummary(consolidationResults);

        console.log('\n✅ Complete documentation consolidation finished!');
        console.log(`📊 Results: ${consolidationResults.filter(r => r.success).length}/${consolidationResults.length} folders successfully consolidated`);
        console.log(`📁 Total files: ${consolidationResults.reduce((sum, r) => sum + r.fileCount, 0)} consolidated`);
        console.log(`💾 Full backup: ${BACKUP_DIR}`);
        console.log('\n🎯 All docs subdirectories have been consolidated into root-level files!');

    } catch (error) {
        console.error('❌ Complete consolidation failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
