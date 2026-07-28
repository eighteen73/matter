import { registerBlockType } from '@wordpress/blocks';

import Edit from './edit';
import Save from './save';
import metadata from './block.json';
import { CarouselSlide } from '../../components/icons/carousel';

registerBlockType(metadata.name, {
	icon: CarouselSlide,
	edit: Edit,
	save: Save,
});
