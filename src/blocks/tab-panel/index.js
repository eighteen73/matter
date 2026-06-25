/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { tabPanel } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import Edit from './edit';
import Save from './save';
import metadata from './block.json';
import './style.scss';

registerBlockType(metadata.name, {
	icon: tabPanel,
	edit: Edit,
	save: Save,
});
