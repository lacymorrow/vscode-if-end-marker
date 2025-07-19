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
    MIN_LINE_COUNT: 'minLineCount'
} as const;

/** Default configuration values */
export const CONFIG_DEFAULTS = {
    /** Whether the extension is enabled */
    ENABLED: true,
    
    /** Maximum number of characters to display from the condition */
    MAX_CONDITION_LENGTH: 50,
    
    /** Maximum file size (in characters) to process */
    MAX_FILE_SIZE: 500000,
    
    /** Delay in milliseconds before updating markers after text changes */
    DEBOUNCE_DELAY: 300,
    
    /** Minimum number of lines an if statement must span to show markers */
    MIN_LINE_COUNT: 5,
    
    /** Delay for viewport change updates (scrolling) */
    VIEWPORT_UPDATE_DELAY: 150,
    
    /** Maximum number of cached parse results */
    MAX_CACHE_SIZE: 50,
    
    /** Maximum lines to search for opening brace after if statement */
    MAX_BRACE_SEARCH_LINES: 5,
    
    /** Maximum lines to search for complete condition */
    MAX_CONDITION_SEARCH_LINES: 10
} as const;

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
    'typescriptreact'  // .tsx
] as const;

/** UI text constants */
export const UI_TEXT = {
    MARKERS_ENABLED: 'If-End Markers enabled',
    MARKERS_DISABLED: 'If-End Markers disabled',
    MARKERS_TOGGLED: (enabled: boolean) => `If-End Markers ${enabled ? 'enabled' : 'disabled'}`
} as const;