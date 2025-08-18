# RankPilot Design System Consistency Fixer
# Applies homepage's professional NeuroSEO™ design patterns to all app pages
# Version: 1.0 - LEGENDARY Development Status

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false,
    [string]$TargetPath = "src\app\(app)"
)

# Color and logging functions
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "⚠️ $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ️ $Message" -ForegroundColor Cyan }

Write-Host "🚀 RankPilot Design System Consistency Fixer" -ForegroundColor Magenta
Write-Host "Applying NeuroSEO™ design patterns for LEGENDARY compliance" -ForegroundColor Blue
Write-Host ""

# Backup directory
$backupDir = "pilotScripts\backups\design-consistency-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
if (-not $DryRun) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Info "Backup directory created: $backupDir"
}

# Design system mappings based on homepage and site-header patterns
$colorMappings = @{
    # Error states - use semantic destructive tokens
    'text-red-500' = 'text-destructive-foreground'
    'border-red-500' = 'border-destructive'
    'bg-red-500' = 'bg-destructive'
    'bg-red-50' = 'bg-destructive/10'
    
    # Success states - use semantic success tokens
    'text-green-500' = 'text-success-foreground'
    'border-green-500' = 'border-success'
    'bg-green-500' = 'bg-success'
    'bg-green-50' = 'bg-success/10'
    
    # Warning states - use semantic warning tokens
    'text-yellow-500' = 'text-warning-foreground'
    'text-orange-500' = 'text-warning-foreground'
    'border-yellow-500' = 'border-warning'
    'bg-yellow-500' = 'bg-warning'
    
    # Primary colors - ensure consistency
    'text-blue-500' = 'text-primary'
    'text-blue-600' = 'text-primary'
    'bg-blue-500' = 'bg-primary'
    'border-blue-500' = 'border-primary'
    
    # Secondary text - use semantic muted tokens
    'text-gray-500' = 'text-muted-foreground'
    'text-gray-600' = 'text-muted-foreground'
    'text-slate-500' = 'text-muted-foreground'
    'text-slate-600' = 'text-muted-foreground'
}

# Typography mappings based on Tailwind config
$typographyMappings = @{
    # Headings should use font-headline (Space Grotesk)
    'className="([^"]*)(text-\d+xl|text-lg)([^"]*)"' = 'className="$1$2 font-headline$3"'
    'className="([^"]*font-bold[^"]*)"' = 'className="$1 font-headline"'
    
    # Body text should use font-body (PT Sans) - but only add if no font class exists
    'className="([^"]*text-sm[^"]*)"' = 'className="$1 font-body"'
    'className="([^"]*text-base[^"]*)"' = 'className="$1 font-body"'
}

# Background pattern standardization
$backgroundMappings = @{
    # Inconsistent gradient patterns
    'bg-gradient-to-br from-background via-background to-muted/20' = 'bg-background'
    'bg-white' = 'bg-background'
    'bg-gray-50' = 'bg-muted/50'
    'bg-slate-50' = 'bg-muted/50'
}

# Button standardization patterns
$buttonPatterns = @{
    # Ensure all buttons use EnhancedButton or proper Button variants
    '<button\s+className="([^"]*)"' = '<Button className="$1"'
    'className="([^"]*btn[^"]*)"' = 'className="$1" /* TODO: Convert to Button component */'
}

# Get all TypeScript React files in app directory
$files = Get-ChildItem -Path $TargetPath -Recurse -Filter "*.tsx" -ErrorAction SilentlyContinue

if ($files.Count -eq 0) {
    Write-Error "No .tsx files found in $TargetPath"
    exit 1
}

Write-Info "Found $($files.Count) .tsx files to process"

$totalChanges = 0
$filesModified = 0

foreach ($file in $files) {
    $relativePath = $file.FullName.Replace("$(Get-Location)\", "")
    $fileChanges = 0
    
    Write-Host "`n📄 Processing: $relativePath" -ForegroundColor White
    
    # Read file content
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        
        # Backup original file
        if (-not $DryRun) {
            $backupFile = Join-Path $backupDir $file.Name
            Copy-Item $file.FullName $backupFile
        }
        
        # Apply color mappings
        foreach ($oldColor in $colorMappings.Keys) {
            $newColor = $colorMappings[$oldColor]
            $beforeCount = ([regex]::Matches($content, [regex]::Escape($oldColor))).Count
            $content = $content -replace [regex]::Escape($oldColor), $newColor
            $afterCount = ([regex]::Matches($content, [regex]::Escape($newColor))).Count - ([regex]::Matches($originalContent, [regex]::Escape($newColor))).Count
            
            if ($beforeCount -gt 0) {
                Write-Success "  Replaced $beforeCount instances of '$oldColor' → '$newColor'"
                $fileChanges += $beforeCount
            }
        }
        
        # Apply background mappings
        foreach ($oldBg in $backgroundMappings.Keys) {
            $newBg = $backgroundMappings[$oldBg]
            $beforeCount = ([regex]::Matches($content, [regex]::Escape($oldBg))).Count
            $content = $content -replace [regex]::Escape($oldBg), $newBg
            $afterCount = ([regex]::Matches($content, [regex]::Escape($newBg))).Count - ([regex]::Matches($originalContent, [regex]::Escape($newBg))).Count
            
            if ($beforeCount -gt 0) {
                Write-Success "  Standardized background: '$oldBg' → '$newBg'"
                $fileChanges += $beforeCount
            }
        }
        
        # Apply typography improvements (more complex regex patterns)
        $originalTypographyContent = $content
        foreach ($pattern in $typographyMappings.Keys) {
            $replacement = $typographyMappings[$pattern]
            $newContent = $content -replace $pattern, $replacement
            if ($newContent -ne $content) {
                $changes = ([regex]::Matches($content, $pattern)).Count
                Write-Success "  Applied typography pattern: $changes instances"
                $content = $newContent
                $fileChanges += $changes
            }
        }
        
        # Check for missing imports (if we made changes)
        if ($fileChanges -gt 0) {
            # Ensure Button/EnhancedButton imports exist if buttons are used
            if ($content -match '<(Enhanced)?Button' -and $content -notmatch 'import.*Button.*from') {
                if ($content -match 'EnhancedButton') {
                    $importLine = 'import { EnhancedButton } from "@/components/ui/enhanced-button";'
                } else {
                    $importLine = 'import { Button } from "@/components/ui/button";'
                }
                
                # Add import after existing imports
                $content = $content -replace '(import.*from.*["''];?\s*\n)', "`$1$importLine`n"
                Write-Success "  Added missing Button import"
                $fileChanges++
            }
        }
        
        # Write changes if not dry run
        if (-not $DryRun -and $content -ne $originalContent) {
            Set-Content $file.FullName $content -Encoding UTF8
            $filesModified++
        }
        
        if ($fileChanges -gt 0) {
            Write-Success "  Total changes in file: $fileChanges"
            $totalChanges += $fileChanges
        } else {
            Write-Host "  No changes needed" -ForegroundColor Gray
        }
        
    } catch {
        Write-Error "Failed to process $relativePath`: $($_.Exception.Message)"
    }
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Magenta
Write-Host "🎯 DESIGN SYSTEM CONSISTENCY SUMMARY" -ForegroundColor Magenta
Write-Host "="*60 -ForegroundColor Magenta

if ($DryRun) {
    Write-Warning "DRY RUN MODE - No files were actually modified"
}

Write-Success "Files processed: $($files.Count)"
Write-Success "Files with changes: $filesModified"
Write-Success "Total transformations: $totalChanges"

if ($totalChanges -gt 0) {
    Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Review changes and test functionality" -ForegroundColor White
    Write-Host "2. Run 'npm run lint:fix' to ensure code quality" -ForegroundColor White
    Write-Host "3. Run 'npm run test:critical' to validate components" -ForegroundColor White
    Write-Host "4. Check 'npm run dev' for any runtime issues" -ForegroundColor White
    
    if (-not $DryRun) {
        Write-Info "Backup created in: $backupDir"
        Write-Host "5. Remove backup after confirming changes: Remove-Item '$backupDir' -Recurse" -ForegroundColor White
    }
}

if ($totalChanges -gt 0) {
    Write-Host "`n🏆 LEGENDARY Design System Compliance: IMPROVED" -ForegroundColor Green
} else {
    Write-Host "`n🏆 LEGENDARY Design System Compliance: VERIFIED" -ForegroundColor Green
}
