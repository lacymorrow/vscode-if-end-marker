#!/bin/bash

# Exit on any error
set -e

# Generate timestamp for unique branch names
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Default configuration
EMPTY_BRANCH="empty-base-$TIMESTAMP"
FEATURE_BRANCH="full-review-$TIMESTAMP"
MAIN_BRANCH="main"
CLEANUP_MODE=false

# Help message
show_help() {
    echo "Usage: $0 [branch_name] [options]"
    echo ""
    echo "Arguments:"
    echo "  branch_name               Source branch name (default: main)"
    echo ""
    echo "Options:"
    echo "  -e, --empty-branch NAME    Base name for empty branch (will be appended with timestamp)"
    echo "  -f, --feature-branch NAME  Base name for feature branch (will be appended with timestamp)"
    echo "  --cleanup                 Delete all existing code review branches (full-review-* and empty-base-*)"
    echo "  -h, --help                Show this help message"
    exit 0
}

# Function to cleanup all code review branches
cleanup_all_branches() {
    echo "Cleaning up all code review branches..."
    
    # Check for uncommitted changes before cleanup
    CLEANUP_STASH_CREATED=false
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo "Warning: You have uncommitted changes."
        echo "Stashing changes to prevent data loss during cleanup..."
        git stash push -m "Auto-stash before cleanup - $(date)"
        CLEANUP_STASH_CREATED=true
        echo "Changes stashed successfully."
    fi
    
    # Get current branch to return to it later
    CURRENT_BRANCH=$(git symbolic-ref --short HEAD || echo "HEAD")
    
    # Switch to main branch for cleanup
    git checkout "$MAIN_BRANCH"
    
    # Find and delete local branches matching pattern
    echo "Deleting local branches..."
    for branch in $(git branch --format='%(refname:short)' | grep -E '^(full-review-|empty-base-)' || true); do
        if [ -n "$branch" ]; then
            echo "  Deleting local branch: $branch"
            git branch -D "$branch"
        fi
    done
    
    # Find and delete remote branches matching pattern
    echo "Deleting remote branches..."
    for branch in $(git ls-remote --heads origin | grep -E '(full-review-|empty-base-)' | awk '{print $2}' | sed 's|refs/heads/||' || true); do
        if [ -n "$branch" ]; then
            echo "  Deleting remote branch: $branch"
            git push origin --delete "$branch"
        fi
    done
    
    # Return to original branch if it still exists
    if git show-ref --verify --quiet "refs/heads/$CURRENT_BRANCH"; then
        git checkout "$CURRENT_BRANCH"
    fi
    
    # Restore stashed changes if any were stashed
    if [ "$CLEANUP_STASH_CREATED" = true ]; then
        echo "Restoring your stashed changes..."
        git stash pop
        echo "Changes restored successfully."
    fi
    
    echo "Cleanup completed!"
    exit 0
}

# First check if the first argument is a branch name (not starting with -)
if [ $# -gt 0 ] && [[ ! $1 =~ ^- ]]; then
    MAIN_BRANCH="$1"
    shift
fi

# Parse remaining command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--empty-branch)
            EMPTY_BRANCH="$2-$TIMESTAMP"
            shift 2
            ;;
        -f|--feature-branch)
            FEATURE_BRANCH="$2-$TIMESTAMP"
            shift 2
            ;;
        --cleanup)
            CLEANUP_MODE=true
            shift
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            ;;
    esac
done

# If cleanup mode, run cleanup and exit
if [ "$CLEANUP_MODE" = true ]; then
    cleanup_all_branches
fi

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed. Please install it first:"
    echo "  macOS: brew install gh"
    echo "  Linux: https://github.com/cli/cli#installation"
    exit 1
fi

# Check if gh is authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: GitHub CLI is not authenticated. Please run 'gh auth login' first."
    exit 1
fi

# Function to check if branch exists
branch_exists() {
    git show-ref --verify --quiet "refs/heads/$1"
}

# Function to check if branch exists on remote
remote_branch_exists() {
    git ls-remote --exit-code --heads origin "$1" &> /dev/null
}

# Store current branch
ORIGINAL_BRANCH=$(git symbolic-ref --short HEAD || echo "HEAD")

echo "Starting code review automation process..."
echo "Using source branch: $MAIN_BRANCH"
echo "Empty branch: $EMPTY_BRANCH"
echo "Feature branch: $FEATURE_BRANCH"
echo "Branches will be kept after PR creation (use --cleanup to remove all code review branches)"

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
STASH_CREATED=false
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Warning: You have uncommitted changes."
    echo "Stashing changes to prevent data loss..."
    git stash push -m "Auto-stash before code review automation - $(date)"
    STASH_CREATED=true
    echo "Changes stashed successfully."
fi

# Check if main branch exists
if ! branch_exists "$MAIN_BRANCH"; then
    echo "Error: Branch '$MAIN_BRANCH' does not exist"
    exit 1
fi

# Create empty branch from main first
if branch_exists "$EMPTY_BRANCH" || remote_branch_exists "$EMPTY_BRANCH"; then
    echo "Error: Branch '$EMPTY_BRANCH' already exists. Please delete it first or use a different name."
    exit 1
fi

echo "Creating empty branch..."
git checkout "$MAIN_BRANCH"
git checkout -b "$EMPTY_BRANCH"
# Remove all files except .git
find . -mindepth 1 -maxdepth 1 -not -name '.git' -exec rm -rf {} +
git add -A
git commit -m "Empty state for code review"
git push origin "$EMPTY_BRANCH"

# Create feature branch from main
if branch_exists "$FEATURE_BRANCH" || remote_branch_exists "$FEATURE_BRANCH"; then
    echo "Error: Branch '$FEATURE_BRANCH' already exists. Please delete it first or use a different name."
    git checkout "$ORIGINAL_BRANCH"
    exit 1
fi

echo "Creating feature branch..."
git checkout "$MAIN_BRANCH"
git checkout -b "$FEATURE_BRANCH"
# Add a marker file to ensure there's a commit difference
echo "# Code review marker - created at $TIMESTAMP" > .code-review-marker
git add .code-review-marker
git commit -m "Add code review marker"
git push origin "$FEATURE_BRANCH"

# Create pull request using GitHub CLI
echo "Creating pull request..."
PR_URL=$(gh pr create \
    --base "$EMPTY_BRANCH" \
    --head "$FEATURE_BRANCH" \
    --title "Full Codebase Review ($TIMESTAMP)" \
    --body "This PR is created to trigger a full codebase review by comparing against an empty branch.")

echo "Process completed! PR created at: $PR_URL"
echo ""
echo "Branches created:"
echo "  - $EMPTY_BRANCH"
echo "  - $FEATURE_BRANCH"
echo ""
echo "To cleanup all code review branches later, run:"
echo "  $0 --cleanup"

# Return to original branch
git checkout "$ORIGINAL_BRANCH"

# Restore stashed changes if any were stashed
if [ "$STASH_CREATED" = true ]; then
    echo "Restoring your stashed changes..."
    git stash pop
    echo "Changes restored successfully."
fi

echo "Done!" 