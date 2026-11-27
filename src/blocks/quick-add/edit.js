/**
 * Quick add in the editor: its button, the text edited in place (empty:
 * "Quick add"). What it opens is the theme's `quick-add-product` pattern.
 */

/**
 * WordPress dependencies
 */
import { RichText, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

export default function Edit({ attributes: { label }, setAttributes }) {
	return (
		<div {...useBlockProps()}>
			<span className="wp-block-matter-quick-add__button wp-element-button">
				<RichText
					identifier="label"
					tagName="span"
					value={label}
					placeholder={__('Quick add', 'matter')}
					onChange={(value) => setAttributes({ label: value })}
					allowedFormats={[]}
					withoutInteractiveFormatting
					disableLineBreaks
					aria-label={__('Button text', 'matter')}
				/>
			</span>
		</div>
	);
}
