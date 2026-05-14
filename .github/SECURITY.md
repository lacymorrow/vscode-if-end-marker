# Security Policy

## Reporting a vulnerability

`vscode-if-end-marker` parses your source code and adds inline editor decorations. If you find a security issue — particularly anything around:

- Parsing/regex denial-of-service against the host editor
- Arbitrary code paths exposed by extension commands
- Decoration content that could be rendered in unintended places

please report it privately:

➔ https://github.com/lacymorrow/vscode-if-end-marker/security/advisories/new

Or email **lacy@lacymorrow.com** with `[vscode-if-end-marker security]` in the subject.

Expect an acknowledgement within 72 hours.

## Supported versions

Only the latest published version on the VS Code Marketplace receives security updates.

## Scope

In scope:
- The published `shipkit.vscode-if-end-marker` extension
- Parser, decoration provider, command registrations

Out of scope:
- Vulnerabilities in VS Code itself — report to [microsoft/vscode](https://github.com/microsoft/vscode)
- Issues that require an attacker who can already modify your local source files
