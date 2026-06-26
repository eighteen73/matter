import { registerBlockType } from '@wordpress/blocks';
import { dispatch } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';

import icon from './icon';
import { ICON_ENTITY } from '../../utils/icon-registry';

import './style.scss';
import './editor.scss';

import Edit from './edit';
import variations from './variations';
import metadata from './block.json';

dispatch(coreStore).addEntities([
	{
		label: 'Matter Icons',
		kind: ICON_ENTITY.kind,
		name: ICON_ENTITY.name,
		baseURL: ICON_ENTITY.baseURL,
		key: 'name',
		supportsPagination: false,
	},
]);

registerBlockType(metadata.name, {
	icon,
	edit: Edit,
	variations,
});
