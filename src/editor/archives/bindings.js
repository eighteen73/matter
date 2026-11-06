/**
 * The `matter/archive` bindings source in the editor: the archive's title,
 * description and count, for the archive an entry shows on. Bound blocks
 * can't be edited; the values come from the archive.
 */

/**
 * WordPress dependencies
 */
import { registerBlockBindingsSource } from '@wordpress/blocks';
import { store as editorStore } from '@wordpress/editor';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { getTarget } from './targets';

const PLACEHOLDERS = {
	title: __('Archive title', 'matter'),
	description: __('Archive description', 'matter'),
	count: '0',
};

registerBlockBindingsSource({
	name: 'matter/archive',
	getValues({ select, bindings }) {
		const value =
			select(editorStore).getEditedPostAttribute('meta')
				?._matter_archive_target ?? '';
		const values = getTarget(value)?.values ?? {};

		return Object.fromEntries(
			Object.entries(bindings).map(([attribute, { args }]) => [
				attribute,
				values[args?.key] || PLACEHOLDERS[args?.key] || args?.key,
			])
		);
	},
	canUserEditValue: () => false,
});
