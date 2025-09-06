#!/bin/bash

# RankPilot Comprehensive Test Runner Wrapper
# Provides a simple interface to run the comprehensive test suite

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SUITE="all"
HEADED=false
PRODUCTION=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --suite)
            SUITE="$2"
            shift 2
            ;;
        --headed)
            HEADED=true
            shift
            ;;
        --production)
            PRODUCTION=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --suite SUITE       Test suite to run (all, critical, features, api, components, integration, security, performance)"
            echo "  --headed           Run tests in headed mode (visible browser)"
            echo "  --production       Run against production environment"
            echo "  --verbose          Enable verbose output"
            echo "  --help             Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --suite critical"
            echo "  $0 --suite all --headed"
            echo "  $0 --suite api --production"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Set environment variables based on options
export TEST_SUITE="$SUITE"
export TEST_HEADED="$HEADED"
export TEST_PRODUCTION="$PRODUCTION"
export TEST_VERBOSE="$VERBOSE"

# Set production URL if needed
if [ "$PRODUCTION" = true ]; then
    export TEST_BASE_URL="https://rankpilot-h3jpc.web.app"
    echo -e "${YELLOW}Running tests against PRODUCTION environment${NC}"
else
    export TEST_BASE_URL="http://localhost:3000"
    echo -e "${BLUE}Running tests against LOCAL environment${NC}"
fi

# Display configuration
echo -e "${BLUE}=== RankPilot Comprehensive Test Runner ===${NC}"
echo -e "${BLUE}Suite:${NC} $SUITE"
echo -e "${BLUE}Environment:${NC} $([ "$PRODUCTION" = true ] && echo 'Production' || echo 'Local')"
echo -e "${BLUE}Mode:${NC} $([ "$HEADED" = true ] && echo 'Headed' || echo 'Headless')"
echo -e "${BLUE}Verbose:${NC} $([ "$VERBOSE" = true ] && echo 'Yes' || echo 'No')"
echo ""

# Check if development server is running (for local tests)
if [ "$PRODUCTION" = false ]; then
    echo -e "${YELLOW}Checking if development server is running...${NC}"
    if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${RED}❌ Development server not detected on http://localhost:3000${NC}"
        echo -e "${YELLOW}💡 Start the server with: npm run dev-no-turbopack${NC}"
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Development server is running${NC}"
    fi
fi

# Run the comprehensive test suite using our Node.js runner
echo -e "${GREEN}🚀 Starting comprehensive test suite...${NC}"
echo ""

cd "$PROJECT_ROOT"

if [ "$VERBOSE" = true ]; then
    npm run test:comprehensive:runner
else
    npm run test:comprehensive:runner 2>&1 | tee test-output.log
fi

# Check exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests completed successfully!${NC}"
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Check the output above for details.${NC}"
    echo -e "${YELLOW}📄 Full output saved to: test-output.log${NC}"
fi

exit $EXIT_CODE
