import { registerBlockType } from '@wordpress/blocks';
import { contents } from '@wordpress/icons';

import './style.scss';

import Edit from './edit';
import Save from './save';
import metadata from './block.json';

registerBlockType(metadata.name, {
	edit: Edit,
	save: Save,
	icon: contents,
});
