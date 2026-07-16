/**
 * WordPress dependencies
 */
import {
	ToggleControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Settings({
	attributes,
	setAttributes,
	isQuery,
	firstItem,
	updateBlockAttributes,
	syncFirstItemOpen,
}) {
	const { autoclose, openFirstItem, showIcon, iconPosition } = attributes;

	return (
		<ToolsPanel
			label={__('Settings', 'matter')}
			resetAll={() => {
				setAttributes({
					autoclose: false,
					openFirstItem: false,
					showIcon: true,
					iconPosition: 'right',
				});

				if (!isQuery && firstItem) {
					updateBlockAttributes(firstItem.clientId, {
						openByDefault: false,
					});
				}
			}}
		>
			<ToolsPanelItem
				hasValue={() => !!autoclose}
				label={__('Auto-close', 'matter')}
				onDeselect={() => setAttributes({ autoclose: false })}
				isShownByDefault
			>
				<ToggleControl
					__nextHasNoMarginBottom
					label={__('Auto-close', 'matter')}
					help={__(
						'Automatically close accordion items when a new one is opened.',
						'matter'
					)}
					checked={autoclose}
					onChange={(value) => setAttributes({ autoclose: value })}
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={() => !!openFirstItem}
				label={__('Open first item', 'matter')}
				onDeselect={() => syncFirstItemOpen(false)}
				isShownByDefault
			>
				<ToggleControl
					__nextHasNoMarginBottom
					label={__('Open first item', 'matter')}
					help={__('Open the first item by default.', 'matter')}
					checked={openFirstItem}
					onChange={syncFirstItemOpen}
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={() => !showIcon}
				label={__('Show icon', 'matter')}
				onDeselect={() => setAttributes({ showIcon: true })}
				isShownByDefault
			>
				<ToggleControl
					__nextHasNoMarginBottom
					label={__('Show icon', 'matter')}
					help={__(
						'Display a plus icon next to the accordion heading.',
						'matter'
					)}
					checked={showIcon}
					onChange={(value) =>
						setAttributes({
							showIcon: value,
							iconPosition: value ? iconPosition : 'right',
						})
					}
				/>
			</ToolsPanelItem>

			{showIcon && (
				<ToolsPanelItem
					hasValue={() => iconPosition !== 'right'}
					label={__('Icon position', 'matter')}
					onDeselect={() => setAttributes({ iconPosition: 'right' })}
					isShownByDefault
				>
					<ToggleGroupControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={__('Icon position', 'matter')}
						value={iconPosition}
						onChange={(value) =>
							setAttributes({
								iconPosition: value,
							})
						}
						isBlock
					>
						<ToggleGroupControlOption
							value="left"
							label={__('Left', 'matter')}
						/>
						<ToggleGroupControlOption
							value="right"
							label={__('Right', 'matter')}
						/>
					</ToggleGroupControl>
				</ToolsPanelItem>
			)}
		</ToolsPanel>
	);
}
