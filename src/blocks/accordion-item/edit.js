/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	RichText,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { __ } from '@wordpress/i18n';

const TEMPLATE = [
	['core/paragraph', { placeholder: __('Item content…', 'matter') }],
];

export default function Edit({ attributes, setAttributes, context }) {
	const { title, open } = attributes;
	const { postId, postType } = context;
	const level = Math.min(6, Math.max(2, context['matter/headingLevel'] ?? 3));
	const [postTitle] = useEntityProp('postType', postType, 'title', postId);

	const blockProps = useBlockProps({
		className: 'is-open',
	});
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-matter-accordion-item__content' },
		{ template: TEMPLATE }
	);

	// Inside a Query Loop an empty title shows the post title.
	const placeholder =
		postId && postTitle ? postTitle : __('Item title', 'matter');

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'matter')}>
					<ToggleControl
						__nextHasNoMarginBottom
						label={__('Open by default', 'matter')}
						checked={open}
						onChange={(value) => setAttributes({ open: value })}
					/>
				</PanelBody>
			</InspectorControls>
			<div {...blockProps}>
				<RichText
					tagName={`h${level}`}
					className="wp-block-matter-accordion-item__heading wp-block-matter-accordion-item__toggle"
					value={title}
					onChange={(value) => setAttributes({ title: value })}
					placeholder={placeholder}
					allowedFormats={['core/bold', 'core/italic']}
				/>
				<div className="wp-block-matter-accordion-item__panel">
					<div {...innerBlocksProps} />
				</div>
			</div>
		</>
	);
}
