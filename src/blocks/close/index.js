import { registerBlockType } from '@wordpress/blocks';
import { close } from '@wordpress/icons';

import './style.scss';

import Edit from './edit';
import metadata from './block.json';

registerBlockType(metadata.name, {
	edit: Edit,
	icon: close,
});
