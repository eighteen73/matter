/**
 * The Filters button in the editor: as it shows on small screens, its text
 * edited in place (empty: the filters' name, "Filters"). On the front end
 * it's hidden while the filters show inline.
 */

/**
 * WordPress dependencies
 */
import { RichText, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

export default function Edit({ attributes: { label }, setAttributes }) {
	return (
		<div {...useBlockProps()}>
			<div className="matter-panel-toggle wp-block-matter-filters-toggle__button">
				<RichText
					identifier="label"
					tagName="span"
					className="matter-panel-toggle__label"
					value={label}
					placeholder={__('Filters', 'matter')}
					onChange={(value) => setAttributes({ label: value })}
					allowedFormats={[]}
					withoutInteractiveFormatting
					disableLineBreaks
					aria-label={__('Button text', 'matter')}
				/>
			</div>
		</div>
	);
}
