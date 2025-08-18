# Documentation Consolidation Automation Script
# Automates the entire documentation consolidation process for RankPilot
# Created: July 22, 2025
# Project: RankPilot (Studio)

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false,
    [switch]$Force = $false,
    [switch]$SkipBackup = $false,
    [string]$BackupPath = "docs-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
)

# Script configuration
$docsPath = "docs"
$logFile = "logs\consolidation-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$backupPath = $BackupPath

# Ensure logs directory exists
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force | Out-Null
}

# Consolidation mapping - defines what gets consolidated into what
$consolidationMap = @{
    "SUBSCRIPTION_TIER_COMPREHENSIVE.md" = @(
        "SUBSCRIPTION_TIER_STANDARDIZATION_SUMMARY.md",
        "USER_SUBSCRIPTION_FIX_SUMMARY.md",
        "TIER_SYSTEM.md"
    )
    "PILOTBUDDY_COMPREHENSIVE.md" = @(
        "PILOTBUDDY_AUTONOMOUS_LEARNING_SYSTEM_SUMMARY.md",
        "PILOTBUDDY_ENHANCED_AUTOMATION_SUMMARY.md"
    )
    "DEVELOPER_WORKFLOW_COMPREHENSIVE.md" = @(
        "01_EXECUTIVE_SUMMARY.md",
        "02_PRODUCT_REQUIREMENTS_DOCUMENT.md",
        "03_EXECUTION_PLAN.md",
        "04_SCALING_STRATEGY.md",
        "05_USER_WORKFLOWS.md",
        "06_UI_WIREFRAME_DESCRIPTIONS.md",
        "07_PROJECT_FLOW.md"
    )
    "SECURITY_AND_GITIGNORE_COMPREHENSIVE.md" = @(
        "GITIGNORE_STRATEGY.md",
        "SECURITY_ROTATION.md"
    )
    "MOBILE_PERFORMANCE_COMPREHENSIVE.md" = @(
        "MOBILE_ENHANCEMENT_CHECKLIST.md",
        "MOBILE_PERFORMANCE_TESTING_STRATEGY.md"
    )
}

# Template for comprehensive documents
$comprehensiveTemplate = @"
# {TITLE}

## Table of Contents

{TOC}

---

{CONTENT}

---

*Last Updated: $(Get-Date -Format 'MMMM dd, yyyy')*  
*Document Version: 1.0*  
*Consolidation Status: Complete*
"@

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry
    $logEntry | Out-File -FilePath $logFile -Append
}

function Backup-Documentation {
    if ($SkipBackup) {
        Write-Log "Skipping backup as requested" "WARNING"
        return $true
    }
    
    Write-Log "Creating documentation backup..." "INFO"
    
    try {
        if ($DryRun) {
            Write-Log "[DRY RUN] Would create backup: $backupPath" "INFO"
            return $true
        }
        
        Copy-Item $docsPath -Destination $backupPath -Recurse -Force
        Write-Log "✅ Backup created: $backupPath" "SUCCESS"
        return $true
    } catch {
        Write-Log "❌ Backup failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Test-SourceFiles {
    Write-Log "Verifying source files exist..." "INFO"
    $allSources = @()
    $missing = @()
    
    foreach ($comprehensive in $consolidationMap.Keys) {
        foreach ($source in $consolidationMap[$comprehensive]) {
            $allSources += $source
            $sourcePath = Join-Path $docsPath $source
            if (!(Test-Path $sourcePath)) {
                $missing += $source
            }
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Log "⚠️ Missing source files:" "WARNING"
        $missing | ForEach-Object { Write-Log "  - $_" "WARNING" }
        
        if (!$Force) {
            Write-Log "Use -Force to continue with missing files" "ERROR"
            return $false
        }
    }
    
    Write-Log "✅ Source file verification complete ($($allSources.Count - $missing.Count)/$($allSources.Count) found)" "SUCCESS"
    return $true
}

function Read-MarkdownContent {
    param([string]$FilePath)
    
    if (!(Test-Path $FilePath)) {
        return $null
    }
    
    $content = Get-Content $FilePath -Raw -Encoding UTF8
    return $content
}

function Generate-TableOfContents {
    param([string]$Content)
    
    $headers = $Content | Select-String -Pattern '^#{1,3}\s+(.+)' -AllMatches
    $toc = @()
    
    foreach ($match in $headers.Matches) {
        $level = ($match.Value -split ' ')[0].Length - 1
        $title = $match.Groups[1].Value
        $anchor = $title.ToLower() -replace '[^\w\s-]', '' -replace '\s+', '-'
        
        $indent = "  " * $level
        $toc += "$indent- [$title](#$anchor)"
    }
    
    return $toc -join "`n"
}

function Create-ComprehensiveDocument {
    param(
        [string]$ComprehensiveFile,
        [array]$SourceFiles
    )
    
    Write-Log "Creating comprehensive document: $ComprehensiveFile" "INFO"
    
    $comprehensivePath = Join-Path $docsPath $ComprehensiveFile
    $allContent = @()
    $title = $ComprehensiveFile -replace '_COMPREHENSIVE\.md$', '' -replace '_', ' '
    $title = (Get-Culture).TextInfo.ToTitleCase($title.ToLower())
    
    # Collect content from source files
    foreach ($sourceFile in $SourceFiles) {
        $sourcePath = Join-Path $docsPath $sourceFile
        $content = Read-MarkdownContent $sourcePath
        
        if ($content) {
            Write-Log "  📄 Processing: $sourceFile" "INFO"
            
            # Remove document-level headers and metadata
            $content = $content -replace '^# .+\n', ''
            $content = $content -replace '(?m)^---\n.*?^---\n', ''
            $content = $content.Trim()
            
            # Add section header
            $sectionTitle = $sourceFile -replace '\.md$', '' -replace '_', ' ' -replace '^\d+\s*', ''
            $sectionTitle = (Get-Culture).TextInfo.ToTitleCase($sectionTitle.ToLower())
            
            $allContent += "## $sectionTitle"
            $allContent += ""
            $allContent += $content
            $allContent += ""
            $allContent += "---"
            $allContent += ""
        } else {
            Write-Log "  ⚠️ Could not read: $sourceFile" "WARNING"
        }
    }
    
    # Generate final content
    $finalContent = $allContent -join "`n"
    $toc = Generate-TableOfContents $finalContent
    
    $document = $comprehensiveTemplate -replace '{TITLE}', "# $title Comprehensive Guide"
    $document = $document -replace '{TOC}', $toc
    $document = $document -replace '{CONTENT}', $finalContent
    
    if ($DryRun) {
        Write-Log "[DRY RUN] Would create: $ComprehensiveFile ($($document.Length) chars)" "INFO"
        return $true
    }
    
    try {
        $document | Out-File -FilePath $comprehensivePath -Encoding UTF8 -Force
        Write-Log "✅ Created: $ComprehensiveFile" "SUCCESS"
        return $true
    } catch {
        Write-Log "❌ Failed to create $ComprehensiveFile`: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Update-ExistingComprehensive {
    param(
        [string]$ComprehensiveFile,
        [array]$SourceFiles
    )
    
    $comprehensivePath = Join-Path $docsPath $ComprehensiveFile
    
    if (Test-Path $comprehensivePath) {
        Write-Log "Updating existing comprehensive document: $ComprehensiveFile" "INFO"
        
        # For existing files, append new content sections
        $existingContent = Read-MarkdownContent $comprehensivePath
        $newSections = @()
        
        foreach ($sourceFile in $SourceFiles) {
            $sourcePath = Join-Path $docsPath $sourceFile
            $content = Read-MarkdownContent $sourcePath
            
            if ($content) {
                $sectionTitle = $sourceFile -replace '\.md$', '' -replace '_', ' '
                $sectionTitle = (Get-Culture).TextInfo.ToTitleCase($sectionTitle.ToLower())
                
                # Check if section already exists
                if ($existingContent -notmatch "## $sectionTitle") {
                    $content = $content -replace '^# .+\n', ''
                    $content = $content.Trim()
                    
                    $newSections += "## $sectionTitle"
                    $newSections += ""
                    $newSections += $content
                    $newSections += ""
                    $newSections += "---"
                    $newSections += ""
                }
            }
        }
        
        if ($newSections.Count -gt 0) {
            $updatedContent = $existingContent + "`n`n" + ($newSections -join "`n")
            
            if (!$DryRun) {
                $updatedContent | Out-File -FilePath $comprehensivePath -Encoding UTF8 -Force
                Write-Log "✅ Updated: $ComprehensiveFile" "SUCCESS"
            } else {
                Write-Log "[DRY RUN] Would update: $ComprehensiveFile" "INFO"
            }
        }
    } else {
        # Create new if doesn't exist
        Create-ComprehensiveDocument $ComprehensiveFile $SourceFiles
    }
}

function Process-Consolidations {
    Write-Log "Processing consolidation mappings..." "INFO"
    $successCount = 0
    $failureCount = 0
    
    foreach ($comprehensive in $consolidationMap.Keys) {
        $sources = $consolidationMap[$comprehensive]
        
        try {
            if ($comprehensive -eq "MOBILE_PERFORMANCE_COMPREHENSIVE.md") {
                # Special handling for existing file
                Update-ExistingComprehensive $comprehensive $sources
            } else {
                Create-ComprehensiveDocument $comprehensive $sources
            }
            $successCount++
        } catch {
            Write-Log "❌ Failed to process $comprehensive`: $($_.Exception.Message)" "ERROR"
            $failureCount++
        }
    }
    
    return @{
        Success = $successCount
        Failed = $failureCount
    }
}

function Cleanup-SourceFiles {
    Write-Log "Cleaning up source files..." "INFO"
    $allSources = @()
    
    foreach ($comprehensive in $consolidationMap.Keys) {
        $allSources += $consolidationMap[$comprehensive]
    }
    
    $deletedCount = 0
    $failedCount = 0
    
    foreach ($sourceFile in $allSources) {
        $sourcePath = Join-Path $docsPath $sourceFile
        
        if (Test-Path $sourcePath) {
            try {
                if ($DryRun) {
                    Write-Log "[DRY RUN] Would delete: $sourceFile" "INFO"
                    $deletedCount++
                } else {
                    Remove-Item $sourcePath -Force
                    Write-Log "🗑️ Deleted: $sourceFile" "SUCCESS"
                    $deletedCount++
                }
            } catch {
                Write-Log "❌ Failed to delete $sourceFile`: $($_.Exception.Message)" "ERROR"
                $failedCount++
            }
        }
    }
    
    return @{
        Deleted = $deletedCount
        Failed = $failedCount
    }
}

function Update-DocsReadme {
    Write-Log "Updating docs README with comprehensive file links..." "INFO"
    
    $readmePath = Join-Path $docsPath "README.md"
    $comprehensiveFiles = $consolidationMap.Keys | Sort-Object
    
    $readmeContent = @"
# RankPilot Documentation

## Comprehensive Documentation

The following comprehensive guides provide complete documentation for all aspects of the RankPilot project:

"@
    
    foreach ($file in $comprehensiveFiles) {
        $title = $file -replace '_COMPREHENSIVE\.md$', '' -replace '_', ' '
        $title = (Get-Culture).TextInfo.ToTitleCase($title.ToLower())
        $readmeContent += "- [$title](./$file)`n"
    }
    
    $readmeContent += @"

## Additional Documentation

For specific technical documentation, see the remaining files in this directory.

---

*Last Updated: $(Get-Date -Format 'MMMM dd, yyyy')*
*Consolidation Complete: $(Get-Date -Format 'yyyy-MM-dd')*
"@
    
    if (!$DryRun) {
        $readmeContent | Out-File -FilePath $readmePath -Encoding UTF8 -Force
        Write-Log "✅ Updated docs README.md" "SUCCESS"
    } else {
        Write-Log "[DRY RUN] Would update docs README.md" "INFO"
    }
}

function Show-ConsolidationSummary {
    param($consolidationResults, $cleanupResults)
    
    Write-Log "" "INFO"
    Write-Log "📋 CONSOLIDATION SUMMARY" "INFO"
    Write-Log "========================" "INFO"
    
    if ($DryRun) {
        Write-Log "Mode: DRY RUN (no changes made)" "INFO"
    } else {
        Write-Log "Mode: LIVE CONSOLIDATION" "INFO"
    }
    
    Write-Log "Comprehensive documents created: $($consolidationResults.Success)" "INFO"
    Write-Log "Failed consolidations: $($consolidationResults.Failed)" "INFO"
    Write-Log "Source files deleted: $($cleanupResults.Deleted)" "INFO"
    Write-Log "Failed deletions: $($cleanupResults.Failed)" "INFO"
    Write-Log "Backup location: $backupPath" "INFO"
    Write-Log "Log file: $logFile" "INFO"
}

# Main execution
try {
    Write-Log "🚀 Documentation Consolidation Automation Started" "INFO"
    Write-Log "Working directory: $(Get-Location)" "INFO"
    
    if ($DryRun) {
        Write-Log "⚠️ DRY RUN MODE - No changes will be made" "WARNING"
    }
    
    # Step 1: Create backup
    if (!(Backup-Documentation)) {
        Write-Log "❌ Backup failed. Aborting consolidation." "ERROR"
        exit 1
    }
    
    # Step 2: Verify source files
    if (!(Test-SourceFiles)) {
        Write-Log "❌ Source file verification failed." "ERROR"
        exit 1
    }
    
    # Step 3: Confirm with user unless in DryRun mode
    if (!$DryRun -and !$Force) {
        Write-Host ""
        Write-Host "⚠️ This will consolidate $($consolidationMap.Keys.Count) comprehensive documents from $((($consolidationMap.Values | Measure-Object -Sum Count).Sum)) source files." -ForegroundColor Yellow
        Write-Host "Continue? (y/N): " -NoNewline -ForegroundColor Yellow
        $response = Read-Host
        
        if ($response -notmatch '^[Yy]$') {
            Write-Log "Operation cancelled by user" "INFO"
            exit 0
        }
    }
    
    # Step 4: Process consolidations
    $consolidationResults = Process-Consolidations
    
    # Step 5: Update README
    Update-DocsReadme
    
    # Step 6: Clean up source files
    $cleanupResults = Cleanup-SourceFiles
    
    # Step 7: Show summary
    Show-ConsolidationSummary $consolidationResults $cleanupResults
    
    if ($consolidationResults.Failed -eq 0 -and $cleanupResults.Failed -eq 0) {
        Write-Log "✅ Documentation consolidation completed successfully" "SUCCESS"
        exit 0
    } else {
        Write-Log "⚠️ Documentation consolidation completed with errors" "WARNING"
        exit 1
    }
    
} catch {
    Write-Log "❌ Script failed: $($_.Exception.Message)" "ERROR"
    Write-Log "Stack trace: $($_.ScriptStackTrace)" "ERROR"
    exit 1
}
