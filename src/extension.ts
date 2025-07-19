import * as vscode from 'vscode';
import { IfStatementDecorationProvider } from './decorationProvider';
import { CONFIG_NAMESPACE, CONFIG_KEYS, CONFIG_DEFAULTS, COMMANDS, UI_TEXT } from './config';

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
        const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
        return config.get<number>(CONFIG_KEYS.DEBOUNCE_DELAY, CONFIG_DEFAULTS.DEBOUNCE_DELAY);
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
            if (event.affectsConfiguration(CONFIG_NAMESPACE)) {
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
                }, CONFIG_DEFAULTS.VIEWPORT_UPDATE_DELAY);
            }
        })
    );

    // Register the disposable to ensure proper cleanup when the extension is deactivated
    context.subscriptions.push(disposable);
    
    // Register the provider for disposal
    context.subscriptions.push({
        dispose: () => provider.dispose()
    });

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.TOGGLE, () => {
            const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
            const currentEnabled = config.get<boolean>(CONFIG_KEYS.ENABLED, CONFIG_DEFAULTS.ENABLED);
            config.update(CONFIG_KEYS.ENABLED, !currentEnabled, vscode.ConfigurationTarget.Global)
                .then(() => {
                    vscode.window.showInformationMessage(
                        UI_TEXT.MARKERS_TOGGLED(!currentEnabled)
                    );
                });
        }),
        vscode.commands.registerCommand(COMMANDS.ENABLE, () => {
            const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
            config.update(CONFIG_KEYS.ENABLED, true, vscode.ConfigurationTarget.Global)
                .then(() => {
                    vscode.window.showInformationMessage(UI_TEXT.MARKERS_ENABLED);
                });
        }),
        vscode.commands.registerCommand(COMMANDS.DISABLE, () => {
            const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
            config.update(CONFIG_KEYS.ENABLED, false, vscode.ConfigurationTarget.Global)
                .then(() => {
                    vscode.window.showInformationMessage(UI_TEXT.MARKERS_DISABLED);
                });
        })
    );

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