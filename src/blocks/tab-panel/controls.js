/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	CheckboxControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useDispatch } from '@wordpress/data';

/**
 * Internal dependencies
 */

export default function Controls({ tabsClientId, blockIndex, isDefaultTab }) {
	const { updateBlockAttributes } = useDispatch(blockEditorStore);

	return (
		<InspectorControls>
			<ToolsPanel
					label={__('Settings')}
					resetAll={() => {
						updateBlockAttributes(tabsClientId, {
							activeTabIndex: 0,
						});
					}}
				>
					<ToolsPanelItem
						label={__('Default tab')}
						hasValue={() => isDefaultTab && blockIndex !== 0}
						onDeselect={() => {
							updateBlockAttributes(tabsClientId, {
								activeTabIndex: 0,
							});
						}}
						isShownByDefault
					>
						<CheckboxControl
							label={__('Default tab')}
							checked={isDefaultTab}
							onChange={(value) => {
								updateBlockAttributes(tabsClientId, {
									activeTabIndex: value ? blockIndex : 0,
								});
							}}
						/>
					</ToolsPanelItem>
			</ToolsPanel>
		</InspectorControls>
	);
}
