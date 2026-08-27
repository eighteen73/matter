/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { addFilter } from '@wordpress/hooks';

/**
 * Internal dependencies
 */
import './editor.scss';
import Edit from './edit';
import icon from './icon';
import metadata from './block.json';

registerBlockType(metadata.name, {
	edit: Edit,
	icon,
	__experimentalLabel: (attributes) => attributes?.label || undefined,
});

/**
 * Allow the megamenu block as a child of core Navigation.
 *
 * Core Navigation maintains an explicit allow-list; `parent` alone is not enough.
 *
 * @param {Object} settings Block settings.
 * @param {string} name     Block name.
 * @return {Object} Filtered settings.
 */
const addToNavigation = (settings, name) => {
	if (name !== 'core/navigation') {
		return settings;
	}

	return {
		...settings,
		allowedBlocks: [...(settings.allowedBlocks ?? []), metadata.name],
	};
};

addFilter(
	'blocks.registerBlockType',
	'matter/navigation-megamenu-add-to-navigation',
	addToNavigation
);
