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

    // C/C++ specific tests

    test('Should parse C/C++ if statement with C types', () => {
        const code = `
if (ptr != NULL) {
    int x = 10;
    char* name = "test";
}`;
        const results = parser.parse(code, 'c');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'ptr != NULL');
        assert.strictEqual(results[0].startLine, 1);
        assert.strictEqual(results[0].endLine, 4);
    });

    test('Should not treat #ifdef/#ifndef as if statements', () => {
        const code = `
#ifdef DEBUG
    int debug_level = 1;
#endif
#ifndef RELEASE
    int verbose = 1;
#endif
if (x > 0) {
    process(x);
}`;
        const results = parser.parse(code, 'cpp');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'x > 0');
    });

    test('Should parse nested C/C++ if blocks', () => {
        const code = `
if (argc > 1) {
    if (argv[1] != NULL) {
        printf("%s", argv[1]);
    }
}`;
        const results = parser.parse(code, 'c');

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].condition, 'argc > 1');
        assert.strictEqual(results[0].startLine, 1);
        assert.strictEqual(results[0].endLine, 5);
        assert.strictEqual(results[1].condition, 'argv[1] != NULL');
        assert.strictEqual(results[1].startLine, 2);
        assert.strictEqual(results[1].endLine, 4);
    });

    test('Should handle parentheses inside string and char literals', () => {
        const code = `
if (c == '(') {
    printf("matched (paren)");
}`;
        const results = parser.parse(code, 'c');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, "c == '('");
    });

    test('Should handle parentheses inside double-quoted strings', () => {
        const code = `
if (str.find("(test)") != std::string::npos) {
    process();
}`;
        const results = parser.parse(code, 'cpp');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'str.find("(test)") != std::string::npos');
    });

    test('Should parse C/C++ if/else if/else chains', () => {
        const code = `
if (status == 0) {
    printf("success");
} else if (status == 1) {
    printf("warning");
} else if (status < 0) {
    printf("error");
}`;
        const results = parser.parse(code, 'cpp');

        assert.strictEqual(results.length, 3);
        assert.strictEqual(results[0].condition, 'status == 0');
        assert.strictEqual(results[1].condition, 'status == 1');
        assert.strictEqual(results[2].condition, 'status < 0');
    });
});