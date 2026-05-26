import breakpoints from '../../../config/breakpoints.json';

/**
 * Stable token order, ascending by `min-width`. Consumers should iterate this
 * array (rather than `Object.keys(breakpoints)`) when emitting Embla
 * breakpoint media queries so wider tokens consistently win on conflicts.
 */
export const breakpointTokens = Object.keys(breakpoints);

/**
 * Build the `(min-width: Npx)` media query string Embla expects as a
 * breakpoint key on both core options and plugin options.
 *
 * @param {number} px
 * @return {string} The media query string.
 */
export const minWidthQuery = (px) => `(min-width: ${px}px)`;

export default breakpoints;
