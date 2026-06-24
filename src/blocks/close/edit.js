import {
	BlockControls,
	InspectorControls,
	useBlockProps,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalSpacingSizesControl as SpacingSizesControl,
} from '@wordpress/block-editor';
import {
	TextControl,
	ToggleControl,
	ToolbarDropdownMenu,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { arrowRight, arrowUpLeft, arrowUpRight } from '@wordpress/icons';

import { getPositionStyles } from '../../utils/position';

const PLACEMENT_OPTIONS = [
	{
		value: 'inline',
		label: __('Inline', 'matter'),
		icon: arrowRight,
	},
	{
		value: 'top-left',
		label: __('Top left', 'matter'),
		icon: arrowUpLeft,
	},
	{
		value: 'top-right',
		label: __('Top right', 'matter'),
		icon: arrowUpRight,
	},
];

/**
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Update block attributes.
 * @param {string}   props.clientId      Block client ID.
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes, clientId }) {
	const { label, showLabel, position, positionOffset } = attributes;
	const isPositioned = position !== 'inline';
	const activePlacement =
		PLACEMENT_OPTIONS.find((option) => option.value === position) ??
		PLACEMENT_OPTIONS[0];
	const buttonLabel = label || __('Close', 'matter');
	const positionStyles = useMemo(
		() => getPositionStyles(position, positionOffset),
		[position, positionOffset]
	);
	const blockProps = useBlockProps({
		'aria-label': buttonLabel,
		style: positionStyles,
	});

	return (
		<>
			<BlockControls>
				<ToolbarDropdownMenu
					icon={activePlacement.icon}
					label={__('Placement', 'matter')}
					controls={PLACEMENT_OPTIONS.map((option) => ({
						title: option.label,
						icon: option.icon,
						isActive: position === option.value,
						onClick: () =>
							setAttributes({ position: option.value }),
					}))}
				/>
			</BlockControls>

			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'matter')}
					resetAll={() =>
						setAttributes({ label: 'Close', showLabel: false })
					}
				>
					<ToolsPanelItem
						label={__('Label', 'matter')}
						hasValue={() => !!label}
						onDeselect={() => setAttributes({ label: 'Close' })}
						isShownByDefault
					>
						<TextControl
							label={__('Label', 'matter')}
							value={label}
							onChange={(value) =>
								setAttributes({ label: value })
							}
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={__('Show label', 'matter')}
						hasValue={() => !!showLabel}
						onDeselect={() => setAttributes({ showLabel: false })}
						isShownByDefault
					>
						<ToggleControl
							label={__('Show label', 'matter')}
							checked={showLabel}
							onChange={(value) =>
								setAttributes({ showLabel: value })
							}
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			{isPositioned && (
				<InspectorControls group="dimensions">
					<ToolsPanelItem
						hasValue={() => positionOffset !== 0}
						label={__('Inset', 'matter')}
						onDeselect={() =>
							setAttributes({
								positionOffset: 0,
							})
						}
						resetAllFilter={() => ({
							positionOffset: 0,
						})}
						isShownByDefault
						panelId={clientId}
					>
						<SpacingSizesControl
							label={__('Inset', 'matter')}
							values={{ top: positionOffset }}
							onChange={({ top }) =>
								setAttributes({
									positionOffset: top || 0,
								})
							}
							sides={['top']}
							showSideInLabel={false}
						/>
					</ToolsPanelItem>
				</InspectorControls>
			)}

			<button {...blockProps}>
				<span
					className="wp-block-matter-close__icon"
					aria-hidden="true"
				/>
				{showLabel && (
					<span className="wp-block-matter-close__label">
						{buttonLabel}
					</span>
				)}
			</button>
		</>
	);
}
