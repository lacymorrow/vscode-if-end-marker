import { BlockMarker } from './parser';

/**
 * Builds the text shown at a block's closing brace, without the leading
 * comment slashes.
 *
 * `if` shows its bare condition, which is what the extension has always
 * displayed, so an existing install sees no change. The other constructs lead
 * with their keyword, because a loop header or a switch subject on its own
 * reads as nothing. `else` has no header at all, so the keyword is the marker.
 *
 * @param block - The block to label
 * @param maxLength - Maximum length of the header before it is truncated
 * @returns Marker text
 */
export function formatBlockMarker(block: BlockMarker, maxLength: number): string {
    if (block.kind === 'if') {
        return truncateHeader(block.condition, maxLength);
    }
    if (block.kind === 'else') {
        return 'else';
    }
    return `${block.kind} (${truncateHeader(block.condition, maxLength)})`;
}

/**
 * Truncates a header, adding an ellipsis to indicate continuation.
 *
 * @param header - The header text to format
 * @param maxLength - Maximum length before truncation
 * @returns Formatted header text
 */
export function truncateHeader(header: string, maxLength: number): string {
    if (header.length <= maxLength) {
        return header;
    }
    return header.substring(0, maxLength - 3) + '...';
}
