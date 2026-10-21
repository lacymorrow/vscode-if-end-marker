import { CONFIG_DEFAULTS, ConstructKind } from './config';

export type { ConstructKind };

/**
 * Represents a parsed block with its location and header information.
 */
export interface BlockMarker {
    /** Which construct opened the block */
    kind: ConstructKind;
    /**
     * The extracted header text: the condition for `if`/`while`, the loop
     * header for `for`, the subject for `switch`. Empty for `else`.
     */
    condition: string;
    /** Zero-based line number where the construct starts */
    startLine: number;
    /** Zero-based line number where the block ends (closing brace) */
    endLine: number;
    /** Zero-based column position of the construct keyword */
    startColumn: number;
    /** Zero-based column position after the closing brace */
    endColumn: number;
}

/** How to recognise and read one construct. */
interface ConstructSpec {
    kind: ConstructKind;
    /** Matches a trimmed line that opens this construct. */
    linePattern: RegExp;
    /**
     * Locates the keyword in the raw line. The boundary groups stop a keyword
     * buried in an identifier (`verify`, `forEach`) from being picked up.
     */
    keywordPattern: RegExp;
    /** Length of the keyword, used to find the block when there is no header. */
    keywordLength: number;
    /** `else` is the one construct with no parenthesised header. */
    hasHeader: boolean;
}

/**
 * Parser for extracting markable blocks from JavaScript/TypeScript/C/C++ code.
 * Uses a regex-based approach to find construct keywords and their closing braces.
 */
export class ASTParser {
    /**
     * Constructs the parser recognises, checked in order. `if` comes before
     * `else` so that `} else if (...)` is read as an `if`.
     *
     * Only `if` and `else` allow a leading `}` on the same line. Requiring the
     * others to start the line is what keeps the trailing `while` of a
     * `do { ... } while (cond);` from being mistaken for a loop header.
     */
    private static readonly CONSTRUCTS: readonly ConstructSpec[] = [
        {
            kind: 'if',
            linePattern: /^(\}\s*)?(else\s+)?if\s*\(/,
            keywordPattern: /(^|[^A-Za-z0-9_$])if(?![A-Za-z0-9_$])/,
            keywordLength: 2,
            hasHeader: true
        },
        {
            kind: 'else',
            linePattern: /^(\}\s*)?else\b(?!\s*if\b)/,
            keywordPattern: /(^|[^A-Za-z0-9_$])else(?![A-Za-z0-9_$])/,
            keywordLength: 4,
            hasHeader: false
        },
        {
            kind: 'for',
            linePattern: /^for\s*(await\s+)?\(/,
            keywordPattern: /(^|[^A-Za-z0-9_$])for(?![A-Za-z0-9_$])/,
            keywordLength: 3,
            hasHeader: true
        },
        {
            kind: 'while',
            linePattern: /^while\s*\(/,
            keywordPattern: /(^|[^A-Za-z0-9_$])while(?![A-Za-z0-9_$])/,
            keywordLength: 5,
            hasHeader: true
        },
        {
            kind: 'switch',
            linePattern: /^switch\s*\(/,
            keywordPattern: /(^|[^A-Za-z0-9_$])switch(?![A-Za-z0-9_$])/,
            keywordLength: 6,
            hasHeader: true
        }
    ];

    /**
     * Parses the given code and extracts every markable block.
     *
     * Every construct is parsed regardless of user settings; filtering by the
     * configured construct list happens at decoration time so that changing the
     * setting does not invalidate cached parse results.
     *
     * @param code - The source code to parse
     * @param languageId - The language identifier (e.g. 'javascript', 'typescript')
     * @returns Array of parsed blocks with their locations, in line order
     */
    parse(code: string, languageId: string): BlockMarker[] {
        const markers: BlockMarker[] = [];
        const lines = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

        for (let i = 0; i < lines.length; i++) {
            const trimmedLine = lines[i].trim();

            for (const spec of ASTParser.CONSTRUCTS) {
                if (!spec.linePattern.test(trimmedLine)) { continue; }

                const result = this.findBlockEnd(lines, i, spec);
                if (result) { markers.push(result); }
                break;
            }
        }

        return markers;
    }

    /**
     * Returns the column of the construct keyword in `line`, or -1 if the
     * keyword only appears inside a longer identifier.
     */
    private static findKeyword(line: string, pattern: RegExp): number {
        const match = pattern.exec(line);
        if (!match) { return -1; }
        return match.index + match[1].length;
    }

    /**
     * Skips past a string literal, char literal, template literal, or comment
     * starting at position `pos` in `line`. Returns the index of the last
     * character consumed (the caller should continue from pos+1).
     * If the character at `pos` is not a quote or comment start, returns -1.
     *
     * For multi-line constructs (template literals, block comments),
     * `ctx.line` and `ctx.pos` are updated to the line/column where
     * the construct ends.
     */
    private static skipLiteral(
        lines: string[],
        lineIndex: number,
        pos: number,
        ctx?: { line: number; pos: number }
    ): number {
        const line = lines[lineIndex];
        const ch = line[pos];

        // Double-quoted string
        if (ch === '"') {
            let j = pos + 1;
            while (j < line.length) {
                if (line[j] === '\\') { j += 2; continue; }
                if (line[j] === '"') { return j; }
                j++;
            }
            return line.length - 1; // unterminated, consume rest of line
        }

        // Single-quoted string / char literal
        if (ch === '\'') {
            let j = pos + 1;
            while (j < line.length) {
                if (line[j] === '\\') { j += 2; continue; }
                if (line[j] === '\'') { return j; }
                j++;
            }
            return line.length - 1;
        }

        // Template literal (backtick) — can span multiple lines
        if (ch === '`') {
            let li = lineIndex;
            let j = pos + 1;
            while (li < lines.length) {
                const curLine = lines[li];
                while (j < curLine.length) {
                    if (curLine[j] === '\\') { j += 2; continue; }
                    if (curLine[j] === '`') {
                        if (ctx) { ctx.line = li; ctx.pos = j; }
                        return j;
                    }
                    j++;
                }
                li++;
                j = 0;
            }
            if (ctx) { ctx.line = lines.length - 1; ctx.pos = lines[lines.length - 1].length - 1; }
            return line.length - 1;
        }

        // Single-line comment
        if (ch === '/' && pos + 1 < line.length && line[pos + 1] === '/') {
            return line.length - 1; // consume rest of line
        }

        // Block comment — can span multiple lines
        if (ch === '/' && pos + 1 < line.length && line[pos + 1] === '*') {
            let li = lineIndex;
            let j = pos + 2;
            while (li < lines.length) {
                const curLine = lines[li];
                while (j < curLine.length) {
                    if (curLine[j] === '*' && j + 1 < curLine.length && curLine[j + 1] === '/') {
                        if (ctx) { ctx.line = li; ctx.pos = j + 1; }
                        return j + 1;
                    }
                    j++;
                }
                li++;
                j = 0;
            }
            if (ctx) { ctx.line = lines.length - 1; ctx.pos = lines[lines.length - 1].length - 1; }
            return line.length - 1;
        }

        return -1; // not a literal/comment
    }

    /**
     * Finds the closing paren of the construct's header, starting from the
     * keyword at `keywordCol` on `startLine`.
     */
    private findHeaderEnd(lines: string[], startLine: number, keywordCol: number): { line: number; col: number } | null {
        const headerStart = lines[startLine].indexOf('(', keywordCol);
        if (headerStart === -1) { return null; }

        let parenCount = 0;

        for (let i = startLine; i < lines.length && i < startLine + CONFIG_DEFAULTS.MAX_CONDITION_SEARCH_LINES; i++) {
            const currentLine = lines[i];
            const startChar = i === startLine ? headerStart : 0;

            for (let j = startChar; j < currentLine.length; j++) {
                const ch = currentLine[j];

                if (ch === '"' || ch === '\'' || ch === '`') {
                    j++;
                    while (j < currentLine.length) {
                        if (currentLine[j] === '\\') { j++; }
                        else if (currentLine[j] === ch) { break; }
                        j++;
                    }
                    continue;
                }
                if (ch === '/' && j + 1 < currentLine.length && currentLine[j + 1] === '/') {
                    break;
                }
                if (ch === '/' && j + 1 < currentLine.length && currentLine[j + 1] === '*') {
                    j += 2;
                    while (j < currentLine.length) {
                        if (currentLine[j] === '*' && j + 1 < currentLine.length && currentLine[j + 1] === '/') {
                            j++;
                            break;
                        }
                        j++;
                    }
                    continue;
                }

                if (ch === '(') { parenCount++; }
                else if (ch === ')') {
                    parenCount--;
                    if (parenCount === 0) {
                        return { line: i, col: j };
                    }
                }
            }
        }

        return null;
    }

    /**
     * Finds the end of a block by matching braces.
     * Skips braces inside strings, template literals, and comments.
     * Only looks for the opening brace on the header-end line or the
     * first non-blank line after it, so braceless constructs are
     * correctly skipped.
     */
    private findBlockEnd(lines: string[], startLine: number, spec: ConstructSpec): BlockMarker | null {
        const startLineText = lines[startLine];
        const startColumn = ASTParser.findKeyword(startLineText, spec.keywordPattern);
        if (startColumn === -1) { return null; }

        // `else` has no header, so the block starts right after the keyword.
        const headerEnd = spec.hasHeader
            ? this.findHeaderEnd(lines, startLine, startColumn)
            : { line: startLine, col: startColumn + spec.keywordLength - 1 };
        if (!headerEnd) { return null; }

        const condition = spec.hasHeader ? this.extractHeader(lines, startLine, startColumn) : '';

        let blockStartLine = -1;
        let braceSearchStart = 0;

        const headerEndLineText = lines[headerEnd.line];
        for (let j = headerEnd.col + 1; j < headerEndLineText.length; j++) {
            const ch = headerEndLineText[j];
            if (ch === '{') {
                blockStartLine = headerEnd.line;
                braceSearchStart = j;
                break;
            }
            if (ch === '/' && j + 1 < headerEndLineText.length) {
                if (headerEndLineText[j + 1] === '/') {
                    break;
                }
                if (headerEndLineText[j + 1] === '*') {
                    let k = j + 2;
                    let closed = false;
                    while (k < headerEndLineText.length - 1) {
                        if (headerEndLineText[k] === '*' && headerEndLineText[k + 1] === '/') {
                            j = k + 1;
                            closed = true;
                            break;
                        }
                        k++;
                    }
                    if (!closed) { break; }
                    continue;
                }
            }
            if (ch !== ' ' && ch !== '\t') {
                return null;
            }
        }

        if (blockStartLine === -1) {
            for (let i = headerEnd.line + 1; i < lines.length && i <= headerEnd.line + 2; i++) {
                const trimmed = lines[i].trim();
                if (trimmed === '') { continue; }
                if (trimmed[0] === '{') {
                    blockStartLine = i;
                    braceSearchStart = lines[i].indexOf('{');
                    break;
                }
                return null;
            }
        }

        if (blockStartLine === -1) { return null; }

        let braceCount = 0;
        const ctx = { line: 0, pos: 0 };
        let i = blockStartLine;
        let nextPos = braceSearchStart;

        while (i < lines.length) {
            const line = lines[i];
            let pos = nextPos;
            nextPos = 0;

            while (pos < line.length) {
                const ch = line[pos];

                if (ch === '"' || ch === '\'' || ch === '`' || (ch === '/' && pos + 1 < line.length && (line[pos + 1] === '/' || line[pos + 1] === '*'))) {
                    ctx.line = i;
                    ctx.pos = pos;
                    const end = ASTParser.skipLiteral(lines, i, pos, ctx);
                    if (end !== -1) {
                        if (ctx.line !== i) {
                            i = ctx.line;
                            nextPos = ctx.pos + 1;
                            break;
                        }
                        pos = end + 1;
                        continue;
                    }
                }

                if (ch === '{') {
                    braceCount++;
                } else if (ch === '}') {
                    braceCount--;

                    if (braceCount === 0) {
                        return {
                            kind: spec.kind,
                            condition,
                            startLine,
                            endLine: i,
                            startColumn,
                            endColumn: pos + 1
                        };
                    }
                }
                pos++;
            }

            if (nextPos > 0) { continue; }
            i++;
        }

        return null;
    }

    /**
     * Extracts the complete parenthesised header of a construct.
     * Handles multi-line headers and skips parens inside strings,
     * char literals, template literals, and comments.
     */
    private extractHeader(lines: string[], startLine: number, keywordCol: number): string {
        const line = lines[startLine];
        const headerStart = line.indexOf('(', keywordCol);

        if (headerStart === -1) {
            return '';
        }

        const headerParts: string[] = [];
        let parenCount = 0;
        let startedHeader = false;

        for (let i = startLine; i < lines.length && i < startLine + CONFIG_DEFAULTS.MAX_CONDITION_SEARCH_LINES; i++) {
            const currentLine = lines[i];
            const startChar = i === startLine ? headerStart : 0;
            const lineSegment = currentLine.substring(startChar);

            for (let j = 0; j < lineSegment.length; j++) {
                const char = lineSegment[j];

                // Skip string literals (double quotes)
                if (char === '"') {
                    if (startedHeader) { headerParts.push(char); }
                    j++;
                    while (j < lineSegment.length) {
                        const sc = lineSegment[j];
                        if (startedHeader) { headerParts.push(sc); }
                        if (sc === '\\') { j++; if (j < lineSegment.length && startedHeader) { headerParts.push(lineSegment[j]); } }
                        else if (sc === '"') { break; }
                        j++;
                    }
                    continue;
                }

                // Skip character literals (single quotes)
                if (char === '\'') {
                    if (startedHeader) { headerParts.push(char); }
                    j++;
                    while (j < lineSegment.length) {
                        const sc = lineSegment[j];
                        if (startedHeader) { headerParts.push(sc); }
                        if (sc === '\\') { j++; if (j < lineSegment.length && startedHeader) { headerParts.push(lineSegment[j]); } }
                        else if (sc === '\'') { break; }
                        j++;
                    }
                    continue;
                }

                // Skip template literals (backticks)
                if (char === '`') {
                    if (startedHeader) { headerParts.push(char); }
                    j++;
                    while (j < lineSegment.length) {
                        const sc = lineSegment[j];
                        if (startedHeader) { headerParts.push(sc); }
                        if (sc === '\\') { j++; if (j < lineSegment.length && startedHeader) { headerParts.push(lineSegment[j]); } }
                        else if (sc === '`') { break; }
                        j++;
                    }
                    continue;
                }

                // Skip single-line comments
                if (char === '/' && j + 1 < lineSegment.length && lineSegment[j + 1] === '/') {
                    break;
                }

                // Skip block comments (within the same line)
                if (char === '/' && j + 1 < lineSegment.length && lineSegment[j + 1] === '*') {
                    j += 2;
                    while (j < lineSegment.length) {
                        if (lineSegment[j] === '*' && j + 1 < lineSegment.length && lineSegment[j + 1] === '/') {
                            j++; // skip past the '/'
                            break;
                        }
                        j++;
                    }
                    continue;
                }

                if (char === '(') {
                    parenCount++;
                    startedHeader = true;
                }

                if (startedHeader) {
                    headerParts.push(char);
                }

                if (char === ')') {
                    parenCount--;

                    if (parenCount === 0) {
                        const fullHeader = headerParts.join('');
                        return fullHeader.slice(1, -1).replace(/\s+/g, ' ').trim();
                    }
                }
            }

            if (startedHeader && i !== startLine) {
                headerParts.push(' ');
            }
        }

        const header = headerParts.join('');
        return header.slice(1).replace(/\s+/g, ' ').trim();
    }
}
