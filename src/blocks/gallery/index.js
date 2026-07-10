import { registerBlockType } from '@wordpress/blocks';

import './style.scss';
import './editor.scss';

import Edit from './edit';
import Save from './save';
import metadata from './block.json';
import { Gallery } from '../../components/icons/gallery';

registerBlockType(metadata.name, {
	icon: Gallery,
	edit: Edit,
	save: Save,
});
