/**
 * Unit tests for the IfStatementDecorationProvider class
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { IfStatementDecorationProvider } from '../decorationProvider';
import { CONFIG_NAMESPACE, CONFIG_KEYS } from '../config';

suite('IfStatementDecorationProvider Test Suite', () => {
    let provider: IfStatementDecorationProvider;

    setup(() => {
        provider = new IfStatementDecorationProvider();
    });

    teardown(() => {
        provider.dispose();
    });

    test('Should create decoration provider', () => {
        assert.ok(provider);
    });

    test('Should update decorations without errors', async () => {
        const content = `
if (test) {
    console.log('line 1');
    console.log('line 2');
    console.log('line 3');
}`;
        
        const document = await vscode.workspace.openTextDocument({
            language: 'javascript',
            content: content
        });
        
        const editor = await vscode.window.showTextDocument(document);
        
        assert.doesNotThrow(() => {
            provider.updateDecorations(editor);
        });
    });

    test('Should clear decorations for unsupported languages', async () => {
        const content = 'print("Hello from Python")';
        
        const document = await vscode.workspace.openTextDocument({
            language: 'python',
            content: content
        });
        
        const editor = await vscode.window.showTextDocument(document);
        
        assert.doesNotThrow(() => {
            provider.updateDecorations(editor);
        });
    });

    test('Should handle empty documents', async () => {
        const document = await vscode.workspace.openTextDocument({
            language: 'javascript',
            content: ''
        });
        
        const editor = await vscode.window.showTextDocument(document);
        
        assert.doesNotThrow(() => {
            provider.updateDecorations(editor);
        });
    });

    test('Should respect enabled configuration', async () => {
        const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);

        // Disable the extension via the correct namespace
        await config.update(CONFIG_KEYS.ENABLED, false, vscode.ConfigurationTarget.Global);
        
        try {
            const content = `
if (test) {
    console.log('line 1');
    console.log('line 2');
    console.log('line 3');
    console.log('line 4');
    console.log('line 5');
}`;
            
            const document = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: content
            });
            
            const editor = await vscode.window.showTextDocument(document);
            
            // Should not throw when disabled
            assert.doesNotThrow(() => {
                provider.updateDecorations(editor);
            });
        } finally {
            // Always reset configuration, even if the test fails
            await config.update(CONFIG_KEYS.ENABLED, true, vscode.ConfigurationTarget.Global);
        }
    });

    test('Should handle C/C++ languages', async () => {
        const content = `
if (ptr != NULL) {
    int x = 10;
    char* name = "test";
    printf("hello");
    free(name);
}`;

        const document = await vscode.workspace.openTextDocument({
            language: 'c',
            content: content
        });

        const editor = await vscode.window.showTextDocument(document);

        assert.doesNotThrow(() => {
            provider.updateDecorations(editor);
        });
    });

    test('Should handle large documents gracefully', async () => {
        // Generate a document with many if statements
        const lines: string[] = [];
        for (let i = 0; i < 100; i++) {
            lines.push(`if (condition_${i}) {`);
            lines.push(`    console.log('block ${i}');`);
            lines.push(`    doSomething();`);
            lines.push(`    doMore();`);
            lines.push(`    finish();`);
            lines.push(`}`);
        }

        const document = await vscode.workspace.openTextDocument({
            language: 'javascript',
            content: lines.join('\n')
        });

        const editor = await vscode.window.showTextDocument(document);

        assert.doesNotThrow(() => {
            provider.updateDecorations(editor);
        });
    });

    test('Should dispose cleanly', () => {
        const disposableProvider = new IfStatementDecorationProvider();
        assert.doesNotThrow(() => {
            disposableProvider.dispose();
        });
    });
});
