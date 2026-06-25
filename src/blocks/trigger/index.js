import { registerBlockType } from '@wordpress/blocks';

import Edit from './edit';
import Save from './save';
import metadata from './block.json';
import { triggerToTriggerHamburgerTransform } from './transforms';
import icon from './icon';

registerBlockType(metadata.name, {
	edit: Edit,
	save: Save,
	transforms: {
		to: [triggerToTriggerHamburgerTransform()],
	},
	icon,
});
