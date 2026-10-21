/**
 * Configuration constants and defaults for the VS Code If-End Marker extension
 */

/** The configuration namespace used in VS Code settings */
export const CONFIG_NAMESPACE = 'vscodeIfEndMarker';

/** Configuration keys */
export const CONFIG_KEYS = {
    ENABLED: 'enabled',
    MAX_CONDITION_LENGTH: 'maxConditionLength',
    MAX_FILE_SIZE: 'maxFileSize',
    DEBOUNCE_DELAY: 'debounceDelay',
    MIN_LINE_COUNT: 'minLineCount',
    CONSTRUCTS: 'constructs'
} as const;

/**
 * Every construct that can carry an end-of-block marker. Deliberately short:
 * these are the ones whose opening line scrolls out of view. A marker on every
 * closing brace turns the gutter into noise in normally nested code.
 */
export const KNOWN_CONSTRUCTS = ['if', 'else', 'for', 'while', 'switch'] as const;

/** A construct whose closing brace can carry an end-of-block marker. */
export type ConstructKind = typeof KNOWN_CONSTRUCTS[number];

/** Default configuration values */
export const CONFIG_DEFAULTS = {
    /** Whether the extension is enabled */
    ENABLED: true,

    /** Which constructs get an end-of-block marker */
    CONSTRUCTS: KNOWN_CONSTRUCTS,

    /** Maximum number of characters to display from the condition */
    MAX_CONDITION_LENGTH: 50,
    
    /** Maximum file size (in characters) to process */
    MAX_FILE_SIZE: 500000,
    
    /** Delay in milliseconds before updating markers after text changes */
    DEBOUNCE_DELAY: 300,
    
    /** Minimum number of lines an if statement must span to show markers */
    MIN_LINE_COUNT: 4,
    
    /** Delay for viewport change updates (scrolling) */
    VIEWPORT_UPDATE_DELAY: 150,
    
    /** Maximum number of cached parse results */
    MAX_CACHE_SIZE: 50,
    
    /** Maximum lines to search for opening brace after if statement */
    MAX_BRACE_SEARCH_LINES: 5,
    
    /** Maximum lines to search for complete condition */
    MAX_CONDITION_SEARCH_LINES: 10
} as const;

/**
 * Resolves the `constructs` setting into the set of constructs to mark.
 *
 * Unrecognised entries are dropped, but a list that names **nothing**
 * recognisable is a misspelling, not a request for silence, so it falls back to
 * the default. Silently hiding every marker is the one thing a typo must not
 * do: there is no error surface in a decoration provider, so the user would
 * see the extension as broken rather than as misconfigured.
 *
 * An explicitly empty list is honoured as "mark nothing", since that is the
 * only way to say it and it cannot be a typo.
 *
 * @param configured - The raw setting value, trusted to be nothing
 * @returns The set of constructs that should get markers
 */
export function resolveConstructs(configured: unknown): Set<ConstructKind> {
    if (!Array.isArray(configured)) {
        return new Set(CONFIG_DEFAULTS.CONSTRUCTS);
    }
    if (configured.length === 0) {
        return new Set();
    }

    const known = new Set<string>(KNOWN_CONSTRUCTS);
    const recognised = configured.filter((kind): kind is ConstructKind => known.has(kind));

    return recognised.length > 0 ? new Set(recognised) : new Set(CONFIG_DEFAULTS.CONSTRUCTS);
}

/** Command identifiers */
export const COMMANDS = {
    TOGGLE: 'vscodeIfEndMarker.toggle',
    ENABLE: 'vscodeIfEndMarker.enable',
    DISABLE: 'vscodeIfEndMarker.disable'
} as const;

/** Supported language identifiers */
export const SUPPORTED_LANGUAGES = [
    'javascript',      // .js, .mjs, .cjs
    'typescript',      // .ts
    'javascriptreact', // .jsx
    'typescriptreact', // .tsx
    'c',               // .c, .h
    'cpp'              // .cpp, .cc, .cxx, .hpp
] as const;

/** UI text constants */
export const UI_TEXT = {
    MARKERS_ENABLED: 'If-End Markers enabled',
    MARKERS_DISABLED: 'If-End Markers disabled',
    MARKERS_TOGGLED: (enabled: boolean) => `If-End Markers ${enabled ? 'enabled' : 'disabled'}`
} as const;