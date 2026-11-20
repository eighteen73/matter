/**
 * A minimal sprintf for translated labels that PHP can't finish: a carousel
 * knows its slides only in the browser. The label's template is translated
 * and escaped in PHP; this fills it in.
 *
 * It reads what translators write: `%d` and `%s` in order, numbered `%1$d`
 * and `%2$s` in any order, and `%%` for a percent sign. Anything else is left
 * as written, so a malformed translation shows its text, never `undefined`.
 * Values go in as text, never as patterns or markup.
 */

/**
 * @param {string} template Label template, e.g. "%1$d of %2$d".
 * @param {...*}   values   Values, by position.
 * @return {string} The label.
 */
export const format = (template, ...values) => {
	let next = 0;

	return String(template).replace(
		/%(?:(\d+)\$)?([ds%])/g,
		(match, position, type) => {
			if (type === '%') {
				return '%';
			}

			const index = position ? Number(position) - 1 : next++;

			return index in values ? String(values[index]) : match;
		}
	);
};
