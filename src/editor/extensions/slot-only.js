/**
 * Blocks only sections' slots allow (in a slot's `allowedBlocks` but not the
 * theme's allowed blocks; AllowedBlocks::slot_only()): the server allows
 * them, and here they get those sections as their `ancestor`, so the inserter
 * offers them inside those sections and not at the top level of a page.
 */

/**
 * WordPress dependencies
 */
import { addFilter } from '@wordpress/hooks';

/**
 * A block type's settings, limited to the sections that allow it.
 *
 * @param {Object} settings Block type settings.
 * @param {string} name     Block name.
 * @param {Object} slotOnly Block name => section names.
 * @return {Object} Settings.
 */
export function withSlotOnly(settings, name, slotOnly = {}) {
	const sections = slotOnly[name];

	if (!Array.isArray(sections) || !sections.length) {
		return settings;
	}

	return {
		...settings,
		ancestor: [...new Set([...(settings.ancestor ?? []), ...sections])],
	};
}

addFilter('blocks.registerBlockType', 'matter/slot-only', (settings, name) =>
	withSlotOnly(settings, name, window.matterEditor?.slotOnlyBlocks)
);
