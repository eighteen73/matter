export const findDescendantBlock = (blocks, blockName) => {
	for (const block of blocks || []) {
		if (block.name === blockName) {
			return block;
		}

		const nested = findDescendantBlock(block.innerBlocks, blockName);

		if (nested) {
			return nested;
		}
	}

	return null;
};
