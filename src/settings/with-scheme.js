/**
 * An address typed without its scheme (`instagram.com/name`) with `https://`
 * added, as the server saves it. Relative links and other schemes
 * (`mailto:`) are left alone, as is a word or path with no dot in its first
 * segment (`contact-us`) or that starts `./` or `../`.
 *
 * @param {string} url Typed address.
 * @return {string} Address.
 */
export const withScheme = (url) => {
	const value = String(url ?? '').trim();

	if (!value || /^([a-z][a-z0-9+.-]*:|[/?#])/i.test(value)) {
		// What a browser reads as `//host` (`/<tab>/evil.com`, `/\evil.com`,
		// after the characters it ignores) is another site's address, as the
		// server treats it.
		const cleaned = value.replace(
			/[^a-z0-9\-~+_.?#=!&;,/:%@$|*'()[\]\u0080-\uffff]/gi,
			''
		);

		return cleaned.startsWith('//') ? `https:${cleaned}` : value;
	}

	// A bare word or path (`contact-us`, `./x`, `../x`) is a relative page: a
	// host has a dot.
	if (/^([^./?#:]+|\.{1,2})([/?#]|$)/.test(value)) {
		return value;
	}

	return `https://${value}`;
};
