/**
 * The page's `#hash` as an ID: decoded, or as it is when it isn't valid
 * percent-encoding (`#%E0%A4%A` throws a `URIError` in `decodeURIComponent`).
 *
 * @param {string} hash Hash with or without the `#`; the page's by default.
 * @return {string} The ID the hash names, empty for none.
 */
export const hashId = (hash = window.location.hash) => {
	const id = hash.replace(/^#/, '');

	try {
		return decodeURIComponent(id);
	} catch {
		return id;
	}
};
