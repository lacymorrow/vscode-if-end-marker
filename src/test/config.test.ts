/**
 * Unit tests for resolving the `constructs` setting
 */

import * as assert from 'assert';
import { CONFIG_DEFAULTS, resolveConstructs } from '../config';

const ALL = [...CONFIG_DEFAULTS.CONSTRUCTS].sort();

function sorted(set: Set<string>): string[] {
    return [...set].sort();
}

suite('resolveConstructs Test Suite', () => {

    test('Should use the default when the setting is missing', () => {
        assert.deepStrictEqual(sorted(resolveConstructs(undefined)), ALL);
    });

    test('Should honour an explicitly empty list as "mark nothing"', () => {
        assert.deepStrictEqual(sorted(resolveConstructs([])), []);
    });

    test('Should narrow to the listed constructs', () => {
        assert.deepStrictEqual(sorted(resolveConstructs(['if'])), ['if']);
        assert.deepStrictEqual(sorted(resolveConstructs(['if', 'else'])), ['else', 'if']);
    });

    test('Should drop an unrecognised entry alongside a recognised one', () => {
        assert.deepStrictEqual(sorted(resolveConstructs(['if', 'swich'])), ['if']);
    });

    // The defect: a wholly misspelled list used to filter to the empty set,
    // which hid every marker with no error surface to explain why.
    test('Should fall back to the default when nothing in the list is recognised', () => {
        assert.deepStrictEqual(sorted(resolveConstructs(['swich'])), ALL);
        assert.deepStrictEqual(sorted(resolveConstructs(['IF', 'Else'])), ALL);
    });

    test('Should fall back to the default for a non-array value', () => {
        assert.deepStrictEqual(sorted(resolveConstructs('if')), ALL);
        assert.deepStrictEqual(sorted(resolveConstructs(null)), ALL);
        assert.deepStrictEqual(sorted(resolveConstructs(7)), ALL);
    });

    test('Should collapse duplicates', () => {
        assert.deepStrictEqual(sorted(resolveConstructs(['if', 'if', 'else'])), ['else', 'if']);
    });

    test('Should ignore non-string entries', () => {
        assert.deepStrictEqual(sorted(resolveConstructs(['if', 42, null])), ['if']);
    });
});
