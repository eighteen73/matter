/**
 * Group sticky extras: offset, z-index, and unstick at Mobile / Tablet.
 */

import { InspectorControls, useSettings } from '@wordpress/block-editor';
import {
	ToggleControl,
	CustomSelectControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalNumberControl as NumberControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import { registerBlockExtension } from '../../utils/register-block-extension';
import clsx from 'clsx';

import ViewportSelectorControl from '../../components/viewport-selector-control';
import './style.scss';

const DEFAULT_UNSTICK_VIEWPORT = 'tablet';

const additionalAttributes = {
	stickyPosition: {
		type: 'string',
		default: 'top',
	},
	stickyOffset: {
		type: 'string',
		default: '0',
	},
	stickyZIndex: {
		type: 'number',
	},
	unstickOnMobile: {
		type: 'boolean',
	},
	unstickBreakpoint: {
		type: 'string',
	},
};

const stickyPositionOptions = [
	{
		key: 'top',
		name: __('Top', 'matter'),
	},
	{
		key: 'bottom',
		name: __('Bottom', 'matter'),
	},
];

/**
 * @param {string | null | undefined} stickyOffset
 * @return {string | null} Return value.
 */
const getStickyOffsetValue = (stickyOffset) => {
	if (!stickyOffset && stickyOffset !== '0') {
		return null;
	}

	if (stickyOffset === '0') {
		return '0px';
	}

	return `var(--wp--preset--spacing--${stickyOffset})`;
};

/**
 * @param {string} value
 * @return {boolean} Whether the condition is true.
 */
const isViewportToken = (value) => value === 'mobile' || value === 'tablet';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @return {Element} The component.
 */
function BlockEdit(props) {
	const { attributes, setAttributes } = props;
	const {
		stickyPosition,
		stickyOffset,
		stickyZIndex,
		unstickOnMobile,
		unstickBreakpoint,
	} = attributes;

	const spacingPresetsRaw = useSettings([
		'spacing',
		'spacingSizes',
		'theme',
	]) || [[]];
	const spacingPresets = spacingPresetsRaw[0];

	const spacingOptions = [
		{ key: '0', name: __('None', 'matter') },
		...(spacingPresets || []).map((preset) => ({
			key: preset.slug,
			name: preset.name || preset.slug.toUpperCase(),
		})),
	];

	const resolvedUnstickViewport = isViewportToken(unstickBreakpoint)
		? unstickBreakpoint
		: DEFAULT_UNSTICK_VIEWPORT;

	return (
		<>
			{attributes?.style?.position?.type === 'sticky' && (
				<InspectorControls group="position">
					<div style={{ paddingTop: '16px' }}>
						<VStack spacing={4}>
							<CustomSelectControl
								label={__('Position', 'matter')}
								value={stickyPositionOptions.find(
									(option) =>
										option.key === (stickyPosition || 'top')
								)}
								onChange={({ selectedItem }) => {
									setAttributes({
										stickyPosition:
											selectedItem?.key || 'top',
									});
								}}
								options={stickyPositionOptions}
							/>
							<CustomSelectControl
								label={__('Sticky offset', 'matter')}
								help={__(
									'Distance from the viewport edge when the block is stuck.',
									'matter'
								)}
								value={spacingOptions.find(
									(option) =>
										option.key === (stickyOffset || '0')
								)}
								onChange={({ selectedItem }) => {
									setAttributes({
										stickyOffset: selectedItem?.key || null,
									});
								}}
								options={spacingOptions}
							/>
							<NumberControl
								label={__('Z-Index position', 'matter')}
								help={__(
									'Control stacking order. Higher values appear on top.',
									'matter'
								)}
								value={stickyZIndex ?? 0}
								onChange={(value) => {
									const numValue =
										value === '' || value === undefined
											? 0
											: Number(value);
									setAttributes({
										stickyZIndex:
											numValue === 0 ? null : numValue,
									});
								}}
								step={1}
							/>
							<ToggleControl
								label={__(
									'Unstick on smaller viewports',
									'matter'
								)}
								help={__(
									'Disable sticky positioning below the selected viewport.',
									'matter'
								)}
								checked={unstickOnMobile || false}
								onChange={(value) => {
									if (
										value &&
										!isViewportToken(unstickBreakpoint)
									) {
										setAttributes({
											unstickOnMobile: true,
											unstickBreakpoint:
												DEFAULT_UNSTICK_VIEWPORT,
										});
									} else {
										setAttributes({
											unstickOnMobile: value,
										});
									}
								}}
							/>

							{unstickOnMobile && (
								<ViewportSelectorControl
									label={__('Unstick below', 'matter')}
									help={__(
										'Uses Mobile and Tablet widths from theme.json settings.viewport.',
										'matter'
									)}
									value={resolvedUnstickViewport}
									onChange={(value) => {
										setAttributes({
											unstickBreakpoint: value,
										});
									}}
								/>
							)}
						</VStack>
					</div>
				</InspectorControls>
			)}
		</>
	);
}

/**
 * @param {Object} attributes
 * @return {string} Generated string.
 */
function generateClassNames(attributes) {
	const {
		stickyPosition,
		stickyOffset,
		unstickOnMobile,
		unstickBreakpoint,
		style,
	} = attributes;

	const isSticky = style?.position?.type === 'sticky';
	const viewport = isViewportToken(unstickBreakpoint)
		? unstickBreakpoint
		: DEFAULT_UNSTICK_VIEWPORT;

	return clsx({
		[`is-position-sticky-${stickyPosition}`]: stickyPosition && isSticky,
		[`is-sticky-offset-${stickyOffset}`]: stickyOffset && isSticky,
		'is-unstuck-on-mobile': unstickOnMobile && isSticky,
		[`is-unstuck-on-${viewport}`]: unstickOnMobile && isSticky,
	});
}

/**
 * @param {Object} attributes
 * @return {Object<string, string|number>} Inline style map.
 */
function generateInlineStyles(attributes) {
	const { stickyZIndex, stickyOffset, style } = attributes;
	const inlineStyles = {};
	const isSticky = style?.position?.type === 'sticky';

	if (typeof stickyZIndex === 'number') {
		inlineStyles.zIndex = stickyZIndex;
	}

	if (isSticky) {
		const stickyOffsetValue = getStickyOffsetValue(stickyOffset);

		if (stickyOffsetValue !== null) {
			inlineStyles['--sticky-offset'] = stickyOffsetValue;
		}
	}

	return inlineStyles;
}

registerBlockExtension(['core/group'], {
	extensionName: 'matter/sticky',
	attributes: additionalAttributes,
	classNameGenerator: generateClassNames,
	inlineStyleGenerator: generateInlineStyles,
	Edit: BlockEdit,
	order: 'after',
});
