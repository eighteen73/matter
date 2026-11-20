/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';
import { Chip } from '../../components/icons/chip';
import './style.scss';

registerBlockType(metadata.name, {
	icon: Chip,
	edit: Edit,
	save: () => null,
});
