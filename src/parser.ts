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
    /**
     * The construct that continues this block's closing brace, if any: `else`
     * for `} else {`, `if` for `} else if (...) {`. Only an `if` or `else`
     * block can be continued. Marker selection uses this to leave an if/else
     * chain with a single marker, on the chain's final brace.
     */
    continuedBy?: ConstructKind;
}

/** A position in the source, used for brace matching. */
interface BracePosition {
    line: number;
    col: number;
}

/** Every opening brace in a file, keyed by position, mapped to its close. */
type BraceMap = Map<string, BracePosition>;

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
     * A statement label (`outer: for (...)`) sitting between the start of the
     * line and the construct keyword.
     */
    private static readonly LABEL = /^[A-Za-z_$][A-Za-z0-9_$]*\s*:\s*/;

    /**
     * An `else` continuing a closing brace, with the `if` of an `else if`
     * captured so the continuation can be reported as the kind the parser
     * will actually give it.
     */
    private static readonly CONTINUATION = /^\s*else(?![A-Za-z0-9_$])\s*(if(?![A-Za-z0-9_$]))?/;

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
        const blockEnds = ASTParser.matchBraces(lines);

        for (let i = 0; i < lines.length; i++) {
            const spec = ASTParser.matchConstruct(lines[i].trim());
            if (!spec) { continue; }

            const result = this.findBlockEnd(lines, i, spec, blockEnds);
            if (result) { markers.push(result); }
        }

        return markers;
    }

    /**
     * Returns the construct a line opens, or undefined if it opens none.
     *
     * A label is stripped and the line retried rather than relaxing the
     * patterns, which are anchored to the start of the line on purpose: only
     * `if` and `else` may lead with a `}`, and that is what keeps the trailing
     * `while` of `do { ... } while (cond);` from reading as a loop header.
     *
     * @param trimmedLine - The line with surrounding whitespace removed
     * @returns The matching construct spec, or undefined
     */
    private static matchConstruct(trimmedLine: string): ConstructSpec | undefined {
        for (const spec of ASTParser.CONSTRUCTS) {
            if (spec.linePattern.test(trimmedLine)) { return spec; }
        }

        const label = ASTParser.LABEL.exec(trimmedLine);
        if (!label) { return undefined; }

        const labelled = trimmedLine.slice(label[0].length);
        for (const spec of ASTParser.CONSTRUCTS) {
            if (spec.linePattern.test(labelled)) { return spec; }
        }

        return undefined;
    }

    /**
     * Matches every brace in the file in one pass, skipping braces inside
     * strings, template literals and comments.
     *
     * One shared pass is what keeps parsing linear. Walking forward from each
     * construct's opening brace instead was quadratic on a file whose braces
     * never balance, which is most of a file while it is being typed, and
     * parsing runs on a 300ms debounce.
     *
     * Braces inside a multi-line template literal or block comment are never
     * recorded, so a construct written inside one finds no closing brace and
     * gets no marker.
     *
     * @param lines - The source split into lines
     * @returns A map from each opening brace to its closing brace. An opening
     *          brace that never closes is absent.
     */
    private static matchBraces(lines: string[]): BraceMap {
        const blockEnds: BraceMap = new Map();
        const open: BracePosition[] = [];
        const ctx = { line: 0, pos: 0 };

        let i = 0;
        let nextPos = 0;

        while (i < lines.length) {
            const line = lines[i];
            let pos = nextPos;
            let jumped = false;
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
                            jumped = true;
                            break;
                        }
                        pos = end + 1;
                        continue;
                    }
                }

                if (ch === '{') {
                    open.push({ line: i, col: pos });
                } else if (ch === '}') {
                    const opened = open.pop();
                    if (opened) {
                        blockEnds.set(ASTParser.braceKey(opened.line, opened.col), { line: i, col: pos });
                    }
                }
                pos++;
            }

            if (jumped) { continue; }
            i++;
        }

        return blockEnds;
    }

    /** Key for one brace position in the brace-matching map. */
    private static braceKey(line: number, col: number): string {
        return `${line}:${col}`;
    }

    /**
     * Reads the construct continuing a closing brace, so an if/else chain can
     * be marked once at its end instead of once per link.
     *
     * The `else` may share the brace's line (`} else {`) or start the next one,
     * which is the same brace style the opening-brace search already allows.
     *
     * @param lines - The source split into lines
     * @param braceLine - Zero-based line of the closing brace
     * @param afterBrace - Zero-based column just past the closing brace
     * @returns The continuing construct's kind, or undefined
     */
    private static findContinuation(lines: string[], braceLine: number, afterBrace: number): ConstructKind | undefined {
        const sameLine = lines[braceLine].slice(afterBrace);
        const candidate = sameLine.trim() === '' && braceLine + 1 < lines.length
            ? lines[braceLine + 1]
            : sameLine;

        const match = ASTParser.CONTINUATION.exec(candidate);
        if (!match) { return undefined; }
        return match[1] ? 'if' : 'else';
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
     * Finds the end of a block by looking its opening brace up in the
     * pre-matched brace table.
     * Only looks for the opening brace on the header-end line or the
     * first non-blank line after it, so braceless constructs are
     * correctly skipped.
     */
    private findBlockEnd(
        lines: string[],
        startLine: number,
        spec: ConstructSpec,
        blockEnds: BraceMap
    ): BlockMarker | null {
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

        const blockEnd = blockEnds.get(ASTParser.braceKey(blockStartLine, braceSearchStart));
        if (!blockEnd) { return null; }

        const endColumn = blockEnd.col + 1;
        const continuedBy = ASTParser.findContinuation(lines, blockEnd.line, endColumn);

        return {
            kind: spec.kind,
            condition,
            startLine,
            endLine: blockEnd.line,
            startColumn,
            endColumn,
            continuedBy
        };
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
