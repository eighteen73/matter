/**
 * The classes a section or scheme gives a block in the editor, worked out as
 * the server does (Supports\Scheme, Sections), so the canvas matches the front
 * end. Apart from the editor's packages so it can be unit tested.
 */

/**
 * `sanitize_html_class()`: what PHP leaves of a class name.
 *
 * @param {string} name Class name.
 * @return {string} Cleaned name.
 */
export const cleanClass = (name) =>
	String(name ?? '')
		.replace(/%[a-f0-9]{2}/gi, '')
		.replace(/[^A-Za-z0-9_-]/g, '');

/**
 * The classes a block's colour scheme gives it: none for a scheme the theme
 * no longer defines (so the block inherits its parent's, as on the front end).
 *
 * @param {string} scheme  Saved scheme slug.
 * @param {Array}  schemes The theme's schemes (`{ slug }`).
 * @return {string[]} Classes.
 */
export function schemeClasses(scheme, schemes) {
	if (!scheme || !(schemes ?? []).some(({ slug }) => slug === scheme)) {
		return [];
	}

	return ['has-scheme', `has-scheme-${cleanClass(scheme)}`];
}

/**
 * Whether a class list names one of a block's registered variants (an
 * `is-style-*` class). A variant the theme has removed doesn't count, so the
 * block gets the default variant's class.
 *
 * @param {string}   className  Saved `className`.
 * @param {string[]} styleNames Registered style names.
 * @return {boolean} Whether a registered variant is chosen.
 */
export function hasVariant(className, styleNames) {
	return [
		...String(className ?? '').matchAll(/(?:^|\s)is-style-(\S+)/g),
	].some(([, name]) => (styleNames ?? []).includes(name));
}
