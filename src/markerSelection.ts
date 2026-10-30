import { ConstructKind } from './config';
import { BlockMarker } from './parser';

/**
 * Picks the markers to render from everything the parser found.
 *
 * Two things are decided here rather than in the parser, so that a settings
 * change does not invalidate cached parse results:
 *
 * 1. Constructs the user has turned off are dropped.
 * 2. An `if` whose block is continued by `else` is dropped, so an if/else
 *    chain carries exactly one marker, on the chain's final closing brace.
 *    Without this the marker lands mid-line on `} else {` and reads as
 *    corrupted text, and the reader gets a comment about a condition whose
 *    block they can still see.
 *
 * The continuation is only allowed to take over when its own marker will
 * actually render. With `constructs: ["if"]` there is no `else` marker to
 * carry the chain, so suppressing the `if` would leave the chain unlabelled,
 * which is worse than an awkwardly placed label.
 *
 * @param blocks - Every block the parser found, in line order
 * @param enabledConstructs - The constructs the user wants marked
 * @returns The blocks that should get a marker, in line order
 */
export function selectMarkers(
    blocks: readonly BlockMarker[],
    enabledConstructs: ReadonlySet<ConstructKind>
): BlockMarker[] {
    return blocks.filter(block => {
        if (!enabledConstructs.has(block.kind)) { return false; }
        if (block.continuedBy !== undefined && enabledConstructs.has(block.continuedBy)) {
            return false;
        }
        return true;
    });
}
