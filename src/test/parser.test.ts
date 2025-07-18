/**
 * Unit tests for the ASTParser class
 */

import * as assert from 'assert';
import { ASTParser } from '../parser';

suite('ASTParser Test Suite', () => {
    let parser: ASTParser;

    setup(() => {
        parser = new ASTParser();
    });

    test('Should parse simple if statement', () => {
        const code = `
if (condition) {
    console.log('test');
}`;
        const results = parser.parse(code, 'javascript');
        
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'condition');
        assert.strictEqual(results[0].startLine, 1);
        assert.strictEqual(results[0].endLine, 3);
    });

    test('Should parse multi-line if condition', () => {
        const code = `
if (userIsLoggedIn && 
    hasPermission &&
    !isExpired) {
    console.log('test');
}`;
        const results = parser.parse(code, 'javascript');
        
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'userIsLoggedIn && hasPermission && !isExpired');
        assert.strictEqual(results[0].startLine, 1);
        assert.strictEqual(results[0].endLine, 5);
    });

    test('Should parse else if statements', () => {
        const code = `
if (a) {
    console.log('a');
} else if (b) {
    console.log('b');
}`;
        const results = parser.parse(code, 'javascript');
        
        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].condition, 'a');
        assert.strictEqual(results[1].condition, 'b');
    });

    test('Should handle nested if statements', () => {
        const code = `
if (outer) {
    if (inner) {
        console.log('nested');
    }
}`;
        const results = parser.parse(code, 'javascript');
        
        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].condition, 'outer');
        assert.strictEqual(results[0].startLine, 1);
        assert.strictEqual(results[0].endLine, 5);
        assert.strictEqual(results[1].condition, 'inner');
        assert.strictEqual(results[1].startLine, 2);
        assert.strictEqual(results[1].endLine, 4);
    });

    test('Should handle if statements with complex conditions', () => {
        const code = `
if (typeof value === 'string' && value.length > 0 && (value.includes('test') || value.startsWith('debug'))) {
    process(value);
}`;
        const results = parser.parse(code, 'javascript');
        
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 
            "typeof value === 'string' && value.length > 0 && (value.includes('test') || value.startsWith('debug'))");
    });

    test('Should return empty array for code without if statements', () => {
        const code = `
function test() {
    console.log('no if statements here');
    return true;
}`;
        const results = parser.parse(code, 'javascript');
        
        assert.strictEqual(results.length, 0);
    });

    test('Should handle if statements with opening brace on new line', () => {
        const code = `
if (condition)
{
    console.log('test');
}`;
        const results = parser.parse(code, 'javascript');
        
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'condition');
        assert.strictEqual(results[0].startLine, 1);
        assert.strictEqual(results[0].endLine, 4);
    });

    test('Should skip if statements without braces', () => {
        const code = `
if (condition)
    console.log('test');`;
        const results = parser.parse(code, 'javascript');
        
        assert.strictEqual(results.length, 0);
    });

    test('Should extract correct start and end columns', () => {
        const code = `    if (test) {
        code();
    }`;
        const results = parser.parse(code, 'javascript');
        
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].startColumn, 4); // Position of 'if'
        assert.strictEqual(results[0].endColumn, 5); // Position after '}'
    });
});