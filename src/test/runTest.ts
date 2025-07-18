/**
 * VS Code Extension Test Runner
 * This file is executed by VS Code to run the extension tests
 */

import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // The path to the extension test script
        const extensionTestsPath = path.resolve(__dirname, './index');

        // Download VS Code, unzip it and run the integration test
        await runTests({ 
            extensionDevelopmentPath, 
            extensionTestsPath,
            launchArgs: ['--disable-extensions'] // Disable other extensions during testing
        });
    } catch (err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}

main();