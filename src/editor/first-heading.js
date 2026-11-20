// Characters of text kept in a label.
const TEXT_LENGTH = 40;

/**
 * Rich text as plain text: markup removed, entities decoded, spaces
 * collapsed.
 *
 * @param {*} content Rich text (HTML).
 * @return {string} Text.
 */
const plain = (content) =>
	(
		new window.DOMParser().parseFromString(
			String(content ?? ''),
			'text/html'
		).body.textContent ?? ''
	)
		.replace(/\s+/g, ' ')
		.trim();

/**
 * Text shortened to a label's length, at a word's end unless that leaves too
 * little.
 *
 * @param {string} text Text.
 * @return {string} Text, with an ellipsis if it was cut.
 */
const shorten = (text) => {
	if (text.length <= TEXT_LENGTH) {
		return text;
	}

	const cut = text.slice(0, TEXT_LENGTH);
	const space = cut.lastIndexOf(' ');

	return `${(space > TEXT_LENGTH / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
};

/**
 * The text of the first heading in blocks, depth first, without markup,
 * shortened (a heading's content is HTML, and can be long).
 *
 * @param {Object[]} blocks Blocks.
 * @return {string} Heading text, or empty.
 */
export const firstHeading = (blocks) => {
	for (const block of blocks ?? []) {
		if ('core/heading' === block.name) {
			const text = plain(block.attributes?.content);

			if (text) {
				return shorten(text);
			}
		}

		const nested = firstHeading(block.innerBlocks);

		if (nested) {
			return nested;
		}
	}

	return '';
};

// Text blocks a section without a heading can be named by.
const TEXT_BLOCKS = ['core/paragraph', 'core/verse', 'core/pullquote'];

/**
 * The text of the first text block in blocks, depth first, without markup,
 * shortened.
 *
 * @param {Object[]} blocks Blocks.
 * @return {string} Text, or empty.
 */
export const firstText = (blocks) => {
	for (const block of blocks ?? []) {
		if (TEXT_BLOCKS.includes(block.name)) {
			const text = shorten(
				plain(block.attributes?.content ?? block.attributes?.value)
			);

			if (text) {
				return text;
			}
		}

		const nested = firstText(block.innerBlocks);

		if (nested) {
			return nested;
		}
	}

	return '';
};
