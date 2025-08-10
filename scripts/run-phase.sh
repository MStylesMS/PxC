#!/bin/bash

# Houdini Clock Refactoring Phase Automation Script
# This script helps automate the PR merging process for the refactoring phases

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REFACTOR_PLAN_FILE="docs/refactor-plan.md"
REPO_ROOT=$(git rev-parse --show-toplevel)

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
check_repo() {
    if [[ ! -f "$REFACTOR_PLAN_FILE" ]]; then
        log_error "Refactor plan not found. Are you in the correct repository root?"
        exit 1
    fi
}

# Display current progress
show_progress() {
    log_info "Current Refactoring Progress:"
    echo
    grep -E "^- \[[ x]\]" "$REFACTOR_PLAN_FILE" | while read -r line; do
        if [[ $line == *"[x]"* ]]; then
            echo -e "${GREEN}✓${NC} ${line#*] }"
        else
            echo -e "${RED}○${NC} ${line#*] }"
        fi
    done
    echo
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log_info "Installing dependencies..."
        npm install
    fi
    
    # Run tests
    log_info "Running test suite..."
    npm test -- --watchAll=false
    
    # Check build
    log_info "Verifying build..."
    npm run build
    
    log_success "All tests passed!"
}

# Update progress in refactor plan
update_progress() {
    local pr_number=$1
    local pr_name=$2
    
    log_info "Updating progress for PR-$pr_number..."
    
    # Create backup
    cp "$REFACTOR_PLAN_FILE" "${REFACTOR_PLAN_FILE}.backup"
    
    # Update the checkbox for this PR
    sed -i.tmp "s/- \[ \] \*\*PR-$pr_number\*\*/- [x] **PR-$pr_number**/" "$REFACTOR_PLAN_FILE"
    rm "${REFACTOR_PLAN_FILE}.tmp" 2>/dev/null || true
    
    # Commit the progress update
    git add "$REFACTOR_PLAN_FILE"
    git commit -m "Update refactor progress: Completed PR-$pr_number ($pr_name)"
    
    log_success "Progress updated for PR-$pr_number"
}

# Execute a specific phase
run_phase() {
    local phase_number=$1
    
    case $phase_number in
        1)
            log_info "Starting Phase 1: Critical Security & Compatibility Fixes"
            run_pr 1 "Fix Deprecated React Lifecycle Methods"
            run_pr 2 "Update React and Build Tooling"
            ;;
        2)
            log_info "Starting Phase 2: High-Impact Modernization"
            run_pr 3 "Replace MQTT Library with Industry Standard"
            run_pr 4 "Update Remaining Dependencies"
            ;;
        3)
            log_info "Starting Phase 3: Technical Debt Cleanup"
            run_pr 5 "Remove fbemitter Dependency"
            ;;
        4)
            log_info "Starting Phase 4: Modern Development Patterns"
            run_pr 6 "Convert to Functional Components + Hooks"
            run_pr 7 "Add TypeScript Support"
            ;;
        5)
            log_info "Starting Phase 5: System Improvements"
            run_pr 8 "Standardize MQTT Topic Naming and Command Formats"
            run_pr 9 "Move Configuration to External .ini Files"
            ;;
        *)
            log_error "Invalid phase number. Use 1, 2, 3, 4, or 5."
            exit 1
            ;;
    esac
}

# Execute a specific PR (placeholder - would need actual implementation)
run_pr() {
    local pr_number=$1
    local pr_name=$2
    
    log_info "Processing PR-$pr_number: $pr_name"
    
    # Check if branch exists
    if git branch -r | grep -q "origin/pr-$pr_number"; then
        log_info "Checking out PR-$pr_number branch..."
        git checkout "pr-$pr_number"
        
        # Run tests
        run_tests
        
        # If tests pass, merge
        log_info "Merging PR-$pr_number to main..."
        git checkout main
        git merge "pr-$pr_number" --no-ff -m "Merge PR-$pr_number: $pr_name"
        
        # Update progress
        update_progress "$pr_number" "$pr_name"
        
        log_success "PR-$pr_number completed successfully!"
    else
        log_warning "Branch pr-$pr_number not found. Please create and implement the PR first."
        log_info "See docs/PR-$pr_number.md for implementation details."
    fi
}

# Test MQTT functionality
test_mqtt() {
    log_info "Testing MQTT functionality..."
    
    # Check if mosquitto is available
    if ! command -v mosquitto_pub &> /dev/null; then
        log_warning "mosquitto_pub not found. Install mosquitto-clients for testing."
        return 1
    fi
    
    local host=${REACT_APP_MQTT_HOST:-localhost}
    local port=${REACT_APP_MQTT_PORT:-1884}
    local topic="paradox/houdini/mirror/clock/commands"  # Corrected format
    local legacy_topic="Paradox/Houdini/Mirror/Clock/Commands"  # Legacy format
    
    log_info "Testing MQTT connection to $host:$port..."
    
    # Test with corrected format first
    mosquitto_pub -h "$host" -p "$port" -t "$topic" -m '{"time": "05:00"}' || {
        log_warning "Corrected format failed, trying legacy format..."
        # Fall back to legacy format
        mosquitto_pub -h "$host" -p "$port" -t "$legacy_topic" -m '{"time": "05:00"}' || {
            log_error "MQTT test failed with both formats. Check broker connection."
            return 1
        }
        topic="$legacy_topic"
        log_info "Using legacy topic format: $topic"
    }
    
    mosquitto_pub -h "$host" -p "$port" -t "$topic" -m '{"command": "start"}' || {
        log_error "MQTT command test failed."
        return 1
    }
    
    log_success "MQTT tests passed!"
}

# Validate environment
validate_environment() {
    log_info "Validating environment..."
    
    # Check Node.js version
    local node_version=$(node --version | cut -d'.' -f1 | sed 's/v//')
    if [[ $node_version -lt 16 ]]; then
        log_error "Node.js 16+ required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm not found. Please install Node.js and npm."
        exit 1
    fi
    
    # Check git
    if ! command -v git &> /dev/null; then
        log_error "git not found. Please install git."
        exit 1
    fi
    
    log_success "Environment validation passed!"
}

# Main script logic
main() {
    echo "🎭 Houdini Clock Refactoring Automation"
    echo "======================================="
    echo
    
    check_repo
    
    case "${1:-help}" in
        "progress"|"status")
            show_progress
            ;;
        "phase")
            if [[ -z "$2" ]]; then
                log_error "Please specify phase number (1-4)"
                exit 1
            fi
            validate_environment
            run_phase "$2"
            ;;
        "pr")
            if [[ -z "$2" ]]; then
                log_error "Please specify PR number (1-7)"
                exit 1
            fi
            validate_environment
            run_pr "$2" "Manual PR execution"
            ;;
        "test")
            validate_environment
            run_tests
            ;;
        "mqtt-test")
            test_mqtt
            ;;
        "validate")
            validate_environment
            ;;
        "help"|*)
            echo "Usage: $0 <command> [options]"
            echo
            echo "Commands:"
            echo "  progress          Show current refactoring progress"
            echo "  phase <1-5>       Execute entire phase (1=Critical, 2=High-Impact, 3=Cleanup, 4=Enhancement, 5=System)"
            echo "  pr <1-9>          Execute specific PR"
            echo "  test              Run test suite"
            echo "  mqtt-test         Test MQTT functionality"
            echo "  validate          Validate environment setup"
            echo "  help              Show this help message"
            echo
            echo "Examples:"
            echo "  $0 progress                    # Show current progress"
            echo "  $0 phase 1                     # Run Phase 1 (Critical fixes)"
            echo "  $0 pr 3                        # Run just PR-3"
            echo "  $0 test                        # Run tests"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
