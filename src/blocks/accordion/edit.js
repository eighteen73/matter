/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const ALLOWED_BLOCKS = ['matter/accordion-item', 'core/query'];

export default function Edit({ attributes, setAttributes }) {
	const { headingLevel, autoclose, openFirst, faqSchema } = attributes;

	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		template: [['matter/accordion-item']],
	});

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'matter')}>
					<SelectControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={__('Item heading level', 'matter')}
						value={String(headingLevel)}
						options={[2, 3, 4, 5, 6].map((level) => ({
							value: String(level),
							label: `H${level}`,
						}))}
						onChange={(value) =>
							setAttributes({ headingLevel: Number(value) })
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={__('Only one item open at a time', 'matter')}
						checked={autoclose}
						onChange={(value) =>
							setAttributes({ autoclose: value })
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={__('Open the first item', 'matter')}
						checked={openFirst}
						onChange={(value) =>
							setAttributes({ openFirst: value })
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={__('FAQ schema', 'matter')}
						help={__(
							'Describe these items to search engines as questions and answers.',
							'matter'
						)}
						checked={faqSchema}
						onChange={(value) =>
							setAttributes({ faqSchema: value })
						}
					/>
				</PanelBody>
			</InspectorControls>
			<div {...innerBlocksProps} />
		</>
	);
}
