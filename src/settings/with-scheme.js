/**
 * An address typed without its scheme (`instagram.com/name`) with `https://`
 * added, as the server saves it. Relative links and other schemes
 * (`mailto:`) are left alone.
 *
 * @param {string} url Typed address.
 * @return {string} Address.
 */
export const withScheme = (url) => {
	const value = String(url ?? '').trim();

	if (!value || /^([a-z][a-z0-9+.-]*:|[/?#])/i.test(value)) {
		return value.startsWith('//') ? `https:${value}` : value;
	}

	return `https://${value}`;
};
