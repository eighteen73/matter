import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import './editor.scss';

import ColorControl from '../../components/color-control';
import { storeColorValue } from '../../utils/colors';
import { getBlockStyles } from '../../utils/block-styles';

export default function Edit({ attributes, setAttributes, clientId }) {
	const { syncWithCarousel = true, activeThumbnailColor } = attributes;

	const colorStyles = getBlockStyles(attributes, 'carousel');

	const blockProps = useBlockProps({
		className: 'embla__thumbs',
		style: colorStyles,
	});

	const { children, ...innerBlocksProps } = useInnerBlocksProps(blockProps, {
		orientation: 'horizontal',
		templateLock: false,
		renderAppender: false,
	});

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'matter')}
					resetAll={() => setAttributes({ syncWithCarousel: true })}
				>
					<ToolsPanelItem
						label={__('Sync with carousel', 'matter')}
						hasValue={() =>
							!!syncWithCarousel && syncWithCarousel !== true
						}
						onDeselect={() =>
							setAttributes({ syncWithCarousel: true })
						}
						isShownByDefault
					>
						<ToggleControl
							label={__('Sync with carousel', 'matter')}
							help={__(
								'When enabled, thumbnail content mirrors the carousel viewport slides.',
								'matter'
							)}
							checked={syncWithCarousel}
							onChange={(value) =>
								setAttributes({ syncWithCarousel: value })
							}
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			<InspectorControls group="color">
				<ColorControl
					label={__('Active thumbnail', 'matter')}
					value={activeThumbnailColor}
					onChange={(value, slug) =>
						setAttributes({
							activeThumbnailColor: storeColorValue(slug, value),
						})
					}
					panelId={clientId}
				/>
			</InspectorControls>

			<div {...innerBlocksProps}>
				<div className="embla__thumbs__viewport">
					<div className="embla__thumbs__container">{children}</div>
				</div>
			</div>
		</>
	);
}
