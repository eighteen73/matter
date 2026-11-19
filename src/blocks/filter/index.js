/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';
import './style.scss';

registerBlockType(metadata.name, {
	edit: Edit,
	save: () => null,
	// "Category filter", "Colour filter"…: one variation per source, from the
	// server (Filters\Filters::variations()).
	__experimentalLabel: ({ source, label }, { context }) => {
		if (context !== 'list-view' && context !== 'breadcrumb') {
			return undefined;
		}

		const found = (window.matterEditor?.filterSources ?? []).find(
			({ key }) => key === source
		);

		return label || found?.label || undefined;
	},
});
