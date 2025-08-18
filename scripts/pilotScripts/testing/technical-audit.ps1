# RankPilot Technical Audit Automation Script
# Generated: July 24, 2025
# Purpose: Automated technical audit for production deployment validation

param(
    [Parameter(Mandatory=$false)]
    [string]$DeploymentUrl = "https://rankpilot-h3jpc.web.app",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("Full", "Critical", "Performance", "Mobile", "Security")]
    [string]$AuditType = "Full",
    
    [Parameter(Mandatory=$false)]
    [switch]$GenerateReport,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose
)

# Import required modules
if (Get-Module -ListAvailable -Name PowerShellGet) {
    Write-Host "✅ PowerShell modules available" -ForegroundColor Green
} else {
    Write-Warning "PowerShell modules not available - some features may be limited"
}

# Configuration
$AuditConfig = @{
    BaseUrl = $DeploymentUrl
    TimeoutSeconds = 30
    RetryAttempts = 3
    OutputPath = "audit-results"
    Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
}

# Critical pages to test
$CriticalPages = @(
    @{ Path = "/"; Name = "Homepage"; Expected = 200 },
    @{ Path = "/pricing"; Name = "Pricing"; Expected = 200 },
    @{ Path = "/login"; Name = "Login"; Expected = 200 },
    @{ Path = "/register"; Name = "Register"; Expected = 200 },
    @{ Path = "/neuro-vs-seo"; Name = "Neuro vs SEO"; Expected = 200 },
    @{ Path = "/dashboard"; Name = "Dashboard"; Expected = 401 }, # Should redirect to login
    @{ Path = "/profile"; Name = "Profile"; Expected = 401 }, # Should redirect to login
    @{ Path = "/neuroseo"; Name = "NeuroSEO Suite"; Expected = 401 }, # Should redirect to login
    @{ Path = "/nonexistent"; Name = "404 Test"; Expected = 404 }
)

# NeuroSEO™ Engine pages
$NeuroSEOPages = @(
    "/neuroseo/dashboard",
    "/neuroseo/ai-visibility", 
    "/neuroseo/semantic-map",
    "/neuroseo/neural-crawler",
    "/neuroseo/trust-block",
    "/neuroseo/rewrite-gen"
)

# Initialize results
$AuditResults = @{
    Overall = @{ Status = "PASS"; Issues = @() }
    PageStatus = @{}
    Performance = @{}
    Security = @{}
    Mobile = @{}
    Timestamp = $AuditConfig.Timestamp
}

function Write-AuditLog {
    param([string]$Message, [string]$Level = "INFO")
    
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        "INFO" { "Cyan" }
        default { "White" }
    }
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
    
    if ($Verbose) {
        Add-Content -Path "audit-log-$($AuditConfig.Timestamp).txt" -Value "[$timestamp] [$Level] $Message"
    }
}

function Test-WebPage {
    param(
        [string]$Url,
        [int]$ExpectedStatus = 200,
        [string]$PageName = "Unknown"
    )
    
    try {
        if ($DryRun) {
            Write-AuditLog "DRY RUN: Would test $Url" "INFO"
            return @{ Status = $ExpectedStatus; Success = $true; ResponseTime = 0 }
        }
        
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec $AuditConfig.TimeoutSeconds -UseBasicParsing
        $stopwatch.Stop()
        
        $result = @{
            Status = $response.StatusCode
            Success = ($response.StatusCode -eq $ExpectedStatus)
            ResponseTime = $stopwatch.ElapsedMilliseconds
            ContentLength = $response.Content.Length
            Headers = $response.Headers
        }
        
        if ($result.Success) {
            Write-AuditLog "✅ $PageName - Status: $($result.Status), Time: $($result.ResponseTime)ms" "SUCCESS"
        } else {
            Write-AuditLog "❌ $PageName - Expected: $ExpectedStatus, Got: $($result.Status)" "ERROR"
            $AuditResults.Overall.Issues += "Page $PageName returned $($result.Status) instead of $ExpectedStatus"
        }
        
        return $result
    }
    catch {
        Write-AuditLog "❌ $PageName - Request failed: $($_.Exception.Message)" "ERROR"
        $AuditResults.Overall.Issues += "Page $PageName failed to load: $($_.Exception.Message)"
        return @{ Status = 0; Success = $false; ResponseTime = -1; Error = $_.Exception.Message }
    }
}

function Test-SitemapXML {
    Write-AuditLog "Testing sitemap.xml availability..." "INFO"
    
    $sitemapUrl = "$($AuditConfig.BaseUrl)/sitemap.xml"
    $result = Test-WebPage -Url $sitemapUrl -ExpectedStatus 200 -PageName "Sitemap XML"
    
    if ($result.Success) {
        # Additional sitemap validation could go here
        Write-AuditLog "✅ Sitemap XML is accessible" "SUCCESS"
        return $true
    } else {
        Write-AuditLog "❌ Sitemap XML is not accessible" "ERROR"
        return $false
    }
}

function Test-RobotsTxt {
    Write-AuditLog "Testing robots.txt availability..." "INFO"
    
    $robotsUrl = "$($AuditConfig.BaseUrl)/robots.txt"
    $result = Test-WebPage -Url $robotsUrl -ExpectedStatus 200 -PageName "Robots.txt"
    
    if ($result.Success) {
        Write-AuditLog "✅ Robots.txt is accessible" "SUCCESS"
        return $true
    } else {
        Write-AuditLog "❌ Robots.txt is not accessible" "ERROR"
        return $false
    }
}

function Test-SecurityHeaders {
    Write-AuditLog "Testing security headers..." "INFO"
    
    try {
        if ($DryRun) {
            Write-AuditLog "DRY RUN: Would test security headers" "INFO"
            return $true
        }
        
        $response = Invoke-WebRequest -Uri $AuditConfig.BaseUrl -Method GET -UseBasicParsing
        $headers = $response.Headers
        
        $securityChecks = @{
            "X-Frame-Options" = $headers.ContainsKey("X-Frame-Options")
            "X-Content-Type-Options" = $headers.ContainsKey("X-Content-Type-Options")
            "X-XSS-Protection" = $headers.ContainsKey("X-XSS-Protection")
            "Strict-Transport-Security" = $headers.ContainsKey("Strict-Transport-Security")
            "Content-Security-Policy" = $headers.ContainsKey("Content-Security-Policy")
        }
        
        $passedChecks = 0
        $totalChecks = $securityChecks.Count
        
        foreach ($check in $securityChecks.GetEnumerator()) {
            if ($check.Value) {
                Write-AuditLog "✅ Security header $($check.Key) present" "SUCCESS"
                $passedChecks++
            } else {
                Write-AuditLog "⚠️ Security header $($check.Key) missing" "WARN"
            }
        }
        
        $AuditResults.Security.HeadersScore = "$passedChecks/$totalChecks"
        
        if ($passedChecks -ge ($totalChecks * 0.8)) {
            Write-AuditLog "✅ Security headers check passed ($passedChecks/$totalChecks)" "SUCCESS"
            return $true
        } else {
            Write-AuditLog "⚠️ Security headers need improvement ($passedChecks/$totalChecks)" "WARN"
            return $false
        }
    }
    catch {
        Write-AuditLog "❌ Security headers test failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Test-PerformanceBasics {
    Write-AuditLog "Testing basic performance metrics..." "INFO"
    
    $performanceTests = @()
    
    foreach ($page in $CriticalPages | Where-Object { $_.Expected -eq 200 }) {
        $url = "$($AuditConfig.BaseUrl)$($page.Path)"
        $result = Test-WebPage -Url $url -ExpectedStatus $page.Expected -PageName $page.Name
        
        if ($result.Success) {
            $performanceTests += @{
                Page = $page.Name
                ResponseTime = $result.ResponseTime
                ContentLength = $result.ContentLength
            }
        }
    }
    
    if ($performanceTests.Count -gt 0) {
        $avgResponseTime = ($performanceTests | Measure-Object -Property ResponseTime -Average).Average
        $AuditResults.Performance.AverageResponseTime = "$([math]::Round($avgResponseTime, 2))ms"
        
        if ($avgResponseTime -lt 2000) {
            Write-AuditLog "✅ Average response time: $([math]::Round($avgResponseTime, 2))ms (Good)" "SUCCESS"
            return $true
        } elseif ($avgResponseTime -lt 5000) {
            Write-AuditLog "⚠️ Average response time: $([math]::Round($avgResponseTime, 2))ms (Acceptable)" "WARN"
            return $true
        } else {
            Write-AuditLog "❌ Average response time: $([math]::Round($avgResponseTime, 2))ms (Poor)" "ERROR"
            return $false
        }
    }
    
    return $false
}

function Invoke-LighthouseAudit {
    Write-AuditLog "Attempting Lighthouse audit..." "INFO"
    
    # Check if Lighthouse CLI is available
    $lighthouseAvailable = Get-Command lighthouse -ErrorAction SilentlyContinue
    
    if (-not $lighthouseAvailable) {
        Write-AuditLog "⚠️ Lighthouse CLI not available - install with: npm install -g lighthouse" "WARN"
        return $false
    }
    
    if ($DryRun) {
        Write-AuditLog "DRY RUN: Would run Lighthouse audit" "INFO"
        return $true
    }
    
    try {
        $outputFile = "lighthouse-$($AuditConfig.Timestamp).json"
        $lighthouseCmd = "lighthouse $($AuditConfig.BaseUrl) --output=json --output-path=$outputFile --chrome-flags='--headless'"
        
        Write-AuditLog "Running Lighthouse audit (this may take 30-60 seconds)..." "INFO"
        $lighthouseResult = Invoke-Expression $lighthouseCmd
        
        if (Test-Path $outputFile) {
            $lighthouseData = Get-Content $outputFile | ConvertFrom-Json
            $scores = $lighthouseData.lhr.categories
            
            $AuditResults.Performance.LighthouseScores = @{
                Performance = [math]::Round($scores.performance.score * 100, 1)
                Accessibility = [math]::Round($scores.accessibility.score * 100, 1)
                BestPractices = [math]::Round($scores.'best-practices'.score * 100, 1)
                SEO = [math]::Round($scores.seo.score * 100, 1)
            }
            
            Write-AuditLog "✅ Lighthouse scores - Performance: $($AuditResults.Performance.LighthouseScores.Performance), Accessibility: $($AuditResults.Performance.LighthouseScores.Accessibility)" "SUCCESS"
            return $true
        }
    }
    catch {
        Write-AuditLog "❌ Lighthouse audit failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
    
    return $false
}

function Generate-AuditReport {
    Write-AuditLog "Generating audit report..." "INFO"
    
    $reportPath = "audit-report-$($AuditConfig.Timestamp).md"
    
    $reportContent = @"
# RankPilot Technical Audit Report

**Generated**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Deployment**: $($AuditConfig.BaseUrl)  
**Audit Type**: $AuditType  

## Overall Status: $($AuditResults.Overall.Status)

### Issues Found: $($AuditResults.Overall.Issues.Count)
$(if ($AuditResults.Overall.Issues.Count -gt 0) {
    $AuditResults.Overall.Issues | ForEach-Object { "- $_" }
} else {
    "No critical issues found."
})

### Page Status Results
$(foreach ($page in $CriticalPages) {
    if ($AuditResults.PageStatus.ContainsKey($page.Name)) {
        $status = $AuditResults.PageStatus[$page.Name]
        "- **$($page.Name)**: $($status.Status) ($($status.ResponseTime)ms)"
    }
})

### Performance Metrics
$(if ($AuditResults.Performance.AverageResponseTime) {
    "- Average Response Time: $($AuditResults.Performance.AverageResponseTime)"
})
$(if ($AuditResults.Performance.LighthouseScores) {
    "- Lighthouse Performance: $($AuditResults.Performance.LighthouseScores.Performance)/100"
    "- Lighthouse Accessibility: $($AuditResults.Performance.LighthouseScores.Accessibility)/100"
    "- Lighthouse Best Practices: $($AuditResults.Performance.LighthouseScores.BestPractices)/100"
    "- Lighthouse SEO: $($AuditResults.Performance.LighthouseScores.SEO)/100"
})

### Security Assessment
$(if ($AuditResults.Security.HeadersScore) {
    "- Security Headers: $($AuditResults.Security.HeadersScore)"
})

### Recommendations
$(if ($AuditResults.Overall.Issues.Count -eq 0) {
    "- ✅ All critical systems are functioning properly"
    "- Consider running performance optimization audit for further improvements"
} else {
    "- 🚨 Address critical issues found in the audit"
    "- Review failed page loads and implement proper error handling"
    "- Consider implementing comprehensive monitoring"
})

### Next Steps
1. Review and address any critical issues
2. Monitor performance metrics regularly
3. Implement automated monitoring alerts
4. Schedule regular audits (weekly recommended)

---

*Generated by RankPilot Technical Audit Script v1.0*
"@

    $reportContent | Out-File -FilePath $reportPath -Encoding UTF8
    Write-AuditLog "✅ Audit report generated: $reportPath" "SUCCESS"
    
    return $reportPath
}

# Main audit execution
function Start-TechnicalAudit {
    Write-AuditLog "Starting RankPilot Technical Audit..." "INFO"
    Write-AuditLog "Deployment URL: $($AuditConfig.BaseUrl)" "INFO"
    Write-AuditLog "Audit Type: $AuditType" "INFO"
    
    if ($DryRun) {
        Write-AuditLog "DRY RUN MODE - No actual requests will be made" "WARN"
    }
    
    $overallSuccess = $true
    
    # Test critical pages
    if ($AuditType -in @("Full", "Critical")) {
        Write-AuditLog "Testing critical pages..." "INFO"
        
        foreach ($page in $CriticalPages) {
            $url = "$($AuditConfig.BaseUrl)$($page.Path)"
            $result = Test-WebPage -Url $url -ExpectedStatus $page.Expected -PageName $page.Name
            $AuditResults.PageStatus[$page.Name] = $result
            
            if (-not $result.Success) {
                $overallSuccess = $false
            }
        }
    }
    
    # Test sitemap and robots.txt
    if ($AuditType -in @("Full", "Critical")) {
        $sitemapResult = Test-SitemapXML
        $robotsResult = Test-RobotsTxt
        
        if (-not $sitemapResult -or -not $robotsResult) {
            $overallSuccess = $false
        }
    }
    
    # Test security headers
    if ($AuditType -in @("Full", "Security")) {
        $securityResult = Test-SecurityHeaders
        if (-not $securityResult) {
            $overallSuccess = $false
        }
    }
    
    # Test performance
    if ($AuditType -in @("Full", "Performance")) {
        $performanceResult = Test-PerformanceBasics
        
        # Run Lighthouse if available
        Invoke-LighthouseAudit | Out-Null
    }
    
    # Update overall status
    $AuditResults.Overall.Status = if ($overallSuccess) { "PASS" } else { "FAIL" }
    
    # Generate report if requested
    if ($GenerateReport) {
        $reportPath = Generate-AuditReport
        Write-AuditLog "📊 Full report available at: $reportPath" "INFO"
    }
    
    # Summary
    Write-AuditLog "=== AUDIT SUMMARY ===" "INFO"
    Write-AuditLog "Overall Status: $($AuditResults.Overall.Status)" $(if ($overallSuccess) { "SUCCESS" } else { "ERROR" })
    Write-AuditLog "Issues Found: $($AuditResults.Overall.Issues.Count)" "INFO"
    
    if ($AuditResults.Performance.AverageResponseTime) {
        Write-AuditLog "Average Response Time: $($AuditResults.Performance.AverageResponseTime)" "INFO"
    }
    
    if ($overallSuccess) {
        Write-AuditLog "🎉 RankPilot deployment is healthy!" "SUCCESS"
        return 0
    } else {
        Write-AuditLog "⚠️ RankPilot deployment has issues that need attention" "WARN"
        return 1
    }
}

# Execute the audit
try {
    $exitCode = Start-TechnicalAudit
    exit $exitCode
}
catch {
    Write-AuditLog "❌ Audit script failed: $($_.Exception.Message)" "ERROR"
    exit 1
}
