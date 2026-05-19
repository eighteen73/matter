import { registerBlockType } from '@wordpress/blocks';

import './style.scss';

import Edit from './edit';
import Save from './save';
import metadata from './block.json';
import { Carousel } from '../../components/icons/carousel';

registerBlockType(metadata.name, {
	icon: Carousel,
	edit: Edit,
	save: Save,
});
