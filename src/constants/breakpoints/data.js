import breakpoints from '../../../config/breakpoints.json';

/**
 * Stable token order, ascending by `min-width`. Consumers should iterate this
 * array (rather than `Object.keys(breakpoints)`) when emitting Embla
 * breakpoint media queries so wider tokens consistently win on conflicts.
 */
export const breakpointTokens = Object.keys(breakpoints);

/**
 * Build the `(min-width: value)` media query string Embla expects as a
 * breakpoint key on both core options and plugin options.
 *
 * @param {string} value
 * @return {string} The media query string.
 */
export const minWidthQuery = (value) => `(min-width: ${value})`;

export default breakpoints;
