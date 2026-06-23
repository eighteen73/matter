import { registerBlockType } from '@wordpress/blocks';

import './style.scss';

import Edit from './edit';
import metadata from './block.json';
import { triggerHamburgerToTriggerTransform } from '../trigger/transforms';

registerBlockType(metadata.name, {
	edit: Edit,
	transforms: {
		to: [triggerHamburgerToTriggerTransform()],
	},
});
