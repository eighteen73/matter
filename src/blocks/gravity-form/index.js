import { registerBlockType } from '@wordpress/blocks';
import { GravityForm } from '../../components/icons/gravity-form';

import './style.scss';

import Edit from './edit';
import metadata from './block.json';

registerBlockType(metadata.name, {
	icon: GravityForm,
	edit: Edit,
});
