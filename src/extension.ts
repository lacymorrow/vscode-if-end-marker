import * as vscode from 'vscode';
import { IfStatementDecorationProvider } from './decorationProvider';

/**
 * Activates the extension when VS Code loads it.
 * Sets up event listeners for text editor changes and configuration updates.
 * 
 * @param context - The extension context provided by VS Code
 */
export function activate(context: vscode.ExtensionContext) {
    // Create the decoration provider instance that will handle all the marker logic
    const provider = new IfStatementDecorationProvider();
    
    // Debounce timer for text changes
    let updateTimer: NodeJS.Timeout | undefined;
    
    // Get performance configuration
    const getDebounceDelay = () => {
        const config = vscode.workspace.getConfiguration('vscodeIfEndMarker');
        return config.get<number>('debounceDelay', 250);
    };
    
    // Register event listeners and combine them into a single disposable
    const disposable = vscode.Disposable.from(
        // Update decorations when the active editor changes
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                provider.updateDecorations(editor);
            }
        }),
        // Update decorations when the document content changes
        vscode.workspace.onDidChangeTextDocument(event => {
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document) {
                // Clear any pending update
                if (updateTimer) {
                    clearTimeout(updateTimer);
                }
                // Only update if changes affect visible content or are structural
                const visibleRanges = editor.visibleRanges;
                const changesInView = event.contentChanges.length === 0 || 
                    event.contentChanges.some(change => 
                        visibleRanges.some(range => range.contains(change.range.start))
                    );
                
                if (changesInView) {
                    // Debounce updates to avoid excessive parsing during rapid typing
                    updateTimer = setTimeout(() => {
                        provider.updateDecorations(editor);
                        updateTimer = undefined;
                    }, getDebounceDelay());
                }
            }
        }),
        // Update decorations when configuration settings change
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('vscodeIfEndMarker')) {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    provider.updateDecorations(editor);
                }
            }
        }),
        // Clear cache when documents are closed to free memory
        vscode.workspace.onDidCloseTextDocument(document => {
            provider.clearCacheForDocument(document.uri);
        }),
        // Update decorations when visible ranges change (scrolling)
        vscode.window.onDidChangeTextEditorVisibleRanges(event => {
            if (event.textEditor === vscode.window.activeTextEditor) {
                // Use a shorter delay for scroll events
                if (updateTimer) {
                    clearTimeout(updateTimer);
                }
                updateTimer = setTimeout(() => {
                    provider.updateDecorations(event.textEditor);
                    updateTimer = undefined;
                }, 50);
            }
        })
    );

    // Register the disposable to ensure proper cleanup when the extension is deactivated
    context.subscriptions.push(disposable);
    
    // Register the provider for disposal
    context.subscriptions.push({
        dispose: () => provider.dispose()
    });

    // Initialize decorations for the currently active editor (if any)
    if (vscode.window.activeTextEditor) {
        provider.updateDecorations(vscode.window.activeTextEditor);
    }
}

/**
 * Called when the extension is deactivated.
 * VS Code automatically disposes of all subscriptions in the extension context.
 */
export function deactivate() {}