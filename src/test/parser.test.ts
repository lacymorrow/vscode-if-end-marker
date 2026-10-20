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

    // --- Basic parsing ---

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
        assert.strictEqual(results[0].startColumn, 4);
        assert.strictEqual(results[0].endColumn, 5);
    });

    // --- String/char/template literal handling ---

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

    test('Should handle template literals with parens in conditions', () => {
        const code = "if (`(${x})` === expected) {\n    run();\n}";
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 1);
        assert.ok(results[0].condition.includes('`'));
    });

    test('Should handle escaped quotes in strings', () => {
        const code = `
if (str === "it\\'s a \\"test\\"") {
    run();
}`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 1);
    });

    // --- Brace counting with strings/comments ---

    test('Should not count braces inside string literals in body', () => {
        const code = `
if (condition) {
    const obj = "{ fake }";
    const arr = "[ also fake ]";
}`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].endLine, 4);
    });

    test('Should not count braces inside single-line comments', () => {
        const code = `
if (condition) {
    // this brace { doesn't count
    doStuff();
    // neither does this one }
}`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].endLine, 5);
    });

    test('Should not count braces inside block comments', () => {
        const code = `
if (condition) {
    /* this brace { doesn't count */
    doStuff();
    /* } */
}`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].endLine, 5);
    });

    test('Should not count braces inside template literals in body', () => {
        const code = "if (condition) {\n    const s = `template with { braces }`;\n    run();\n}";
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].endLine, 3);
    });

    // --- C/C++ specific ---

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

    // --- Braceless if statements ---

    test('Should skip braceless if with statement on next line (C style)', () => {
        const code = `
if (retval)
    return retval;

if (dev->going_away) {
    retval = -ENODEV;
    goto out;
}`;
        const results = parser.parse(code, 'c');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'dev->going_away');
    });

    test('Should skip braceless if followed by braced if (input.c pattern)', () => {
        const code = `
if (!dev->users++ && dev->open)
    retval = dev->open(dev);

if (retval) {
    dev->users--;
    if (!--handle->open) {
        synchronize_rcu();
    }
}`;
        const results = parser.parse(code, 'c');

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].condition, 'retval');
        assert.strictEqual(results[0].startLine, 4);
        assert.strictEqual(results[0].endLine, 9);
        assert.strictEqual(results[1].condition, '!--handle->open');
        assert.strictEqual(results[1].startLine, 6);
        assert.strictEqual(results[1].endLine, 8);
    });

    test('Should skip braceless if with inline statement (same line)', () => {
        const code = `
if (error) return -1;
if (valid) {
    process();
}`;
        const results = parser.parse(code, 'c');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'valid');
    });

    test('Should handle full input_open_device function from issue #6', () => {
        const code = `int input_open_device(struct input_handle *handle)
{
\tstruct input_dev *dev = handle->dev;
\tint retval;

\tretval = mutex_lock_interruptible(&dev->mutex);
\tif (retval)
\t\treturn retval;

\tif (dev->going_away) {
\t\tretval = -ENODEV;
\t\tgoto out;
\t}

\thandle->open++;

\tif (!dev->users++ && dev->open)
\t\tretval = dev->open(dev);

\tif (retval) {
\t\tdev->users--;
\t\tif (!--handle->open) {
\t\t\tsynchronize_rcu();
\t\t}
\t}

 out:
\tmutex_unlock(&dev->mutex);
\treturn retval;
}`;
        const results = parser.parse(code, 'c');

        assert.strictEqual(results.length, 3);
        assert.strictEqual(results[0].condition, 'dev->going_away');
        assert.strictEqual(results[1].condition, 'retval');
        assert.strictEqual(results[2].condition, '!--handle->open');
    });

    // --- Comments between condition and brace ---

    test('Should handle single-line comment between condition and next-line brace', () => {
        const code = `
if (g_ucSerBuf[STATUS] == 0x00) //STATUS=2
{
    return CommandOk;
}`;
        const results = parser.parse(code, 'c');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'g_ucSerBuf[STATUS] == 0x00');
        assert.strictEqual(results[0].startLine, 1);
        assert.strictEqual(results[0].endLine, 4);
    });

    test('Should handle block comment between condition and brace on same line', () => {
        const code = `
if (condition) /* checked */ {
    run();
}`;
        const results = parser.parse(code, 'c');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'condition');
    });

    test('Should still skip braceless if with comment', () => {
        const code = `
if (error) //check
    return -1;
if (valid) {
    process();
}`;
        const results = parser.parse(code, 'c');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'valid');
    });

    // --- CRLF line endings ---

    test('Should handle CRLF line endings with brace on next line', () => {
        const code = "if (condition)\r\n{\r\n    console.log('test');\r\n}";
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'condition');
    });

    test('Should handle CRLF in C code with preprocessor directives', () => {
        const code = [
            'void func(void)',
            '{',
            '  #if(UART_INT == 1)',
            '  receive_data();',
            '  #endif',
            '  if (status == 0x00 && seq == (buf[CMD] & 0xf0))',
            '  {',
            '    memcpy(dst, &buf[DATA], len);',
            '    return OK;',
            '  }',
            '  else',
            '    return ERR;',
            '}',
        ].join('\r\n');
        const results = parser.parse(code, 'c');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'status == 0x00 && seq == (buf[CMD] & 0xf0)');
    });

    test('Should handle CRLF with comment after condition', () => {
        const code = "if (status == 0x00) //check\r\n{\r\n    return OK;\r\n}";
        const results = parser.parse(code, 'c');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'status == 0x00');
    });

    test('Should handle CRLF with brace on same line', () => {
        const code = "if (x > 0) {\r\n    process(x);\r\n}";
        const results = parser.parse(code, 'c');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'x > 0');
    });

    // --- Edge cases ---

    test('Should handle empty code', () => {
        const results = parser.parse('', 'javascript');
        assert.strictEqual(results.length, 0);
    });

    test('Should handle code with only whitespace', () => {
        const results = parser.parse('   \n  \n   ', 'javascript');
        assert.strictEqual(results.length, 0);
    });

    test('Should handle deeply nested if statements', () => {
        const code = `
if (a) {
    if (b) {
        if (c) {
            if (d) {
                run();
            }
        }
    }
}`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 4);
        assert.strictEqual(results[0].condition, 'a');
        assert.strictEqual(results[3].condition, 'd');
    });

    test('Should handle if with no body content', () => {
        const code = `
if (flag) {
}`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'flag');
    });

    test('Should handle multiple independent if blocks', () => {
        const code = `
if (a) {
    doA();
}

if (b) {
    doB();
}

if (c) {
    doC();
}`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 3);
        assert.strictEqual(results[0].condition, 'a');
        assert.strictEqual(results[1].condition, 'b');
        assert.strictEqual(results[2].condition, 'c');
    });

    test('Should handle JSX-like syntax in conditions', () => {
        const code = `
if (props.children && Array.isArray(props.children)) {
    return <div>{children}</div>;
}`;
        const results = parser.parse(code, 'typescriptreact');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'props.children && Array.isArray(props.children)');
    });

    test('Should handle condition with ternary operator', () => {
        const code = `
if (x ? true : false) {
    run();
}`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].condition, 'x ? true : false');
    });

    // --- Construct kinds (GH #58) ---

    test('Should tag an if statement with kind "if"', () => {
        const code = `
if (ready) {
    go();
}`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].kind, 'if');
    });

    test('Should mark the closing brace of an else block', () => {
        const code = `
if (a) {
    first();
} else {
    second();
}`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].kind, 'if');
        assert.strictEqual(results[0].condition, 'a');
        assert.strictEqual(results[0].endLine, 3);
        assert.strictEqual(results[1].kind, 'else');
        assert.strictEqual(results[1].condition, '');
        assert.strictEqual(results[1].startLine, 3);
        assert.strictEqual(results[1].endLine, 5);
    });

    test('Should put the else keyword column in startColumn', () => {
        const code = `if (a) {
    first();
} else {
    second();
}`;
        const results = parser.parse(code, 'javascript');
        const elseBlock = results.find(r => r.kind === 'else');

        assert.ok(elseBlock);
        assert.strictEqual(elseBlock.startColumn, 2);
        assert.strictEqual(elseBlock.endColumn, 1);
    });

    test('Should mark an else block with its brace on the next line', () => {
        const code = `
if (a) {
    first();
}
else
{
    second();
}`;
        const results = parser.parse(code, 'javascript');
        const elseBlocks = results.filter(r => r.kind === 'else');

        assert.strictEqual(elseBlocks.length, 1);
        assert.strictEqual(elseBlocks[0].startLine, 4);
        assert.strictEqual(elseBlocks[0].endLine, 7);
    });

    test('Should read "else if" as an if, not as a bare else', () => {
        const code = `
if (a) {
    first();
} else if (b) {
    second();
} else {
    third();
}`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 3);
        assert.strictEqual(results[0].kind, 'if');
        assert.strictEqual(results[1].kind, 'if');
        assert.strictEqual(results[1].condition, 'b');
        assert.strictEqual(results[2].kind, 'else');
    });

    test('Should skip a braceless else', () => {
        const code = `
if (a) {
    first();
} else
    second();`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].kind, 'if');
    });

    test('Should not treat an identifier starting with else as an else block', () => {
        const code = `
elsewhere = {
    a: 1,
    b: 2,
    c: 3
};`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 0);
    });

    test('Should mark a for loop with its header', () => {
        const code = `
for (let i = 0; i < items.length; i++) {
    process(items[i]);
    log(i);
}`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].kind, 'for');
        assert.strictEqual(results[0].condition, 'let i = 0; i < items.length; i++');
        assert.strictEqual(results[0].endLine, 4);
    });

    test('Should mark a for-of and a for-await-of loop', () => {
        const code = `
for (const item of items) {
    use(item);
}
for await (const chunk of stream) {
    use(chunk);
}`;
        const results = parser.parse(code, 'typescript');

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].condition, 'const item of items');
        assert.strictEqual(results[1].kind, 'for');
        assert.strictEqual(results[1].condition, 'const chunk of stream');
    });

    test('Should not treat forEach as a for loop', () => {
        const code = `
forEach(items, (item) => {
    use(item);
});`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 0);
    });

    test('Should mark a while loop', () => {
        const code = `
while (queue.length > 0) {
    handle(queue.pop());
}`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].kind, 'while');
        assert.strictEqual(results[0].condition, 'queue.length > 0');
    });

    test('Should not mark the trailing while of a do-while loop', () => {
        const code = `
do {
    step();
    count++;
} while (count < limit);`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 0);
    });

    test('Should mark a switch statement with its subject', () => {
        const code = `
switch (action.type) {
    case 'add':
        return add();
    default:
        return noop();
}`;
        const results = parser.parse(code, 'typescript');

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].kind, 'switch');
        assert.strictEqual(results[0].condition, 'action.type');
        assert.strictEqual(results[0].endLine, 6);
    });

    test('Should mark a loop nested inside an if', () => {
        const code = `
if (shouldRun) {
    for (const item of items) {
        use(item);
    }
}`;
        const results = parser.parse(code, 'javascript');

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].kind, 'if');
        assert.strictEqual(results[0].endLine, 5);
        assert.strictEqual(results[1].kind, 'for');
        assert.strictEqual(results[1].endLine, 4);
    });

    test('Should mark a C for loop and a C switch', () => {
        const code = `
for (int i = 0; i < n; i++) {
    total += values[i];
}
switch (state) {
    case READY:
        break;
    default:
        break;
}`;
        const results = parser.parse(code, 'c');

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].kind, 'for');
        assert.strictEqual(results[0].condition, 'int i = 0; i < n; i++');
        assert.strictEqual(results[1].kind, 'switch');
        assert.strictEqual(results[1].condition, 'state');
    });

    test('Should skip a braceless for loop', () => {
        const code = `
for (int i = 0; i < n; i++)
    total += values[i];`;
        const results = parser.parse(code, 'c');

        assert.strictEqual(results.length, 0);
    });
});
