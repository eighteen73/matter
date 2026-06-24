/**
 * Store slug when available, otherwise the literal color value.
 *
 * @param {string|undefined} slug  Palette slug.
 * @param {string|undefined} value Literal color value.
 * @return {string} Persisted attribute value.
 */
export function storeColorValue(slug, value) {
	return slug || value || '';
}
