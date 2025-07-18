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
 * Parser for extracting if statements from JavaScript/TypeScript code.
 * Uses a regex-based approach to find if statements and their closing braces.
 */
export class ASTParser {
    /** Pre-compiled regex pattern for if statement detection */
    private static readonly IF_PATTERN = /^(else\s+)?if\s*\(/;
    
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
        
        // Iterate through each line to find if statements
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Match if statements (including else if)
            // Use pre-compiled regex for better performance
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
     * Finds the end of an if block by matching braces.
     * Extracts the full condition and determines the block boundaries.
     * 
     * @param lines - Array of code lines
     * @param startLine - Line number where the if statement was found
     * @returns Parsed if statement or null if unable to parse
     */
    private findIfBlockEnd(lines: string[], startLine: number): IfStatement | null {
        const startLineText = lines[startLine];
        const condition = this.extractFullCondition(lines, startLine);
        const startColumn = startLineText.indexOf('if');
        
        // Find where the if block starts (opening brace)
        let blockStartLine = startLine;
        let foundOpenBrace = false;
        
        // Check if opening brace is on the same line as the if statement
        if (lines[startLine].includes('{')) {
            foundOpenBrace = true;
        } else {
            // Look for opening brace on following lines (up to 5 lines)
            // This handles cases where the brace is on a new line
            for (let i = startLine + 1; i < lines.length && i < startLine + 5; i++) {
                if (lines[i].includes('{')) {
                    blockStartLine = i;
                    foundOpenBrace = true;
                    break;
                }
            }
        }
        
        // If no opening brace found, this might be a single-line if statement
        // or invalid syntax, so we skip it
        if (!foundOpenBrace) {
            return null;
        }
        
        // Count braces to find the matching closing brace
        let braceCount = 0;
        let endLine = -1;
        let endColumn = -1;
        
        // Optimized brace counting using indexOf for better performance
        for (let i = blockStartLine; i < lines.length; i++) {
            const line = lines[i];
            let pos = 0;
            
            while (pos < line.length) {
                const openPos = line.indexOf('{', pos);
                const closePos = line.indexOf('}', pos);
                
                // No more braces in this line
                if (openPos === -1 && closePos === -1) break;
                
                // Process whichever brace comes first
                if (openPos !== -1 && (closePos === -1 || openPos < closePos)) {
                    braceCount++;
                    pos = openPos + 1;
                } else if (closePos !== -1) {
                    braceCount--;
                    
                    // Found the matching closing brace
                    if (braceCount === 0) {
                        endLine = i;
                        endColumn = closePos + 1; // Position after the closing brace
                        return {
                            condition,
                            startLine,
                            endLine,
                            startColumn,
                            endColumn
                        };
                    }
                    pos = closePos + 1;
                }
            }
        }
        
        // If we couldn't find the closing brace, the code might be incomplete
        return null;
    }
    
    /**
     * Extracts the complete condition from an if statement.
     * Handles multi-line conditions by tracking parentheses.
     * 
     * @param lines - Array of code lines
     * @param startLine - Line number where the if statement starts
     * @returns The extracted condition text without parentheses
     */
    private extractFullCondition(lines: string[], startLine: number): string {
        const line = lines[startLine];
        const conditionStart = line.indexOf('(');
        
        // No opening parenthesis found - invalid if statement
        if (conditionStart === -1) {
            return '';
        }
        
        // Use array for better string concatenation performance
        const conditionParts: string[] = [];
        let parenCount = 0;
        let startedCondition = false;
        
        // Extract condition by tracking parentheses
        for (let i = startLine; i < lines.length && i < startLine + 10; i++) { // Limit search to 10 lines
            const currentLine = lines[i];
            const startChar = i === startLine ? conditionStart : 0;
            const endChar = currentLine.length;
            
            // Extract relevant portion of the line
            let lineSegment = currentLine.substring(startChar, endChar);
            
            // Process the line segment
            for (let j = 0; j < lineSegment.length; j++) {
                const char = lineSegment[j];
                
                if (char === '(') {
                    parenCount++;
                    startedCondition = true;
                }
                
                if (startedCondition) {
                    conditionParts.push(char);
                }
                
                if (char === ')') {
                    parenCount--;
                    
                    // Found the closing parenthesis of the condition
                    if (parenCount === 0) {
                        // Join parts and clean up
                        const fullCondition = conditionParts.join('');
                        // Remove the opening and closing parentheses,
                        // normalize whitespace, and trim
                        return fullCondition.slice(1, -1).replace(/\s+/g, ' ').trim();
                    }
                }
            }
            
            // Add space between lines for multi-line conditions
            if (startedCondition && i !== startLine) {
                conditionParts.push(' ');
            }
        }
        
        // If we reach here, the condition was not properly closed
        // Return what we found, normalized
        const condition = conditionParts.join('');
        return condition.slice(1).replace(/\s+/g, ' ').trim();
    }
}