#!/bin/bash
# Elite E2E Environment Manager
# Main wrapper script for managing Elite test environments

set -e

# Get script directory
E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$E2E_DIR/scripts"

# Load shared utilities
source "$SCRIPTS_DIR/_shared.sh"

# Function to trigger Elite environment
trigger() {
    local run_name="${1:-E2E Test Environment}"
    local duration="${2:-30}"
    local version="${3:-latest}"
    local enable_vms="${4:-true}"
    local vm_provider="${5:-kvm}"
    local vm_config="${6:-Standard}"
    local enable_debug="${7:-false}"

    print_separator
    echo "🚀 STARTING ELITE ENVIRONMENT"
    print_separator
    echo ""

    # Run trigger script
    if ! bash "$SCRIPTS_DIR/trigger-elite.sh" \
        "$run_name" "$duration" "$version" "$enable_vms" "$vm_provider" "$vm_config" "$enable_debug"; then
        log_error "Failed to trigger Elite environment"
        exit 1
    fi

    echo ""

    # Download deployment info
    if ! bash "$SCRIPTS_DIR/get-deployment-info.sh"; then
        log_error "Failed to get deployment information"
        exit 1
    fi

    echo ""

    # Update .env
    if ! bash "$SCRIPTS_DIR/update-env.sh"; then
        log_error "Failed to update .env file"
        exit 1
    fi

    echo ""
    print_separator
    log_success "Elite environment is ready for testing!"
    print_separator
    echo ""
    log_info "Next steps:"
    echo "   1. Run tests: npm test"
    echo "   2. Check status: ./go status"
    echo "   3. View logs: ./go logs"
    echo "   4. Cleanup when done: ./go cleanup"
    echo ""
}

# Function to show status
status() {
    local run_id
    run_id=$(get_run_id)
    if [ $? -ne 0 ]; then
        exit 1
    fi

    print_separator
    echo "📊 ELITE ENVIRONMENT STATUS"
    print_separator
    echo ""

    gh run view "$run_id" --repo "$ELITE_REPO"
}

# Function to display deployment info
info() {
    local deployment_info
    deployment_info=$(get_deployment_info)
    if [ $? -ne 0 ]; then
        exit 1
    fi

    print_separator
    echo "📋 DEPLOYMENT INFORMATION"
    print_separator
    echo ""

    echo "$deployment_info" | jq .
}

# Function to watch logs
logs() {
    local run_id
    run_id=$(get_run_id)
    if [ $? -ne 0 ]; then
        exit 1
    fi

    log_info "Watching workflow logs for run $run_id..."
    log_info "Press Ctrl+C to stop watching"
    echo ""

    gh run watch "$run_id" --repo "$ELITE_REPO"
}

# Function to cleanup
cleanup() {
    bash "$SCRIPTS_DIR/cleanup-elite.sh"
}

# Function to show help
help() {
    cat << EOF
Elite E2E Environment Manager

Manages Elite test environments for E2E testing by triggering GitHub Actions
workflows and automatically configuring the test environment.

Usage: ./go [command] [options]

Commands:
  trigger [run-name] [duration] [version] [vms] [provider] [config] [debug]
          Start Elite environment
          - run-name: custom name for this run (default: "E2E Test Environment")
          - duration: minutes to keep alive (default: 30)
          - version: Docker image version (default: latest)
          - vms: enable VMs true/false (default: true)
          - provider: VM provider kvm/linode/vultr (default: kvm)
          - config: VM config Minimal/Basic/Standard/Full (default: Standard)
          - debug: enable debug true/false (default: false)

  status  Show current environment status

  info    Display deployment information (JSON)

  logs    Watch workflow logs in real-time

  cleanup Cancel workflow and cleanup local files

  help    Show this help message

Examples:
  ./go trigger                                    # Default: "E2E Test Environment"
  ./go trigger "Login Tests"                      # Custom name
  ./go trigger "Login Tests" 60                   # Custom name, 60 min
  ./go trigger "API Tests" 45 0.2.35              # Custom name, 45 min, v0.2.35
  ./go trigger "UI Tests" 30 latest false         # No VMs
  ./go status                                     # Check status
  ./go info                                       # Show deployment info
  ./go logs                                       # Watch logs
  ./go cleanup                                    # Cancel and cleanup

Workflow:
  1. ./go trigger          # Start environment (~60s)
  2. npm test              # Run E2E tests
  3. ./go cleanup          # Cancel and cleanup

Files:
  .elite-run-id           # Current run ID (auto-managed)
  .deployment-info.json   # Deployment details (auto-managed)
  .env                    # Test configuration (auto-updated)
  .elite-history/         # Archived deployment info

Requirements:
  - gh (GitHub CLI)
  - jq (JSON processor)
  - curl

Configuration:
  Elite repository: $ELITE_REPO
  Workflow: $WORKFLOW_NAME

EOF
}

# Main command dispatcher
case "${1:-help}" in
    trigger)
        shift
        trigger "$@"
        ;;
    status)
        status
        ;;
    info)
        info
        ;;
    logs)
        logs
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        help
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        help
        exit 1
        ;;
esac
