# Documentation Cleanup Script
# Safely removes consolidated source files after documentation consolidation
# Created: July 22, 2025
# Project: RankPilot (Studio)

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false,
    [switch]$Force = $false
)

# Script configuration
$docsPath = "docs"
$logFile = "logs\doc-cleanup-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# Ensure logs directory exists
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force | Out-Null
}

# Consolidated source files to remove
$sourceFiles = @(
    "01_EXECUTIVE_SUMMARY.md",
    "02_PRODUCT_REQUIREMENTS_DOCUMENT.md", 
    "03_EXECUTION_PLAN.md",
    "04_SCALING_STRATEGY.md",
    "05_USER_WORKFLOWS.md",
    "06_UI_WIREFRAME_DESCRIPTIONS.md",
    "07_PROJECT_FLOW.md",
    "GITIGNORE_STRATEGY.md",
    "MOBILE_ENHANCEMENT_CHECKLIST.md",
    "MOBILE_PERFORMANCE_TESTING_STRATEGY.md",
    "PILOTBUDDY_AUTONOMOUS_LEARNING_SYSTEM_SUMMARY.md",
    "PILOTBUDDY_ENHANCED_AUTOMATION_SUMMARY.md",
    "PROJECT_ORGANIZATION_UPDATE.md",
    "SECURITY_ROTATION.md",
    "SUBSCRIPTION_TIER_STANDARDIZATION_SUMMARY.md",
    "TIER_SYSTEM.md",
    "USER_SUBSCRIPTION_FIX_SUMMARY.md"
)

# Comprehensive files to preserve (safety check)
$comprehensiveFiles = @(
    "CONFIGURATION_COMPREHENSIVE.md",
    "DEVELOPER_WORKFLOW_COMPREHENSIVE.md",
    "MOBILE_PERFORMANCE_COMPREHENSIVE.md",
    "PILOTBUDDY_COMPREHENSIVE.md",
    "PROJECT_COMPREHENSIVE.md",
    "SECURITY_AND_GITIGNORE_COMPREHENSIVE.md",
    "SUBSCRIPTION_TIER_COMPREHENSIVE.md",
    "TESTING_COMPREHENSIVE.md",
    "UI_UX_COMPREHENSIVE.md"
)

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry
    $logEntry | Out-File -FilePath $logFile -Append
}

function Test-ComprehensiveFiles {
    Write-Log "Verifying comprehensive files exist..." "INFO"
    $missing = @()
    
    foreach ($file in $comprehensiveFiles) {
        $filePath = Join-Path $docsPath $file
        if (!(Test-Path $filePath)) {
            $missing += $file
        } else {
            if ($Verbose) { Write-Log "✓ Found: $file" "VERBOSE" }
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Log "⚠️ Missing comprehensive files:" "WARNING"
        $missing | ForEach-Object { Write-Log "  - $_" "WARNING" }
        return $false
    }
    
    Write-Log "✅ All $($comprehensiveFiles.Count) comprehensive files verified" "SUCCESS"
    return $true
}

function Remove-SourceFiles {
    Write-Log "Starting source file cleanup..." "INFO"
    $deletedCount = 0
    $failedCount = 0
    $totalSize = 0
    
    foreach ($file in $sourceFiles) {
        $filePath = Join-Path $docsPath $file
        
        if (Test-Path $filePath) {
            try {
                $fileInfo = Get-Item $filePath
                $fileSize = $fileInfo.Length
                $totalSize += $fileSize
                
                if ($DryRun) {
                    Write-Log "[DRY RUN] Would delete: $file ($($fileSize) bytes)" "INFO"
                    $deletedCount++
                } else {
                    Remove-Item $filePath -Force
                    Write-Log "🗑️ Deleted: $file ($($fileSize) bytes)" "SUCCESS"
                    $deletedCount++
                }
            } catch {
                Write-Log "❌ Failed to delete: $file - $($_.Exception.Message)" "ERROR"
                $failedCount++
            }
        } else {
            if ($Verbose) { Write-Log "⚠️ File not found: $file" "WARNING" }
        }
    }
    
    return @{
        Deleted = $deletedCount
        Failed = $failedCount
        TotalSize = $totalSize
    }
}

function Show-Summary {
    param($results)
    
    Write-Log "" "INFO"
    Write-Log "📋 CLEANUP SUMMARY" "INFO"
    Write-Log "==================" "INFO"
    
    if ($DryRun) {
        Write-Log "Mode: DRY RUN (no files deleted)" "INFO"
    } else {
        Write-Log "Mode: LIVE CLEANUP" "INFO"
    }
    
    Write-Log "Files processed: $($results.Deleted)" "INFO"
    Write-Log "Failed deletions: $($results.Failed)" "INFO"
    Write-Log "Total space freed: $([math]::Round($results.TotalSize / 1KB, 2)) KB" "INFO"
    Write-Log "Comprehensive files preserved: $($comprehensiveFiles.Count)" "INFO"
    Write-Log "Log file: $logFile" "INFO"
}

# Main execution
try {
    Write-Log "🧹 Documentation Cleanup Script Started" "INFO"
    Write-Log "Working directory: $(Get-Location)" "INFO"
    
    if ($DryRun) {
        Write-Log "⚠️ DRY RUN MODE - No files will be deleted" "WARNING"
    }
    
    # Safety check: Verify comprehensive files exist
    if (!(Test-ComprehensiveFiles)) {
        if (!$Force) {
            Write-Log "❌ Safety check failed. Use -Force to override." "ERROR"
            exit 1
        } else {
            Write-Log "⚠️ Safety check failed but continuing due to -Force flag" "WARNING"
        }
    }
    
    # Confirm with user unless in DryRun mode
    if (!$DryRun -and !$Force) {
        Write-Host ""
        Write-Host "⚠️ This will permanently delete $($sourceFiles.Count) consolidated source files." -ForegroundColor Yellow
        Write-Host "Continue? (y/N): " -NoNewline -ForegroundColor Yellow
        $response = Read-Host
        
        if ($response -notmatch '^[Yy]$') {
            Write-Log "Operation cancelled by user" "INFO"
            exit 0
        }
    }
    
    # Perform cleanup
    $results = Remove-SourceFiles
    
    # Show summary
    Show-Summary $results
    
    if ($results.Failed -eq 0) {
        Write-Log "✅ Documentation cleanup completed successfully" "SUCCESS"
        exit 0
    } else {
        Write-Log "⚠️ Documentation cleanup completed with errors" "WARNING"
        exit 1
    }
    
} catch {
    Write-Log "❌ Script failed: $($_.Exception.Message)" "ERROR"
    exit 1
}
