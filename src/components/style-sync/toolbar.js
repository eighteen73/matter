/**
 * Style sync toolbar toggle for Group and Column containers.
 */

import { BlockControls } from '@wordpress/block-editor';
import { ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { useRegistry } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { update } from '@wordpress/icons';

import {
	disableStyleSyncFromContainer,
	enableStyleSyncFromContainer,
} from './apply';
import { STYLE_SYNC_ATTRIBUTE } from './constants';
import './editor.scss';

/**
 * @param {Object} props
 * @param {string} props.clientId
 * @param {Object} props.attributes
 * @return {Element} The component.
 */
export default function StyleSyncToolbar({ clientId, attributes }) {
	const registry = useRegistry();
	const isSyncEnabled = attributes?.[STYLE_SYNC_ATTRIBUTE] === true;

	return (
		<BlockControls group="other">
			<ToolbarGroup>
				<ToolbarButton
					icon={update}
					label={
						isSyncEnabled
							? __('Disable style sync', 'matter')
							: __('Enable style sync', 'matter')
					}
					isPressed={isSyncEnabled}
					className="matter-style-sync-toolbar-button"
					onClick={() => {
						if (isSyncEnabled) {
							disableStyleSyncFromContainer(registry, clientId);
							return;
						}

						enableStyleSyncFromContainer(registry, clientId);
					}}
				/>
			</ToolbarGroup>
		</BlockControls>
	);
}
