# RankPilot Design System Consistency Fixer
# Applies homepage's professional NeuroSEO design patterns to all app pages
param(
    [switch]$DryRun = $false,
    [string]$TargetPath = "src\app\(app)"
)

function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }

Write-Host "RankPilot Design System Consistency Fixer" -ForegroundColor Magenta
Write-Host "Applying NeuroSEO design patterns for 100% compliance" -ForegroundColor Blue
Write-Host ""

# Design system mappings based on homepage and site-header patterns
$colorMappings = @{
    'text-red-500' = 'text-destructive-foreground'
    'border-red-500' = 'border-destructive'
    'bg-red-500' = 'bg-destructive'
    'text-green-500' = 'text-success-foreground'
    'border-green-500' = 'border-success'
    'text-blue-500' = 'text-primary'
    'text-gray-500' = 'text-muted-foreground'
    'text-gray-600' = 'text-muted-foreground'
}

# Get all TypeScript React files
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
    
    Write-Host "Processing: $relativePath"
    
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        
        # Apply color mappings
        foreach ($oldColor in $colorMappings.Keys) {
            $newColor = $colorMappings[$oldColor]
            $beforeCount = ([regex]::Matches($content, [regex]::Escape($oldColor))).Count
            $content = $content -replace [regex]::Escape($oldColor), $newColor
            
            if ($beforeCount -gt 0) {
                Write-Success "  Replaced $beforeCount instances of '$oldColor' with '$newColor'"
                $fileChanges += $beforeCount
            }
        }
        
        # Write changes if not dry run
        if (-not $DryRun -and $content -ne $originalContent) {
            Set-Content $file.FullName $content -Encoding UTF8
            $filesModified++
        }
        
        if ($fileChanges -gt 0) {
            $totalChanges += $fileChanges
        }
        
    } catch {
        Write-Error "Failed to process $relativePath : $($_.Exception.Message)"
    }
}

# Summary
Write-Host ""
Write-Host "DESIGN SYSTEM CONSISTENCY SUMMARY" -ForegroundColor Magenta
if ($DryRun) {
    Write-Warning "DRY RUN MODE - No files were actually modified"
}
Write-Success "Files processed: $($files.Count)"
Write-Success "Files with changes: $filesModified" 
Write-Success "Total transformations: $totalChanges"

if ($totalChanges -gt 0) {
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Review changes and test functionality"
    Write-Host "2. Run 'npm run lint:fix' to ensure code quality"
    Write-Host "3. Run tests to validate components"
}
