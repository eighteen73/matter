import { registerBlockType } from '@wordpress/blocks';

import './style.scss';

import Edit from './edit';
import Save from './save';
import deprecated from './deprecated';
import metadata from './block.json';
import icon from './icon';

registerBlockType(metadata.name, {
	edit: Edit,
	save: Save,
	deprecated,
	icon,
});
