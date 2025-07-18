# Publishing Guide

## 🤖 Fully Automated Release Process

This extension uses automated versioning and publishing. Here's how it works:

### 1. Make Your Changes

```bash
# Create feature branch
git checkout -b feat/my-feature

# Make changes and commit with conventional format
git add .
git commit -m "feat: add support for switch statements"
```

### 2. Merge to Main

When you merge to `main` branch, GitHub Actions automatically:
1. Analyzes commit messages
2. Determines version bump (major/minor/patch)
3. Generates changelog
4. Creates GitHub release with `.vsix` file
5. Publishes to VS Code Marketplace (if configured)

### 3. Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat:` | New feature | Minor (0.x.0) |
| `fix:` | Bug fix | Patch (0.0.x) |
| `perf:` | Performance improvement | Patch |
| `docs:` | Documentation only | None |
| `style:` | Code style (formatting) | None |
| `refactor:` | Code refactoring | None |
| `test:` | Adding tests | None |
| `chore:` | Maintenance tasks | None |
| `feat!:` or `BREAKING CHANGE:` | Breaking change | Major (x.0.0) |

### Examples:

```bash
# Features (minor version bump)
git commit -m "feat: add support for else-if statements"
git commit -m "feat: add configuration for marker color"

# Fixes (patch version bump)
git commit -m "fix: correct parsing of nested conditions"
git commit -m "fix: improve performance for large files"

# Breaking changes (major version bump)
git commit -m "feat!: change default minLineCount to 4"
git commit -m "fix!: rename configuration prefix

BREAKING CHANGE: Configuration keys now use 'ifEndMarker' prefix instead of 'ifEndGhostText'"

# No version bump
git commit -m "docs: update README with examples"
git commit -m "chore: update dependencies"
```

## 🔑 Setup Requirements

### GitHub Repository Settings

1. **Enable GitHub Actions** (should be enabled by default)
2. **Add Repository Secret** (optional, for VS Code Marketplace):
   - Name: `VSCE_PAT`
   - Value: Your [VS Code Marketplace Personal Access Token](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token)

### Local Development

```bash
# Install dependencies
npm install

# Run setup script
./scripts/setup-release.sh

# Test locally
npm run release -- --dry-run
```

## 📦 Manual Release (if needed)

If you need to manually release:

```bash
# Create release locally
npm run release

# Push changes and tags
git push --follow-tags origin main

# Publish to marketplace manually
npm run publish
```

## 🚨 Troubleshooting

### Commits not following format
The commit-msg hook will reject commits that don't follow the format:
```
⧗   input: Update stuff
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]
```

### Version not bumping
Check that your commits follow the conventional format. Only certain types trigger version bumps.

### GitHub Actions failing
Check the Actions tab in GitHub for detailed logs. Common issues:
- Missing `VSCE_PAT` secret
- Test failures
- Compilation errors

## 📊 Release Flow Diagram

```
Developer commits → Push to main → GitHub Actions triggered
                                          ↓
                                   Analyze commits
                                          ↓
                                   Determine version
                                          ↓
                                   Update package.json
                                          ↓
                                   Generate CHANGELOG
                                          ↓
                                   Create GitHub Release
                                          ↓
                                   Publish to Marketplace
```

That's it! The entire release process is automated. Just write good commit messages and the robots handle the rest! 🤖✨