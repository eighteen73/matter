import { registerBlockType } from '@wordpress/blocks';
import { postCommentsForm } from '@wordpress/icons';

import './style.scss';

import Edit from './edit';
import metadata from './block.json';

registerBlockType(metadata.name, {
	icon: postCommentsForm,
	edit: Edit,
});
