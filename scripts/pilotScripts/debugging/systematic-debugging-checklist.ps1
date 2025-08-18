#!/usr/bin/env pwsh
<#
.SYNOPSIS
Systematic Debugging Checklist for RankPilot - Enforces PilotBuddy V01 Standards

.DESCRIPTION
This script enforces systematic debugging approach by guiding through mandatory validation steps.
Based on PilotBuddy V01 LEGENDARY EDITION standards for debugging excellence.

.PARAMETER Problem
Description of the problem being debugged

.PARAMETER AutoValidate
Automatically run validation checks where possible

.EXAMPLE
.\systematic-debugging-checklist.ps1 -Problem "Infinite retry in performance tests"

.EXAMPLE  
.\systematic-debugging-checklist.ps1 -Problem "GitHub Actions failing" -AutoValidate
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Problem,
    
    [Parameter(Mandatory = $false)]
    [switch]$AutoValidate = $false,
    
    [Parameter(Mandatory = $false)]
    [switch]$DryRun = $false
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Magenta = "`e[35m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

# Session tracking
$SessionId = "debug-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$SessionStart = Get-Date
$CompletedSteps = @()

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "${Cyan}=" * 80 + $Reset
    Write-Host "${Cyan}  $Title" + $Reset  
    Write-Host "${Cyan}=" * 80 + $Reset
    Write-Host ""
}

function Write-Step {
    param([string]$StepName, [string]$Description, [bool]$Required = $true)
    $RequiredText = if ($Required) { "${Red}[REQUIRED]${Reset}" } else { "${Yellow}[OPTIONAL]${Reset}" }
    Write-Host "${Blue}🔍 $StepName${Reset} $RequiredText"
    Write-Host "   $Description"
    Write-Host ""
}

function Confirm-Step {
    param([string]$StepId, [string]$StepName)
    
    if ($DryRun) {
        Write-Host "${Yellow}[DRY RUN] Would prompt for: $StepName${Reset}"
        return $true
    }
    
    $completed = Read-Host "   ${Green}✅ Completed $StepName? (y/n/skip)${Reset}"
    
    if ($completed -eq 'y' -or $completed -eq 'yes') {
        $result = Read-Host "   ${Blue}📝 Brief result/finding${Reset}"
        $script:CompletedSteps += @{
            Id = $StepId
            Name = $StepName  
            Result = $result
            Timestamp = Get-Date
        }
        Write-Host "${Green}   ✅ Step completed and recorded${Reset}"
        return $true
    }
    elseif ($completed -eq 'skip') {
        Write-Host "${Yellow}   ⚠️  Step skipped (not recommended)${Reset}"
        return $false
    }
    else {
        Write-Host "${Red}   ❌ Step not completed - please complete before proceeding${Reset}"
        return $false
    }
}

function Test-Configuration {
    Write-Host "${Cyan}🔧 AUTOMATED CONFIGURATION VALIDATION${Reset}"
    
    $issues = @()
    
    # Check environment files
    $envFiles = @('.env', '.env.local', '.env.development')
    foreach ($envFile in $envFiles) {
        if (Test-Path $envFile) {
            Write-Host "${Green}✅ Found: $envFile${Reset}"
            
            # Check for common URL mismatches
            $content = Get-Content $envFile -Raw
            if ($content -match 'TEST_BASE_URL.*localhost.*PERFORMANCE_URL.*firebase') {
                $issues += "URL mismatch detected in $envFile"
            }
        }
        else {
            Write-Host "${Yellow}⚠️  Missing: $envFile${Reset}"
        }
    }
    
    # Check package.json scripts
    if (Test-Path 'package.json') {
        $package = Get-Content 'package.json' | ConvertFrom-Json
        Write-Host "${Green}✅ Package.json found${Reset}"
        
        if (-not $package.scripts) {
            $issues += "No scripts section in package.json"
        }
    }
    else {
        $issues += "Missing package.json"
    }
    
    # Check configuration files
    $configFiles = @('next.config.ts', 'playwright.config.ts', 'firebase.json')
    foreach ($configFile in $configFiles) {
        if (Test-Path $configFile) {
            Write-Host "${Green}✅ Found: $configFile${Reset}"
        }
        else {
            Write-Host "${Yellow}⚠️  Missing: $configFile${Reset}"
        }
    }
    
    if ($issues.Count -eq 0) {
        Write-Host "${Green}🎯 Configuration validation passed${Reset}"
        return $true
    }
    else {
        Write-Host "${Red}❌ Configuration issues found:${Reset}"
        foreach ($issue in $issues) {
            Write-Host "${Red}   - $issue${Reset}"
        }
        return $false
    }
}

function Test-RecentChanges {
    Write-Host "${Cyan}📋 AUTOMATED RECENT CHANGES CHECK${Reset}"
    
    # Check recent commits
    try {
        $recentCommits = git log --oneline -10 2>$null
        if ($recentCommits) {
            Write-Host "${Green}✅ Recent commits (last 10):${Reset}"
            $recentCommits | ForEach-Object { Write-Host "   $_" }
        }
    }
    catch {
        Write-Host "${Yellow}⚠️  Could not retrieve git history${Reset}"
    }
    
    # Check for recent dependency changes
    if (Test-Path 'package-lock.json') {
        $lockModified = (Get-Item 'package-lock.json').LastWriteTime
        $daysSinceModified = (Get-Date) - $lockModified | Select-Object -ExpandProperty Days
        
        if ($daysSinceModified -lt 7) {
            Write-Host "${Yellow}⚠️  package-lock.json modified $daysSinceModified days ago${Reset}"
            Write-Host "${Yellow}   Consider if dependency changes could be related${Reset}"
        }
        else {
            Write-Host "${Green}✅ No recent dependency changes${Reset}"
        }
    }
    
    return $true
}

function Start-SystematicDebugging {
    Write-Header "🚀 RANKPILOT SYSTEMATIC DEBUGGING SESSION"
    
    Write-Host "${Magenta}Session ID: $SessionId${Reset}"
    Write-Host "${Magenta}Problem: $Problem${Reset}"
    Write-Host "${Magenta}Started: $SessionStart${Reset}"
    Write-Host "${Magenta}Mode: $(if ($AutoValidate) { 'Auto-Validate' } else { 'Interactive' })${Reset}"
    
    if ($DryRun) {
        Write-Host "${Yellow}🔍 DRY RUN MODE - No changes will be made${Reset}"
    }
    
    Write-Host ""
    Write-Host "${Red}⚠️  SYSTEMATIC APPROACH REQUIRED${Reset}"
    Write-Host "${Red}   Complete ALL required steps before proceeding with complex debugging${Reset}"
    Write-Host ""
}

function Invoke-SystematicSteps {
    $allSteps = @(
        @{ Id = "config"; Name = "Configuration Validation"; Description = "Check environment variables, URLs, file paths, and basic configuration"; Required = $true; AutoCheck = $true },
        @{ Id = "error"; Name = "Error Analysis"; Description = "Analyze actual error messages, stack traces, and logs"; Required = $true; AutoCheck = $false },
        @{ Id = "changes"; Name = "Recent Changes Review"; Description = "Check recent commits, dependency changes, configuration updates"; Required = $true; AutoCheck = $true },
        @{ Id = "environment"; Name = "Environment Consistency"; Description = "Verify dev vs prod consistency, dependency versions"; Required = $true; AutoCheck = $false },
        @{ Id = "patterns"; Name = "Pattern Recognition"; Description = "Check against known patterns and previous solutions"; Required = $true; AutoCheck = $false },
        @{ Id = "isolation"; Name = "Problem Isolation"; Description = "Isolate problem to specific components or services"; Required = $false; AutoCheck = $false },
        @{ Id = "hypothesis"; Name = "Hypothesis Testing"; Description = "Test specific hypotheses systematically"; Required = $false; AutoCheck = $false },
        @{ Id = "validation"; Name = "Solution Validation"; Description = "Validate solution and capture for future reference"; Required = $true; AutoCheck = $false }
    )
    
    $requiredStepsCompleted = 0
    $totalRequiredSteps = ($allSteps | Where-Object { $_.Required }).Count
    
    foreach ($step in $allSteps) {
        Write-Step -StepName $step.Name -Description $step.Description -Required $step.Required
        
        $stepCompleted = $false
        
        # Auto-validation for supported steps
        if ($AutoValidate -and $step.AutoCheck) {
            Write-Host "${Blue}🤖 Running automated validation...${Reset}"
            
            switch ($step.Id) {
                "config" { $stepCompleted = Test-Configuration }
                "changes" { $stepCompleted = Test-RecentChanges }
            }
            
            if ($stepCompleted) {
                Write-Host "${Green}✅ Automated validation passed${Reset}"
            }
            else {
                Write-Host "${Red}❌ Automated validation failed - manual review required${Reset}"
                $stepCompleted = Confirm-Step -StepId $step.Id -StepName $step.Name
            }
        }
        else {
            $stepCompleted = Confirm-Step -StepId $step.Id -StepName $step.Name
        }
        
        if ($stepCompleted -and $step.Required) {
            $requiredStepsCompleted++
        }
        
        Write-Host ""
    }
    
    # Progress validation
    $progress = [math]::Round(($requiredStepsCompleted / $totalRequiredSteps) * 100, 1)
    
    Write-Header "📊 SYSTEMATIC DEBUGGING PROGRESS"
    Write-Host "${Blue}Required Steps Completed: $requiredStepsCompleted / $totalRequiredSteps ($progress%)${Reset}"
    
    if ($progress -ge 80) {
        Write-Host "${Green}✅ SYSTEMATIC APPROACH VALIDATED${Reset}"
        Write-Host "${Green}   You can now proceed with complex debugging approaches${Reset}"
        return $true
    }
    else {
        Write-Host "${Red}❌ SYSTEMATIC APPROACH INCOMPLETE${Reset}"
        Write-Host "${Red}   Complete required steps before proceeding${Reset}"
        return $false
    }
}

function Save-Session {
    $sessionEnd = Get-Date
    $duration = $sessionEnd - $SessionStart
    
    $sessionData = @{
        SessionId = $SessionId
        Problem = $Problem
        StartTime = $SessionStart
        EndTime = $sessionEnd
        Duration = $duration.ToString()
        CompletedSteps = $CompletedSteps
        AutoValidate = $AutoValidate.IsPresent
    }
    
    # Save to session file
    $sessionFile = "sessions/systematic-debugging-$SessionId.json"
    
    if (-not (Test-Path "sessions")) {
        New-Item -ItemType Directory -Path "sessions" -Force | Out-Null
    }
    
    $sessionData | ConvertTo-Json -Depth 10 | Out-File $sessionFile -Encoding UTF8
    
    Write-Host "${Green}💾 Session saved: $sessionFile${Reset}"
    Write-Host "${Green}📊 Duration: $($duration.TotalMinutes.ToString('F1')) minutes${Reset}"
}

# Main execution
try {
    Start-SystematicDebugging
    
    $success = Invoke-SystematicSteps
    
    Save-Session
    
    if ($success) {
        Write-Header "🎯 SYSTEMATIC DEBUGGING COMPLETE"
        Write-Host "${Green}✅ All required systematic steps completed${Reset}"
        Write-Host "${Green}🚀 You can now proceed with confidence${Reset}"
        exit 0
    }
    else {
        Write-Header "❌ SYSTEMATIC DEBUGGING INCOMPLETE"  
        Write-Host "${Red}⚠️  Please complete required steps before proceeding${Reset}"
        exit 1
    }
}
catch {
    Write-Host "${Red}❌ Error in systematic debugging: $($_.Exception.Message)${Reset}"
    exit 1
}
