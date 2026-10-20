import * as vscode from 'vscode';
import { ASTParser, BlockMarker, ConstructKind } from './parser';
import { CONFIG_NAMESPACE, CONFIG_KEYS, CONFIG_DEFAULTS, KNOWN_CONSTRUCTS, SUPPORTED_LANGUAGES } from './config';
import { formatBlockMarker } from './markerText';

/**
 * Provides decoration functionality for displaying a block's opening line
 * as an inline marker at its closing brace.
 */
export class IfStatementDecorationProvider {
    /** The decoration type used to render inline markers */
    private decorationType: vscode.TextEditorDecorationType;
    /** Parser instance for extracting if statements from code */
    private parser: ASTParser;
    /** Track the last editor to ensure proper cleanup */
    private lastEditor: vscode.TextEditor | undefined;
    /** Cache parse results keyed by document URI */
    private parseCache = new Map<string, { version: number; statements: BlockMarker[] }>();

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
        const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
        const enabled = config.get<boolean>(CONFIG_KEYS.ENABLED, CONFIG_DEFAULTS.ENABLED);
        
        // Clear decorations if disabled or unsupported language
        if (!enabled || !this.isSupported(editor.document.languageId)) {
            editor.setDecorations(this.decorationType, []);
            return;
        }

        // Skip large files for performance
        const document = editor.document;
        const maxFileSize = config.get<number>(CONFIG_KEYS.MAX_FILE_SIZE, CONFIG_DEFAULTS.MAX_FILE_SIZE);
        if (document.getText().length > maxFileSize) {
            editor.setDecorations(this.decorationType, []);
            return;
        }
        
        // Use cached parse results if document hasn't changed
        const cacheKey = document.uri.toString();
        const cached = this.parseCache.get(cacheKey);
        
        let blocks: BlockMarker[];
        if (cached && cached.version === document.version) {
            // Use cached results
            blocks = cached.statements;
        } else {
            // Parse and cache results
            const text = document.getText();
            blocks = this.parser.parse(text, document.languageId);

            // Limit cache size to prevent memory issues
            if (this.parseCache.size > CONFIG_DEFAULTS.MAX_CACHE_SIZE) {
                // Remove oldest entries
                const firstKey = this.parseCache.keys().next().value;
                if (firstKey) this.parseCache.delete(firstKey);
            }
            
            this.parseCache.set(cacheKey, {
                version: document.version,
                statements: blocks
            });
        }

        // Drop constructs the user has turned off. Filtering here rather than in
        // the parser keeps cached parse results valid across a settings change.
        const enabledConstructs = this.getEnabledConstructs(config);
        const wantedBlocks = blocks.filter(block => enabledConstructs.has(block.kind));

        // Only create decorations for visible ranges
        const visibleRanges = editor.visibleRanges;
        const visibleStatements = wantedBlocks.filter(stmt => {
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
        return SUPPORTED_LANGUAGES.includes(languageId as any);
    }

    /**
     * Reads the configured construct list, ignoring any entry the parser does
     * not recognise so a typo in settings cannot hide every marker.
     *
     * @param config - Extension configuration
     * @returns The set of constructs that should get markers
     */
    private getEnabledConstructs(config: vscode.WorkspaceConfiguration): Set<ConstructKind> {
        const configured = config.get<string[]>(CONFIG_KEYS.CONSTRUCTS, [...CONFIG_DEFAULTS.CONSTRUCTS]);
        const known = new Set<string>(KNOWN_CONSTRUCTS);
        return new Set(
            (Array.isArray(configured) ? configured : [...CONFIG_DEFAULTS.CONSTRUCTS])
                .filter((kind): kind is ConstructKind => known.has(kind))
        );
    }

    /**
     * Creates decoration options for the given blocks.
     *
     * @param blocks - Array of parsed blocks
     * @param document - The VS Code text document
     * @param config - Extension configuration
     * @returns Array of decoration options to apply
     */
    private createDecorations(
        blocks: BlockMarker[],
        document: vscode.TextDocument,
        config: vscode.WorkspaceConfiguration
    ): vscode.DecorationOptions[] {
        const decorations: vscode.DecorationOptions[] = [];
        const maxLength = config.get<number>(CONFIG_KEYS.MAX_CONDITION_LENGTH, CONFIG_DEFAULTS.MAX_CONDITION_LENGTH);

        // Process each block
        for (const ifStmt of blocks) {
            // Only create decoration if it meets criteria
            if (this.shouldShowDecoration(ifStmt, document)) {
                const position = new vscode.Position(ifStmt.endLine, ifStmt.endColumn);
                const displayText = formatBlockMarker(ifStmt, maxLength);

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
     * Determines whether a decoration should be shown for the given block.
     * Shows decorations only for blocks spanning at least `minLineCount` lines.
     *
     * @param ifStmt - The block to check
     * @param document - The document containing the block
     * @returns True if decoration should be shown, false otherwise
     */
    private shouldShowDecoration(ifStmt: BlockMarker, document: vscode.TextDocument): boolean {
        // Only show markers for blocks that span multiple lines.
        // This is what keeps short blocks, and the new non-if constructs,
        // from cluttering normally nested code.
        const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
        const minLineCount = config.get<number>(CONFIG_KEYS.MIN_LINE_COUNT, CONFIG_DEFAULTS.MIN_LINE_COUNT);
        const lineCount = ifStmt.endLine - ifStmt.startLine;
        return lineCount >= minLineCount;
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