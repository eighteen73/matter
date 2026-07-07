import { registerBlockType } from '@wordpress/blocks';

import './style.scss';

import Edit from './edit';
import Save from './save';
import metadata from './block.json';
import variations from './variations';
import { triggerToTriggerHamburgerTransform } from './transforms';
import icon from './icon';

registerBlockType(metadata.name, {
	edit: Edit,
	save: Save,
	variations,
	transforms: {
		to: [triggerToTriggerHamburgerTransform()],
	},
	icon,
});
