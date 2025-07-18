# Changelog

All notable changes to the "If End Marker" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive JSDoc documentation for all TypeScript files
- MIT License file
- Production-ready package.json with release scripts
- Improved README with detailed usage and contribution guidelines
- .gitignore file for common development artifacts
- Automated version bumping and publishing scripts

### Changed
- Enhanced code comments throughout the codebase
- Updated package.json metadata for marketplace publishing

### Fixed
- Ghost text now properly disappears when if statements are edited to span fewer than 3 lines
- Added debouncing for text changes to improve performance during rapid editing
- Improved decoration cleanup when switching between editors

### Performance Improvements
- Implemented parse result caching to avoid re-parsing unchanged documents
- Added viewport-based rendering - only visible if statements are processed
- Optimized string operations in parser using array joins instead of concatenation
- Pre-compiled regex patterns for better performance
- Added file size limits to skip very large files
- Implemented efficient brace counting using indexOf instead of character iteration
- Added configuration options for performance tuning (debounceDelay, maxFileSize, minLineCount)
- Clear cache when documents are closed to free memory
- Limit condition extraction to 10 lines maximum

## [0.0.1] - 2025-01-18

### Added
- Initial release
- Basic if statement detection and parsing
- Ghost text display at closing braces
- Support for JavaScript, TypeScript, JSX, and TSX files
- Configurable maximum condition length
- Enable/disable toggle in settings
- Theme-aware ghost text styling
- Multi-line condition support
- Automatic decoration updates on file changes
- Configuration change detection
- Line count threshold (3+ lines) for showing ghost text

### Known Issues
- Complex nested if statements may not always be parsed correctly
- The parser uses a regex-based approach which may miss some edge cases

[Unreleased]: https://github.com/lacymorrow/vscode-if-end-marker/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/lacymorrow/vscode-if-end-marker/releases/tag/v0.0.1