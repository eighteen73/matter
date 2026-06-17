import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import SpacingControl from '../../components/spacing-control';
import { __ } from '@wordpress/i18n';

import './editor.scss';
import { buildResponsiveSpacingCssVars } from '../../utils/spacing';

export default function Edit({ attributes, setAttributes }) {
	const { thumbGap } = attributes;

	const blockProps = useBlockProps({
		className: 'embla__thumbs',
		style: buildResponsiveSpacingCssVars({
			prefix: '--matter-carousel--thumb--gap',
			baseValue: thumbGap,
			breakpointLayers: [],
			breakpointTokens: [],
		}),
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
					<SpacingControl
						label={__('Thumb gap', 'matter')}
						value={thumbGap}
						onChange={(value) => setAttributes({ thumbGap: value })}
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
