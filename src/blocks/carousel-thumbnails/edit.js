import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import './editor.scss';

export default function Edit({ attributes, setAttributes }) {
	const { syncWithCarousel = true } = attributes;

	const blockProps = useBlockProps({
		className: 'embla__thumbs',
	});

	const { children, ...innerBlocksProps } = useInnerBlocksProps(blockProps, {
		orientation: 'horizontal',
		templateLock: false,
		renderAppender: false,
	});

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'matter')} initialOpen={true}>
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
				</PanelBody>
			</InspectorControls>

			<div {...innerBlocksProps}>
				<div className="embla__thumbs__viewport">
					<div className="embla__thumbs__container">{children}</div>
				</div>
			</div>
		</>
	);
}
