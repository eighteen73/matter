/**
 * The text of the first heading in blocks, depth first.
 *
 * @param {Object[]} blocks Blocks.
 * @return {string} Heading HTML, or empty.
 */
export const firstHeading = (blocks) => {
	for (const block of blocks ?? []) {
		if ('core/heading' === block.name) {
			const content = String(block.attributes?.content ?? '').trim();

			if (content) {
				return content;
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

// Characters of text kept in a label.
const TEXT_LENGTH = 40;

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
			const text = String(
				block.attributes?.content ?? block.attributes?.value ?? ''
			)
				.replace(/<[^>]*>/g, '')
				.replace(/\s+/g, ' ')
				.trim();

			if (text.length > TEXT_LENGTH) {
				// At a word's end, unless that leaves too little.
				const cut = text.slice(0, TEXT_LENGTH);
				const space = cut.lastIndexOf(' ');

				return `${(space > TEXT_LENGTH / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
			}

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
