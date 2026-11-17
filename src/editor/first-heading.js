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
