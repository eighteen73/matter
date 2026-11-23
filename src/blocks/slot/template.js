/**
 * Whether applying a template to a slot's blocks would keep all of them.
 *
 * Core's `synchronizeBlocksWithTemplate` builds exactly the template's blocks:
 * a saved block is kept (with its attributes) only when it has the same name
 * as the template block at its position, and then its inner blocks are
 * replaced the same way when the template block has an inner template (and
 * left alone when it has none). Saved blocks past the template's end, or of
 * another type, are lost, at any depth.
 *
 * So the template is safe only when, at every level, the saved names are the
 * start of the template's names, and a template block's inner template
 * (when it has one) is safe for that block's inner blocks in turn. A template
 * that only adds blocks passes.
 *
 * @param {Array}  saved    Saved blocks as `[ name, innerBlocks ]` trees.
 * @param {Array=} template Template as `[ name, attributes, innerTemplate ]`.
 * @return {boolean} Whether no saved block would be lost.
 */
export function templateKeepsBlocks(saved, template) {
	if (!template) {
		return true;
	}

	return saved.every(([name, inner], index) => {
		const [templateName, , innerTemplate] = template[index] ?? [];

		return (
			templateName === name && templateKeepsBlocks(inner, innerTemplate)
		);
	});
}

/**
 * A slot's blocks, as a tree of names that compares by value.
 *
 * @param {Array} blocks Blocks with `name` and `innerBlocks`.
 * @return {Array} `[ name, innerTree ]` for each block.
 */
export function nameTree(blocks) {
	return blocks.map((block) => [block.name, nameTree(block.innerBlocks)]);
}
