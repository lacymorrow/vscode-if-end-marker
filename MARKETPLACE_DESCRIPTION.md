# VS Code Marketplace Description

## Short Description (≤ 200 characters)
Never lose track of which block you're closing! Shows inline markers with the original if, else, for, while or switch at closing braces in JS/TS/C/C++ files.

## Long Description

### 🎯 Never Lose Track of Your If Statements Again!

Have you ever been deep in a complex codebase, scrolling through a long if statement, only to find yourself at the closing brace wondering "which condition was this again?" 

**If-End Marker** solves this problem by displaying the original condition right where you need it - at the closing brace.

```javascript
if (user.isAuthenticated && 
    user.hasPermission('admin') && 
    !user.accountLocked) {
    // ... 50 lines of code ...
    
    performAdminAction();
    updateAuditLog();
} // user.isAuthenticated && user.hasPermission('admin') &&...
  ↑ This appears automatically!
```

### ✨ Key Features

- **🔍 Smart Detection**: Automatically shows markers for multi-line `if`, `else`, `for`, `while` and `switch` blocks
- **🎨 Theme Integration**: Markers adapt to your VS Code theme using native inlay hint colors
- **⚡ Blazing Fast**: Optimized for large codebases with smart caching and viewport rendering
- **🛠️ Fully Configurable**: Customize when and how markers appear
- **📝 Multi-language Support**: Works with JavaScript, TypeScript, JSX, TSX, MJS, and CJS files

### 🏆 Perfect For

- **Large Codebases**: Navigate complex business logic with ease
- **Team Development**: Reduce cognitive load when reviewing code
- **Legacy Code**: Understand deeply nested conditional logic
- **Code Reviews**: Quickly grasp the context of long if statements

### 🚀 Performance Optimized

Built with performance in mind for professional development:
- **Smart Caching**: Parse results are cached and reused
- **Viewport Rendering**: Only processes visible code
- **Debounced Updates**: Smooth performance during rapid typing
- **File Size Limits**: Automatically handles large files efficiently

### ⚙️ Configurable

Fine-tune the extension to your workflow:
- **Minimum Line Count**: Control when markers appear (default: 4+ lines)
- **Maximum Condition Length**: Customize text truncation (default: 50 chars)
- **File Size Limits**: Skip processing huge files (default: 500KB)
- **Update Frequency**: Adjust responsiveness (default: 300ms)

### 🎯 Use Cases

1. **Complex Business Logic**: Understand multi-condition validations
2. **Authentication & Authorization**: Track permission checks
3. **Data Validation**: Follow validation chains
4. **Error Handling**: Navigate through error conditions
5. **Feature Flags**: Keep track of feature toggle logic

### 📊 Supported Languages

- JavaScript (.js, .mjs, .cjs)
- TypeScript (.ts)
- JSX (.jsx) 
- TSX (.tsx)

### 🔧 Installation

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "If-End Marker"
4. Click Install

Or install via command palette:
```
ext install shipkit.vscode-if-end-marker
```

### 💡 Pro Tips

- Adjust `minLineCount` to 2-3 for more aggressive marking
- Increase `maxConditionLength` for longer conditions
- Use with code folding for maximum readability
- Great companion to bracket pair colorization

### 📈 Why Choose If-End Marker?

- **Zero Configuration**: Works out of the box
- **Lightweight**: Minimal impact on editor performance
- **Professional**: Built for enterprise-scale codebases
- **Maintained**: Regular updates and bug fixes
- **Open Source**: MIT licensed, community-driven

### 🛠️ About Shipkit

Created by [Shipkit](https://shipkit.io), a development tools company focused on improving developer productivity. We build tools that make complex code more understandable and maintainable.

### 🤝 Support & Feedback

- **Issues**: [GitHub Issues](https://github.com/lacymorrow/vscode-if-end-marker/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/lacymorrow/vscode-if-end-marker/discussions)
- **Documentation**: [README](https://github.com/lacymorrow/vscode-if-end-marker#readme)

Transform your coding experience today. Install If-End Marker and never lose track of your conditional logic again! 🚀

---

**Tags**: javascript, typescript, jsx, tsx, conditional, if-statement, code-navigation, developer-tools, productivity, inline-hints, markers, shipkit