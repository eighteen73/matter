/**
 * An address typed without its scheme (`instagram.com/name`) with `https://`
 * added, as the server saves it. Relative links and other schemes
 * (`mailto:`) are left alone, as is a word or path with no dot in its first
 * segment (`contact-us`).
 *
 * @param {string} url Typed address.
 * @return {string} Address.
 */
export const withScheme = (url) => {
	const value = String(url ?? '').trim();

	if (!value || /^([a-z][a-z0-9+.-]*:|[/?#])/i.test(value)) {
		return value.startsWith('//') ? `https:${value}` : value;
	}

	// A bare word or path (`contact-us`) is a relative page: a host has a dot.
	if (/^[^./?#:]+([/?#]|$)/.test(value)) {
		return value;
	}

	return `https://${value}`;
};
