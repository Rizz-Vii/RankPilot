#!/bin/bash

# Systematic Debugging Checklist for RankPilot - Linux/Bash Version
# Enforces PilotBuddy V01 standards for debugging excellence

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
PROBLEM=""
AUTO_VALIDATE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -Problem)
      PROBLEM="$2"
      shift 2
      ;;
    -AutoValidate)
      AUTO_VALIDATE=true
      shift
      ;;
    -DryRun)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [[ -z "$PROBLEM" ]]; then
  echo -e "${RED}Error: -Problem parameter is required${NC}"
  echo "Usage: $0 -Problem 'Description of problem' [-AutoValidate] [-DryRun]"
  exit 1
fi

# Session tracking
SESSION_ID="debug-$(date +%Y%m%d-%H%M%S)"
SESSION_START=$(date)
COMPLETED_STEPS=()

write_header() {
  echo ""
  echo -e "${CYAN}$(printf '=%.0s' {1..80})${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}$(printf '=%.0s' {1..80})${NC}"
  echo ""
}

write_step() {
  local step_name="$1"
  local description="$2"
  local required="$3"
  
  if [[ "$required" == "true" ]]; then
    local required_text="${RED}[REQUIRED]${NC}"
  else
    local required_text="${YELLOW}[OPTIONAL]${NC}"
  fi
  
  echo -e "${BLUE}🔍 $step_name${NC} $required_text"
  echo "   $description"
  echo ""
}

confirm_step() {
  local step_id="$1"
  local step_name="$2"
  
  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}[DRY RUN] Would prompt for: $step_name${NC}"
    return 0
  fi
  
  read -p "$(echo -e "   ${GREEN}✅ Completed $step_name? (y/n/skip)${NC} ")" completed
  
  case $completed in
    y|yes)
      read -p "$(echo -e "   ${BLUE}📝 Brief result/finding${NC}: ")" result
      COMPLETED_STEPS+=("$step_id:$step_name:$result:$(date)")
      echo -e "${GREEN}   ✅ Step completed and recorded${NC}"
      return 0
      ;;
    skip)
      echo -e "${YELLOW}   ⚠️  Step skipped (not recommended)${NC}"
      return 1
      ;;
    *)
      echo -e "${RED}   ❌ Step not completed - please complete before proceeding${NC}"
      return 1
      ;;
  esac
}

test_configuration() {
  echo -e "${CYAN}🔧 AUTOMATED CONFIGURATION VALIDATION${NC}"
  
  local issues=()
  
  # Check environment files
  local env_files=(".env" ".env.local" ".env.development")
  for env_file in "${env_files[@]}"; do
    if [[ -f "$env_file" ]]; then
      echo -e "${GREEN}✅ Found: $env_file${NC}"
      
      # Check for common URL mismatches
      if grep -q "TEST_BASE_URL.*localhost" "$env_file" && grep -q "PERFORMANCE_URL.*firebase" "$env_file"; then
        issues+=("URL mismatch detected in $env_file")
      fi
    else
      echo -e "${YELLOW}⚠️  Missing: $env_file${NC}"
    fi
  done
  
  # Check package.json scripts
  if [[ -f "package.json" ]]; then
    echo -e "${GREEN}✅ Package.json found${NC}"
    
    if ! grep -q '"scripts"' package.json; then
      issues+=("No scripts section in package.json")
    fi
  else
    issues+=("Missing package.json")
  fi
  
  # Check configuration files
  local config_files=("next.config.ts" "playwright.config.ts" "firebase.json")
  for config_file in "${config_files[@]}"; do
    if [[ -f "$config_file" ]]; then
      echo -e "${GREEN}✅ Found: $config_file${NC}"
    else
      echo -e "${YELLOW}⚠️  Missing: $config_file${NC}"
    fi
  done
  
  if [[ ${#issues[@]} -eq 0 ]]; then
    echo -e "${GREEN}🎯 Configuration validation passed${NC}"
    return 0
  else
    echo -e "${RED}❌ Configuration issues found:${NC}"
    for issue in "${issues[@]}"; do
      echo -e "${RED}   - $issue${NC}"
    done
    return 1
  fi
}

test_recent_changes() {
  echo -e "${CYAN}📋 AUTOMATED RECENT CHANGES CHECK${NC}"
  
  # Check recent commits
  if command -v git &> /dev/null && git rev-parse --git-dir &> /dev/null; then
    echo -e "${GREEN}✅ Recent commits (last 10):${NC}"
    git log --oneline -10 | sed 's/^/   /'
  else
    echo -e "${YELLOW}⚠️  Could not retrieve git history${NC}"
  fi
  
  # Check for recent dependency changes
  if [[ -f "package-lock.json" ]]; then
    local lock_modified=$(stat -c %Y package-lock.json 2>/dev/null || stat -f %m package-lock.json 2>/dev/null)
    local current_time=$(date +%s)
    local days_since_modified=$(( (current_time - lock_modified) / 86400 ))
    
    if [[ $days_since_modified -lt 7 ]]; then
      echo -e "${YELLOW}⚠️  package-lock.json modified $days_since_modified days ago${NC}"
      echo -e "${YELLOW}   Consider if dependency changes could be related${NC}"
    else
      echo -e "${GREEN}✅ No recent dependency changes${NC}"
    fi
  fi
  
  return 0
}

start_systematic_debugging() {
  write_header "🚀 RANKPILOT SYSTEMATIC DEBUGGING SESSION"
  
  echo -e "${MAGENTA}Session ID: $SESSION_ID${NC}"
  echo -e "${MAGENTA}Problem: $PROBLEM${NC}"
  echo -e "${MAGENTA}Started: $SESSION_START${NC}"
  
  local mode="Interactive"
  [[ "$AUTO_VALIDATE" == "true" ]] && mode="Auto-Validate"
  echo -e "${MAGENTA}Mode: $mode${NC}"
  
  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}🔍 DRY RUN MODE - No changes will be made${NC}"
  fi
  
  echo ""
  echo -e "${RED}⚠️  SYSTEMATIC APPROACH REQUIRED${NC}"
  echo -e "${RED}   Complete ALL required steps before proceeding with complex debugging${NC}"
  echo ""
}

invoke_systematic_steps() {
  # Define all steps
  local steps=(
    "config:Configuration Validation:Check environment variables, URLs, file paths, and basic configuration:true:true"
    "error:Error Analysis:Analyze actual error messages, stack traces, and logs:true:false"
    "changes:Recent Changes Review:Check recent commits, dependency changes, configuration updates:true:true"
    "environment:Environment Consistency:Verify dev vs prod consistency, dependency versions:true:false"
    "patterns:Pattern Recognition:Check against known patterns and previous solutions:true:false"
    "isolation:Problem Isolation:Isolate problem to specific components or services:false:false"
    "hypothesis:Hypothesis Testing:Test specific hypotheses systematically:false:false"
    "validation:Solution Validation:Validate solution and capture for future reference:true:false"
  )
  
  local required_steps_completed=0
  local total_required_steps=0
  
  # Count total required steps
  for step in "${steps[@]}"; do
    IFS=':' read -r step_id step_name step_description required auto_check <<< "$step"
    [[ "$required" == "true" ]] && ((total_required_steps++))
  done
  
  for step in "${steps[@]}"; do
    IFS=':' read -r step_id step_name step_description required auto_check <<< "$step"
    
    write_step "$step_name" "$step_description" "$required"
    
    local step_completed=false
    
    # Auto-validation for supported steps
    if [[ "$AUTO_VALIDATE" == "true" && "$auto_check" == "true" ]]; then
      echo -e "${BLUE}🤖 Running automated validation...${NC}"
      
      case $step_id in
        config)
          if test_configuration; then
            step_completed=true
          fi
          ;;
        changes)
          if test_recent_changes; then
            step_completed=true
          fi
          ;;
      esac
      
      if [[ "$step_completed" == "true" ]]; then
        echo -e "${GREEN}✅ Automated validation passed${NC}"
      else
        echo -e "${RED}❌ Automated validation failed - manual review required${NC}"
        if confirm_step "$step_id" "$step_name"; then
          step_completed=true
        fi
      fi
    else
      if confirm_step "$step_id" "$step_name"; then
        step_completed=true
      fi
    fi
    
    if [[ "$step_completed" == "true" && "$required" == "true" ]]; then
      ((required_steps_completed++))
    fi
    
    echo ""
  done
  
  # Progress validation
  local progress=$(( (required_steps_completed * 100) / total_required_steps ))
  
  write_header "📊 SYSTEMATIC DEBUGGING PROGRESS"
  echo -e "${BLUE}Required Steps Completed: $required_steps_completed / $total_required_steps ($progress%)${NC}"
  
  if [[ $progress -ge 80 ]]; then
    echo -e "${GREEN}✅ SYSTEMATIC APPROACH VALIDATED${NC}"
    echo -e "${GREEN}   You can now proceed with complex debugging approaches${NC}"
    return 0
  else
    echo -e "${RED}❌ SYSTEMATIC APPROACH INCOMPLETE${NC}"
    echo -e "${RED}   Complete required steps before proceeding${NC}"
    return 1
  fi
}

save_session() {
  local session_end=$(date)
  local session_dir="sessions"
  
  # Create sessions directory if it doesn't exist
  [[ ! -d "$session_dir" ]] && mkdir -p "$session_dir"
  
  local session_file="$session_dir/systematic-debugging-$SESSION_ID.json"
  
  # Create JSON session data
  cat > "$session_file" << EOF
{
  "sessionId": "$SESSION_ID",
  "problem": "$PROBLEM",
  "startTime": "$SESSION_START",
  "endTime": "$session_end",
  "completedSteps": [
$(printf '    "%s",\n' "${COMPLETED_STEPS[@]}" | sed '$s/,$//')
  ],
  "autoValidate": $AUTO_VALIDATE
}
EOF
  
  echo -e "${GREEN}💾 Session saved: $session_file${NC}"
  
  # Calculate duration (simplified)
  echo -e "${GREEN}📊 Session completed${NC}"
}

# Main execution
main() {
  start_systematic_debugging
  
  if invoke_systematic_steps; then
    save_session
    write_header "🎯 SYSTEMATIC DEBUGGING COMPLETE"
    echo -e "${GREEN}✅ All required systematic steps completed${NC}"
    echo -e "${GREEN}🚀 You can now proceed with confidence${NC}"
    exit 0
  else
    save_session
    write_header "❌ SYSTEMATIC DEBUGGING INCOMPLETE"
    echo -e "${RED}⚠️  Please complete required steps before proceeding${NC}"
    exit 1
  fi
}

# Run main function
main "$@"
