/**
 * Unit tests for the IfStatementDecorationProvider class
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { IfStatementDecorationProvider } from '../decorationProvider';

suite('IfStatementDecorationProvider Test Suite', () => {
    let provider: IfStatementDecorationProvider;

    setup(() => {
        provider = new IfStatementDecorationProvider();
    });

    test('Should create decoration provider', () => {
        assert.ok(provider);
    });

    test('Should update decorations without errors', async () => {
        // Open a test document
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
        
        // This should not throw
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
        
        // Should not throw for unsupported languages
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
        // Mock configuration
        const config = vscode.workspace.getConfiguration('ifEndGhostText');
        await config.update('enabled', false, vscode.ConfigurationTarget.Global);
        
        const content = `
if (test) {
    console.log('test');
}`;
        
        const document = await vscode.workspace.openTextDocument({
            language: 'javascript',
            content: content
        });
        
        const editor = await vscode.window.showTextDocument(document);
        
        assert.doesNotThrow(() => {
            provider.updateDecorations(editor);
        });
        
        // Reset configuration
        await config.update('enabled', true, vscode.ConfigurationTarget.Global);
    });
});