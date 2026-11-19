/**
 * The filters in the editor: a list of filter blocks, with the label the
 * drawer is named by. The panel and drawer are the front end's: in the editor
 * the filters always show inline.
 */

/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Edit({ attributes: { label }, setAttributes }) {
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-matter-filters__form' },
		{
			allowedBlocks: ['matter/filter'],
			template: [['matter/filter']],
			renderAppender: undefined,
		}
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Filters', 'matter')}>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={__('Name', 'matter')}
						help={__(
							'Names the filters panel on small screens, and its button. Default: Filters.',
							'matter'
						)}
						value={label}
						placeholder={__('Filters', 'matter')}
						onChange={(value) => setAttributes({ label: value })}
					/>
				</PanelBody>
			</InspectorControls>
			<div {...blockProps}>
				<div {...innerBlocksProps} />
			</div>
		</>
	);
}
