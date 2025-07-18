# Contributing to If End Ghost Text

First off, thank you for considering contributing to If End Ghost Text! It's people like you that make this extension better for everyone.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (include code samples, file types, etc.)
- **Describe the behavior you observed and what you expected**
- **Include screenshots** if applicable
- **Include your environment details** (VS Code version, OS, extension version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the proposed enhancement**
- **Explain why this enhancement would be useful**
- **List any alternative solutions you've considered**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. Make your changes following our coding standards
3. Add tests for any new functionality
4. Ensure all tests pass
5. Update documentation as needed
6. Submit a pull request

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/if-end-ghost-text.git
   cd if-end-ghost-text
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Open in VS Code**
   ```bash
   code .
   ```

4. **Start development**
   - Press `F5` to launch a new VS Code window with the extension loaded
   - Make changes to the source code
   - Reload the extension development window to test changes

## Coding Standards

### TypeScript Guidelines

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for all public APIs
- Keep functions small and focused

### Code Style

- 4 spaces for indentation
- Single quotes for strings
- Semicolons at the end of statements
- Opening braces on the same line
- Use `const` by default, `let` when needed, never `var`

Example:
```typescript
/**
 * Formats the condition text for display
 */
export function formatCondition(condition: string, maxLength: number): string {
    if (condition.length <= maxLength) {
        return condition;
    }
    return condition.substring(0, maxLength - 3) + '...';
}
```

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

Examples:
```
Add support for MDX files

- Parse .mdx files as JavaScript
- Update supported languages list
- Add tests for MDX parsing

Fixes #123
```

### Testing

- Write unit tests for all new functionality
- Ensure all tests pass before submitting PR
- Test manually in the extension development host
- Test with different file types and edge cases

Run tests:
```bash
npm test
```

## Project Structure

```
if-end-ghost-text/
├── src/
│   ├── extension.ts        # Extension entry point
│   ├── parser.ts          # If statement parser
│   ├── decorationProvider.ts # Ghost text decoration logic
│   └── test/              # Test files
├── package.json           # Extension manifest
├── tsconfig.json         # TypeScript configuration
└── README.md             # User documentation
```

## Release Process

Releases are managed by maintainers. The process:

1. Update version in package.json
2. Update CHANGELOG.md
3. Run `npm run release`
4. Create GitHub release with notes

## Questions?

Feel free to open an issue with the "question" label or reach out in discussions.

Thank you for contributing! 🎉