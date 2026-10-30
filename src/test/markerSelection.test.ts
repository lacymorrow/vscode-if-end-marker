/**
 * Unit tests for marker selection
 */

import * as assert from 'assert';
import { ASTParser } from '../parser';
import { KNOWN_CONSTRUCTS, ConstructKind } from '../config';
import { selectMarkers } from '../markerSelection';

suite('selectMarkers Test Suite', () => {
    let parser: ASTParser;

    setup(() => {
        parser = new ASTParser();
    });

    const all = new Set<ConstructKind>(KNOWN_CONSTRUCTS);

    const kinds = (code: string, enabled: ReadonlySet<ConstructKind>): string[] =>
        selectMarkers(parser.parse(code, 'javascript'), enabled)
            .map(block => `${block.kind}@${block.endLine}`);

    const IF_ELSE = `
if (a) {
    one();
    two();
} else {
    three();
    four();
}`;

    const IF_ELSEIF_ELSE = `
if (a) {
    one();
} else if (b) {
    two();
} else {
    three();
}`;

    test('An if/else chain keeps one marker, on the final brace', () => {
        assert.deepStrictEqual(kinds(IF_ELSE, all), ['else@7']);
    });

    test('An if/else-if/else chain keeps one marker, on the final brace', () => {
        assert.deepStrictEqual(kinds(IF_ELSEIF_ELSE, all), ['else@7']);
    });

    test('An if with no else keeps its marker', () => {
        const code = `
if (a) {
    one();
    two();
    three();
}`;
        assert.deepStrictEqual(kinds(code, all), ['if@5']);
    });

    test('With else turned off the if keeps its marker, since nothing else carries the chain', () => {
        const onlyIf = new Set<ConstructKind>(['if']);
        assert.deepStrictEqual(kinds(IF_ELSE, onlyIf), ['if@4']);
    });

    test('With else turned off an else-if chain keeps only its last if', () => {
        const onlyIf = new Set<ConstructKind>(['if']);
        assert.deepStrictEqual(kinds(IF_ELSEIF_ELSE, onlyIf), ['if@5']);
    });

    test('With if turned off only the else marker survives', () => {
        const onlyElse = new Set<ConstructKind>(['else']);
        assert.deepStrictEqual(kinds(IF_ELSEIF_ELSE, onlyElse), ['else@7']);
    });

    test('An empty construct list drops everything', () => {
        assert.deepStrictEqual(kinds(IF_ELSE, new Set<ConstructKind>()), []);
    });

    test('Loops are unaffected by the chain rule', () => {
        const code = `
for (const x of xs) {
    one();
    two();
    three();
}`;
        assert.deepStrictEqual(kinds(code, all), ['for@5']);
    });
});
