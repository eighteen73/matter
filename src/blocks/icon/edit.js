/**
 * External dependencies
 */
import clsx from 'clsx';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	DropdownMenu,
	TextControl,
	ToolbarButton,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import {
	flipHorizontal as flipHorizontalIcon,
	flipVertical as flipVerticalIcon,
	rotateRight,
} from '@wordpress/icons';
import {
	BlockControls,
	InspectorControls,
	useBlockProps,
	useBlockEditingMode,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalUseColorProps as useColorProps,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalUseBorderProps as useBorderProps,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalGetSpacingClassesAndStyles as useSpacingProps,
	getDimensionsClassesAndStyles as useDimensionsProps,
} from '@wordpress/block-editor';
import { useState } from '@wordpress/element';
import { SVG, Rect, Path } from '@wordpress/primitives';
import { useSelect } from '@wordpress/data';
import { store as coreDataStore } from '@wordpress/core-data';

/**
 * Internal dependencies
 */
import { ICON_ENTITY } from '../../utils/icon-registry';
import HtmlRenderer from '../../utils/html-renderer';
import IconInserterModal from '../../components/icon-inserter';

/**
 * @param {Object} props            Component props.
 * @param {string} props.className  Additional class names.
 * @param {Object} props.style      Inline styles.
 * @return {Element} Placeholder element.
 */
function IconPlaceholder({ className, style }) {
	return (
		<SVG
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 60 60"
			preserveAspectRatio="none"
			fill="none"
			aria-hidden="true"
			className={clsx('wp-block-matter-icon__placeholder', className)}
			style={style}
		>
			<Rect width="60" height="60" fill="currentColor" fillOpacity={0.1} />
			<Path
				vectorEffect="non-scaling-stroke"
				stroke="currentColor"
				strokeOpacity={0.25}
				d="M60 60 0 0"
			/>
		</SVG>
	);
}

/**
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Update block attributes.
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes }) {
	const { icon, ariaLabel, flipHorizontal, flipVertical, rotation } = attributes;

	const [isInserterOpen, setInserterOpen] = useState(false);

	const isContentOnlyMode = useBlockEditingMode() === 'contentOnly';

	const colorProps = useColorProps(attributes);
	const spacingProps = useSpacingProps(attributes);
	const borderProps = useBorderProps(attributes);
	const dimensionsProps = useDimensionsProps(attributes);

	const { selectedIcon, allIcons = [] } = useSelect(
		(select) => {
			const { getEntityRecord, getEntityRecords } = select(coreDataStore);

			return {
				selectedIcon: icon
					? getEntityRecord(ICON_ENTITY.kind, ICON_ENTITY.name, icon)
					: null,
				allIcons: isInserterOpen
					? getEntityRecords(ICON_ENTITY.kind, ICON_ENTITY.name)
					: undefined,
			};
		},
		[isInserterOpen, icon]
	);

	const iconToDisplay = selectedIcon?.content || '';

	const flipClasses = {
		'is-flip-horizontal': flipHorizontal,
		'is-flip-vertical': flipVertical,
	};

	const rotationStyle = rotation ? { rotate: `${rotation}deg` } : {};

	const blockControls = (
		<>
			{icon && (
				<BlockControls group="block">
					<ToolbarButton
						icon={flipHorizontalIcon}
						label={__('Flip horizontal', 'matter')}
						isPressed={flipHorizontal}
						onClick={() =>
							setAttributes({
								flipHorizontal: !flipHorizontal,
							})
						}
					/>
					<ToolbarButton
						icon={flipVerticalIcon}
						label={__('Flip vertical', 'matter')}
						isPressed={flipVertical}
						onClick={() =>
							setAttributes({
								flipVertical: !flipVertical,
							})
						}
					/>
					<ToolbarButton
						icon={rotateRight}
						label={__('Rotate', 'matter')}
						onClick={() =>
							setAttributes({
								rotation: ((rotation || 0) + 90) % 360,
							})
						}
					/>
				</BlockControls>
			)}
			<BlockControls group="other">
				<ToolbarButton
					onClick={() => {
						setInserterOpen(true);
					}}
				>
					{icon ? __('Replace', 'matter') : __('Choose icon', 'matter')}
				</ToolbarButton>
				{isContentOnlyMode && icon && (
					<DropdownMenu
						icon=""
						toggleProps={{
							as: ToolbarButton,
						}}
						popoverProps={{
							className: 'is-alternate',
						}}
						text={__('Label', 'matter')}
					>
						{() => (
							<TextControl
								className="wp-block-matter-icon__toolbar-content"
								label={__('Label', 'matter')}
								value={ariaLabel || ''}
								onChange={(value) =>
									setAttributes({
										ariaLabel: value,
									})
								}
								help={__(
									'Briefly describe the icon to help screen reader users. Leave blank for decorative icons.',
									'matter'
								)}
							/>
						)}
					</DropdownMenu>
				)}
			</BlockControls>
		</>
	);

	const inspectorControls = icon && (
		<InspectorControls group="settings">
			<ToolsPanel
				label={__('Settings', 'matter')}
				resetAll={() =>
					setAttributes({
						ariaLabel: undefined,
					})
				}
			>
				<ToolsPanelItem
					label={__('Label', 'matter')}
					isShownByDefault
					hasValue={() => !!ariaLabel}
					onDeselect={() => setAttributes({ ariaLabel: undefined })}
				>
					<TextControl
						label={__('Label', 'matter')}
						help={__(
							'Briefly describe the icon to help screen reader users. Leave blank for decorative icons.',
							'matter'
						)}
						value={ariaLabel || ''}
						onChange={(value) => setAttributes({ ariaLabel: value })}
					/>
				</ToolsPanelItem>
			</ToolsPanel>
		</InspectorControls>
	);

	return (
		<>
			{blockControls}
			{inspectorControls}
			<div {...useBlockProps()}>
				{icon ? (
					<HtmlRenderer
						html={iconToDisplay}
						wrapperProps={{
							className: clsx(
								colorProps.className,
								borderProps.className,
								spacingProps.className,
								dimensionsProps.className,
								flipClasses
							),
							style: {
								...colorProps.style,
								...borderProps.style,
								...spacingProps.style,
								...dimensionsProps.style,
								...rotationStyle,
							},
						}}
					/>
				) : (
					<IconPlaceholder
						className={clsx(
							borderProps.className,
							spacingProps.className,
							dimensionsProps.className,
							flipClasses
						)}
						style={{
							...borderProps.style,
							...spacingProps.style,
							...dimensionsProps.style,
							...rotationStyle,
							height: 'auto',
						}}
					/>
				)}
			</div>
			{isInserterOpen && (
				<IconInserterModal
					icons={allIcons}
					setInserterOpen={setInserterOpen}
					attributes={attributes}
					setAttributes={setAttributes}
				/>
			)}
		</>
	);
}
