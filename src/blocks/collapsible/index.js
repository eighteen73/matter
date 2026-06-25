import { registerBlockType } from '@wordpress/blocks';
import icon from './icon';

import './style.scss';

import Edit from './edit';
import Save from './save';
import metadata from './block.json';

registerBlockType(metadata.name, {
	icon,
	edit: Edit,
	save: Save,
});
