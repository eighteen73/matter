/**
 * Normalizes search input for icon filtering.
 *
 * @param {string} input Raw search input.
 * @return {string} Normalized search input.
 */
export function normalizeSearchInput(input = '') {
	return input.trim().toLowerCase();
}
