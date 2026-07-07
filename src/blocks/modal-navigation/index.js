import { registerBlockType } from '@wordpress/blocks';
import { arrowRight } from '@wordpress/icons';

import './style.scss';

import Edit from './edit';
import metadata from './block.json';
import variations from './variations';

registerBlockType(metadata.name, {
	edit: Edit,
	icon: arrowRight,
	variations,
});
