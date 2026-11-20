/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';
import { Carousel } from '../../components/icons/carousel';
import './style.scss';

registerBlockType(metadata.name, {
	icon: Carousel,
	edit: Edit,
	save: () => <InnerBlocks.Content />,
});
