/**
 * Sections in the list view are named after their first heading
 * ("Showcase: The perfect backdrop…"), so a page with several of one section
 * can be read without selecting each. A name the client gives a section
 * (Rename) wins.
 *
 * A block's label is worked out from its attributes alone, so the section is
 * found by them: they're the same object the store holds for it.
 */

/**
 * WordPress dependencies
 */
import { getBlockType } from '@wordpress/blocks';
import { select } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { firstHeading } from './first-heading';

/**
 * A section's list view label.
 *
 * @param {string} name Section block name.
 * @return {Function} `__experimentalLabel` callback.
 */
export const sectionLabel =
	(name) =>
	(attributes, { context } = {}) => {
		if ('list-view' !== context) {
			return undefined;
		}

		if (attributes?.metadata?.name) {
			return attributes.metadata.name;
		}

		const store = select('core/block-editor');
		const clientId = store
			.getBlocksByName(name)
			.find((id) => store.getBlockAttributes(id) === attributes);
		const heading = clientId ? firstHeading(store.getBlocks(clientId)) : '';

		return heading
			? `${getBlockType(name)?.title ?? name}: ${heading}`
			: undefined;
	};
