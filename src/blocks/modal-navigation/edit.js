import {
	BlockControls,
	InspectorControls,
	useBlockProps,
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
import { __ } from '@wordpress/i18n';
import { arrowLeft, arrowRight } from '@wordpress/icons';

const DIRECTION_OPTIONS = [
	{
		value: 'previous',
		label: __('Previous', 'matter'),
		icon: arrowLeft,
	},
	{
		value: 'next',
		label: __('Next', 'matter'),
		icon: arrowRight,
	},
];

const getDefaultLabel = (direction) =>
	direction === 'previous' ? __('Previous', 'matter') : __('Next', 'matter');

/**
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Update block attributes.
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes }) {
	const { direction, label, showLabel } = attributes;
	const activeDirection =
		DIRECTION_OPTIONS.find((option) => option.value === direction) ??
		DIRECTION_OPTIONS[1];
	const buttonLabel = label || getDefaultLabel(direction);
	const blockProps = useBlockProps({
		className: `is-direction-${activeDirection.value}`,
		'aria-label': buttonLabel,
	});

	return (
		<>
			<BlockControls>
				<ToolbarDropdownMenu
					icon={activeDirection.icon}
					label={__('Direction', 'matter')}
					controls={DIRECTION_OPTIONS.map((option) => ({
						title: option.label,
						icon: option.icon,
						isActive: direction === option.value,
						onClick: () =>
							setAttributes({
								direction: option.value,
								label: getDefaultLabel(option.value),
							}),
					}))}
				/>
			</BlockControls>

			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'matter')}
					resetAll={() =>
						setAttributes({
							direction: 'next',
							label: __('Next', 'matter'),
							showLabel: false,
						})
					}
				>
					<ToolsPanelItem
						label={__('Label', 'matter')}
						hasValue={() => !!label}
						onDeselect={() =>
							setAttributes({ label: getDefaultLabel(direction) })
						}
						isShownByDefault
					>
						<TextControl
							label={__('Label', 'matter')}
							value={label || ''}
							onChange={(value) =>
								setAttributes({ label: value })
							}
							__nextHasNoMarginBottom
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

			<button type="button" {...blockProps}>
				<span
					className="wp-block-matter-modal-navigation__icon"
					aria-hidden="true"
				/>
				{showLabel && (
					<span className="wp-block-matter-modal-navigation__label">
						{buttonLabel}
					</span>
				)}
			</button>
		</>
	);
}
