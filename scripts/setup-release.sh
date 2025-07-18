#!/bin/bash

echo "🚀 Setting up automated release system..."

# Check if VSCE_PAT is set
if [ -z "$VSCE_PAT" ]; then
  echo "⚠️  VSCE_PAT environment variable not set!"
  echo "   Please set it to publish to VS Code Marketplace:"
  echo "   export VSCE_PAT=your-personal-access-token"
  echo ""
fi

# Initialize git hooks
npm run prepare

echo ""
echo "✅ Release automation setup complete!"
echo ""
echo "📝 Commit Message Format:"
echo "   feat: Add new feature"
echo "   fix: Fix bug"
echo "   perf: Improve performance"
echo "   docs: Update documentation"
echo "   chore: Update dependencies"
echo ""
echo "🎯 Release Commands:"
echo "   npm run release        # Auto version bump based on commits"
echo "   npm run release:patch  # Force patch release (0.0.x)"
echo "   npm run release:minor  # Force minor release (0.x.0)"
echo "   npm run release:major  # Force major release (x.0.0)"
echo ""
echo "🤖 GitHub Actions will automatically:"
echo "   - Generate changelog from commits"
echo "   - Bump version based on commit types"
echo "   - Create GitHub release with .vsix file"
echo "   - Publish to VS Code Marketplace (if VSCE_PAT secret is set)"
echo ""