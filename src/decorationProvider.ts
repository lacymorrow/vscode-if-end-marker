import * as vscode from 'vscode';
import { ASTParser, IfStatement } from './parser';

/**
 * Provides decoration functionality for displaying if statement conditions
 * as inline markers at the closing brace of if blocks.
 */
export class IfStatementDecorationProvider {
    /** The decoration type used to render inline markers */
    private decorationType: vscode.TextEditorDecorationType;
    /** Parser instance for extracting if statements from code */
    private parser: ASTParser;
    /** Track the last editor to ensure proper cleanup */
    private lastEditor: vscode.TextEditor | undefined;
    /** Cache parse results keyed by document URI */
    private parseCache = new Map<string, { version: number; statements: IfStatement[] }>();

    /**
     * Initializes the decoration provider with VS Code theme-aware styling.
     */
    constructor() {
        // Create decoration type with theme-aware colors that match VS Code's inlay hints
        this.decorationType = vscode.window.createTextEditorDecorationType({
            after: {
                color: new vscode.ThemeColor('editorInlayHint.foreground'),
                backgroundColor: new vscode.ThemeColor('editorInlayHint.background'),
                fontStyle: 'italic',
                margin: '0 0 0 1em' // Add spacing before the marker
            }
        });
        this.parser = new ASTParser();
    }

    /**
     * Updates decorations in the given text editor.
     * Parses the document, finds if statements, and applies ghost text decorations.
     * 
     * @param editor - The VS Code text editor to update
     */
    updateDecorations(editor: vscode.TextEditor): void {
        // Always clear existing decorations first to ensure clean state
        if (this.lastEditor && this.lastEditor !== editor) {
            this.lastEditor.setDecorations(this.decorationType, []);
        }
        this.lastEditor = editor;
        
        // Get extension configuration
        const config = vscode.workspace.getConfiguration('vscodeIfEndMarker');
        const enabled = config.get<boolean>('enabled', true);
        
        // Clear decorations if disabled or unsupported language
        if (!enabled || !this.isSupported(editor.document.languageId)) {
            editor.setDecorations(this.decorationType, []);
            return;
        }

        // Skip large files for performance
        const document = editor.document;
        const maxFileSize = config.get<number>('maxFileSize', 100000);
        if (document.getText().length > maxFileSize) {
            editor.setDecorations(this.decorationType, []);
            return;
        }
        
        // Use cached parse results if document hasn't changed
        const cacheKey = document.uri.toString();
        const cached = this.parseCache.get(cacheKey);
        
        let ifStatements: IfStatement[];
        if (cached && cached.version === document.version) {
            // Use cached results
            ifStatements = cached.statements;
        } else {
            // Parse and cache results
            const text = document.getText();
            ifStatements = this.parser.parse(text, document.languageId);
            
            // Limit cache size to prevent memory issues
            if (this.parseCache.size > 50) {
                // Remove oldest entries
                const firstKey = this.parseCache.keys().next().value;
                if (firstKey) this.parseCache.delete(firstKey);
            }
            
            this.parseCache.set(cacheKey, {
                version: document.version,
                statements: ifStatements
            });
        }
        
        // Only create decorations for visible ranges
        const visibleRanges = editor.visibleRanges;
        const visibleStatements = ifStatements.filter(stmt => {
            const stmtRange = new vscode.Range(
                new vscode.Position(stmt.startLine, 0),
                new vscode.Position(stmt.endLine, stmt.endColumn)
            );
            return visibleRanges.some(range => range.intersection(stmtRange));
        });
        
        const decorations = this.createDecorations(visibleStatements, document, config);
        
        // Apply decorations to the editor (this replaces all existing decorations)
        editor.setDecorations(this.decorationType, decorations);
    }

    /**
     * Checks if the given language is supported by this extension.
     * 
     * @param languageId - The VS Code language identifier
     * @returns True if the language is supported, false otherwise
     */
    private isSupported(languageId: string): boolean {
        // List of supported language identifiers
        const supportedLanguages = [
            'javascript',      // .js, .mjs, .cjs
            'typescript',      // .ts
            'javascriptreact', // .jsx
            'typescriptreact'  // .tsx
        ];
        return supportedLanguages.includes(languageId);
    }

    /**
     * Creates decoration options for the given if statements.
     * 
     * @param ifStatements - Array of parsed if statements
     * @param document - The VS Code text document
     * @param config - Extension configuration
     * @returns Array of decoration options to apply
     */
    private createDecorations(
        ifStatements: IfStatement[], 
        document: vscode.TextDocument,
        config: vscode.WorkspaceConfiguration
    ): vscode.DecorationOptions[] {
        const decorations: vscode.DecorationOptions[] = [];
        const maxLength = config.get<number>('maxConditionLength', 40);

        // Process each if statement
        for (const ifStmt of ifStatements) {
            // Only create decoration if it meets criteria
            if (this.shouldShowDecoration(ifStmt, document)) {
                const position = new vscode.Position(ifStmt.endLine, ifStmt.endColumn);
                const displayText = this.formatCondition(ifStmt.condition, maxLength);
                
                // Create decoration at the closing brace position
                decorations.push({
                    range: new vscode.Range(position, position),
                    renderOptions: {
                        after: {
                            contentText: ` // ${displayText}`
                        }
                    }
                });
            }
        }

        return decorations;
    }

    /**
     * Determines whether a decoration should be shown for the given if statement.
     * Currently shows decorations only for if blocks spanning 3 or more lines.
     * 
     * @param ifStmt - The if statement to check
     * @param document - The document containing the if statement
     * @returns True if decoration should be shown, false otherwise
     */
    private shouldShowDecoration(ifStmt: IfStatement, document: vscode.TextDocument): boolean {
        // Only show markers for if statements that span multiple lines
        // This avoids cluttering short if statements
        const config = vscode.workspace.getConfiguration('vscodeIfEndMarker');
        const minLineCount = config.get<number>('minLineCount', 3);
        const lineCount = ifStmt.endLine - ifStmt.startLine;
        return lineCount >= minLineCount;
    }

    /**
     * Formats the condition text for display.
     * Truncates long conditions and adds ellipsis if needed.
     * 
     * @param condition - The condition text to format
     * @param maxLength - Maximum length before truncation
     * @returns Formatted condition text
     */
    private formatCondition(condition: string, maxLength: number): string {
        if (condition.length <= maxLength) {
            return condition;
        }
        // Truncate and add ellipsis to indicate continuation
        return condition.substring(0, maxLength - 3) + '...';
    }
    
    /**
     * Disposes of the decoration provider and cleans up resources.
     */
    dispose(): void {
        // Clear decorations from the last editor
        if (this.lastEditor) {
            this.lastEditor.setDecorations(this.decorationType, []);
        }
        // Clear the parse cache
        this.parseCache.clear();
        // Dispose of the decoration type
        this.decorationType.dispose();
    }
    
    /**
     * Clears the cache for a specific document.
     * @param uri - The document URI to clear from cache
     */
    clearCacheForDocument(uri: vscode.Uri): void {
        this.parseCache.delete(uri.toString());
    }
}