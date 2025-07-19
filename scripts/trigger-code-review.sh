#!/bin/bash

# Exit on any error
set -e

# Generate timestamp for unique branch names
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Default configuration
EMPTY_BRANCH="empty-base-$TIMESTAMP"
FEATURE_BRANCH="full-review-$TIMESTAMP"
MAIN_BRANCH="main"
CLEANUP=true

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
    echo "  --no-cleanup              Keep temporary branches after PR creation"
    echo "  -h, --help                Show this help message"
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
        --no-cleanup)
            CLEANUP=false
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

# Cleanup function
cleanup() {
    if [ "$CLEANUP" = true ]; then
        echo "Cleaning up temporary branches..."
        git checkout "$MAIN_BRANCH"
        
        # Delete local branches
        if branch_exists "$EMPTY_BRANCH"; then
            git branch -D "$EMPTY_BRANCH"
        fi
        if branch_exists "$FEATURE_BRANCH"; then
            git branch -D "$FEATURE_BRANCH"
        fi
        
        # Delete remote branches
        if remote_branch_exists "$EMPTY_BRANCH"; then
            git push origin --delete "$EMPTY_BRANCH"
        fi
        if remote_branch_exists "$FEATURE_BRANCH"; then
            git push origin --delete "$FEATURE_BRANCH"
        fi
    fi
}

# Store current branch
ORIGINAL_BRANCH=$(git symbolic-ref --short HEAD || echo "HEAD")

echo "Starting code review automation process..."
echo "Using source branch: $MAIN_BRANCH"
echo "Empty branch: $EMPTY_BRANCH"
echo "Feature branch: $FEATURE_BRANCH"

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Check if main branch exists
if ! branch_exists "$MAIN_BRANCH"; then
    echo "Error: Branch '$MAIN_BRANCH' does not exist"
    exit 1
fi

# Create feature branch from main first
if branch_exists "$FEATURE_BRANCH" || remote_branch_exists "$FEATURE_BRANCH"; then
    echo "Error: Branch '$FEATURE_BRANCH' already exists. Please delete it first or use a different name."
    exit 1
fi

echo "Creating feature branch..."
git checkout "$MAIN_BRANCH"
git checkout -b "$FEATURE_BRANCH"
git push origin "$FEATURE_BRANCH"

# Now create empty branch from main (not orphan)
if branch_exists "$EMPTY_BRANCH" || remote_branch_exists "$EMPTY_BRANCH"; then
    echo "Error: Branch '$EMPTY_BRANCH' already exists. Please delete it first or use a different name."
    git checkout "$ORIGINAL_BRANCH"
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

# Create pull request using GitHub CLI
echo "Creating pull request..."
PR_URL=$(gh pr create \
    --base "$EMPTY_BRANCH" \
    --head "$FEATURE_BRANCH" \
    --title "Full Codebase Review ($TIMESTAMP)" \
    --body "This PR is created to trigger a full codebase review by comparing against an empty branch.")

echo "Process completed! PR created at: $PR_URL"

# Return to original branch
git checkout "$ORIGINAL_BRANCH"

# Cleanup if requested
cleanup

echo "Done!" 