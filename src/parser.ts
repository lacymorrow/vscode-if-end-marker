import { CONFIG_DEFAULTS } from './config';

/**
 * Represents a parsed if statement with its location and condition information.
 */
export interface IfStatement {
    /** The extracted condition text from the if statement */
    condition: string;
    /** Zero-based line number where the if statement starts */
    startLine: number;
    /** Zero-based line number where the if block ends (closing brace) */
    endLine: number;
    /** Zero-based column position of the 'if' keyword */
    startColumn: number;
    /** Zero-based column position after the closing brace */
    endColumn: number;
}

/**
 * Parser for extracting if statements from JavaScript/TypeScript/C/C++ code.
 * Uses a regex-based approach to find if statements and their closing braces.
 */
export class ASTParser {
    /** Pre-compiled regex pattern for if statement detection */
    private static readonly IF_PATTERN = /^(\}\s*)?(else\s+)?if\s*\(/;
    
    /**
     * Parses the given code and extracts all if statements.
     * 
     * @param code - The source code to parse
     * @param languageId - The language identifier (e.g., 'javascript', 'typescript')
     * @returns Array of parsed if statements with their locations
     */
    parse(code: string, languageId: string): IfStatement[] {
        const ifStatements: IfStatement[] = [];
        const lines = code.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            const ifMatch = ASTParser.IF_PATTERN.exec(trimmedLine);
            if (ifMatch) {
                const result = this.findIfBlockEnd(lines, i);
                if (result) {
                    ifStatements.push(result);
                }
            }
        }
        
        return ifStatements;
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
     * Finds the end of an if block by matching braces.
     * Skips braces inside strings, template literals, and comments.
     */
    private findIfBlockEnd(lines: string[], startLine: number): IfStatement | null {
        const startLineText = lines[startLine];
        const condition = this.extractFullCondition(lines, startLine);
        const startColumn = startLineText.indexOf('if');
        
        let blockStartLine = startLine;
        let foundOpenBrace = false;
        let braceSearchStart = 0;

        const ifPos = startColumn >= 0 ? startColumn : 0;
        const braceOnStartLine = lines[startLine].indexOf('{', ifPos);
        if (braceOnStartLine !== -1) {
            foundOpenBrace = true;
            braceSearchStart = braceOnStartLine;
        } else {
            for (let i = startLine + 1; i < lines.length && i < startLine + CONFIG_DEFAULTS.MAX_BRACE_SEARCH_LINES; i++) {
                if (lines[i].includes('{')) {
                    blockStartLine = i;
                    foundOpenBrace = true;
                    break;
                }
            }
        }

        if (!foundOpenBrace) {
            return null;
        }

        let braceCount = 0;
        const ctx = { line: 0, pos: 0 };

        for (let i = blockStartLine; i < lines.length; i++) {
            const line = lines[i];
            let pos = (i === blockStartLine && braceSearchStart > 0) ? braceSearchStart : 0;
            
            while (pos < line.length) {
                const ch = line[pos];

                // Skip string literals, template literals, and comments
                if (ch === '"' || ch === '\'' || ch === '`' || (ch === '/' && pos + 1 < line.length && (line[pos + 1] === '/' || line[pos + 1] === '*'))) {
                    ctx.line = i;
                    ctx.pos = pos;
                    const end = ASTParser.skipLiteral(lines, i, pos, ctx);
                    if (end !== -1) {
                        // If the literal spans multiple lines, jump ahead
                        if (ctx.line !== i) {
                            i = ctx.line;
                            pos = ctx.pos + 1;
                            // Need to update line reference for the outer while
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
        }
        
        return null;
    }
    
    /**
     * Extracts the complete condition from an if statement.
     * Handles multi-line conditions and skips parens inside strings,
     * char literals, template literals, and comments.
     */
    private extractFullCondition(lines: string[], startLine: number): string {
        const line = lines[startLine];
        const conditionStart = line.indexOf('(');
        
        if (conditionStart === -1) {
            return '';
        }
        
        const conditionParts: string[] = [];
        let parenCount = 0;
        let startedCondition = false;
        
        for (let i = startLine; i < lines.length && i < startLine + CONFIG_DEFAULTS.MAX_CONDITION_SEARCH_LINES; i++) {
            const currentLine = lines[i];
            const startChar = i === startLine ? conditionStart : 0;
            const lineSegment = currentLine.substring(startChar);
            
            for (let j = 0; j < lineSegment.length; j++) {
                const char = lineSegment[j];

                // Skip string literals (double quotes)
                if (char === '"') {
                    if (startedCondition) { conditionParts.push(char); }
                    j++;
                    while (j < lineSegment.length) {
                        const sc = lineSegment[j];
                        if (startedCondition) { conditionParts.push(sc); }
                        if (sc === '\\') { j++; if (j < lineSegment.length && startedCondition) { conditionParts.push(lineSegment[j]); } }
                        else if (sc === '"') { break; }
                        j++;
                    }
                    continue;
                }

                // Skip character literals (single quotes)
                if (char === '\'') {
                    if (startedCondition) { conditionParts.push(char); }
                    j++;
                    while (j < lineSegment.length) {
                        const sc = lineSegment[j];
                        if (startedCondition) { conditionParts.push(sc); }
                        if (sc === '\\') { j++; if (j < lineSegment.length && startedCondition) { conditionParts.push(lineSegment[j]); } }
                        else if (sc === '\'') { break; }
                        j++;
                    }
                    continue;
                }

                // Skip template literals (backticks)
                if (char === '`') {
                    if (startedCondition) { conditionParts.push(char); }
                    j++;
                    while (j < lineSegment.length) {
                        const sc = lineSegment[j];
                        if (startedCondition) { conditionParts.push(sc); }
                        if (sc === '\\') { j++; if (j < lineSegment.length && startedCondition) { conditionParts.push(lineSegment[j]); } }
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
                    startedCondition = true;
                }
                
                if (startedCondition) {
                    conditionParts.push(char);
                }
                
                if (char === ')') {
                    parenCount--;
                    
                    if (parenCount === 0) {
                        const fullCondition = conditionParts.join('');
                        return fullCondition.slice(1, -1).replace(/\s+/g, ' ').trim();
                    }
                }
            }
            
            if (startedCondition && i !== startLine) {
                conditionParts.push(' ');
            }
        }
        
        const condition = conditionParts.join('');
        return condition.slice(1).replace(/\s+/g, ' ').trim();
    }
}