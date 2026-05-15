// Pure breakpoint data — no `@wordpress/i18n` so script-module bundles can import this.
// Keep `px` in sync with `./_index.scss` so SCSS media queries
// and the JS-driven Embla `(min-width: …)` breakpoints match exactly.
const breakpoints = {
	xs: { label: 'XS', px: 480 },
	sm: { label: 'SM', px: 640 },
	md: { label: 'MD', px: 768 },
	lg: { label: 'LG', px: 1024 },
	xl: { label: 'XL', px: 1280 },
};

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
 * @return {string}
 */
export const emblaMinWidthQuery = (px) => `(min-width: ${px}px)`;

export default breakpoints;
