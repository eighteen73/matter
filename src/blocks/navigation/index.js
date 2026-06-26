import { registerBlockType } from '@wordpress/blocks';
import { navigation } from '@wordpress/icons';

import './style.scss';

import { createNavigationBlockLabel } from '../../utils/navigation-menu-title';

import Edit from './edit';
import metadata from './block.json';

registerBlockType(metadata.name, {
	edit: Edit,
	icon: navigation,
	__experimentalLabel: createNavigationBlockLabel(),
});
