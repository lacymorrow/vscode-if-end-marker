/**
 * Unit tests for the marker text shown at a closing brace
 */

import * as assert from 'assert';
import { BlockMarker, ConstructKind } from '../parser';
import { formatBlockMarker, truncateHeader } from '../markerText';

function block(kind: ConstructKind, condition: string): BlockMarker {
    return { kind, condition, startLine: 0, endLine: 5, startColumn: 0, endColumn: 1 };
}

suite('Marker Text Test Suite', () => {

    test('Should show an if condition bare, with no keyword', () => {
        assert.strictEqual(formatBlockMarker(block('if', 'user.isAdmin'), 50), 'user.isAdmin');
    });

    test('Should show else as just the keyword', () => {
        assert.strictEqual(formatBlockMarker(block('else', ''), 50), 'else');
    });

    test('Should lead with the keyword for for, while and switch', () => {
        assert.strictEqual(
            formatBlockMarker(block('for', 'const item of items'), 50),
            'for (const item of items)'
        );
        assert.strictEqual(
            formatBlockMarker(block('while', 'queue.length > 0'), 50),
            'while (queue.length > 0)'
        );
        assert.strictEqual(
            formatBlockMarker(block('switch', 'action.type'), 50),
            'switch (action.type)'
        );
    });

    test('Should truncate the header but keep the keyword visible', () => {
        const long = 'let index = 0; index < collection.length; index++';
        const result = formatBlockMarker(block('for', long), 20);

        assert.strictEqual(result, 'for (let index = 0; in...)');
    });

    test('Should leave a header at the limit untouched', () => {
        assert.strictEqual(truncateHeader('abcde', 5), 'abcde');
    });

    test('Should truncate a header over the limit', () => {
        assert.strictEqual(truncateHeader('abcdefgh', 5), 'ab...');
    });
});
