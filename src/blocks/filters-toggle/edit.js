/**
 * The Filters button in the editor: as it shows on small screens, with the
 * name of the filters it opens. On the front end it's hidden while the
 * filters show inline.
 */

/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Edit({ attributes: { label }, setAttributes }) {
	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Filters button', 'matter')}>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={__('Text', 'matter')}
						value={label}
						placeholder={__('Filters', 'matter')}
						onChange={(value) => setAttributes({ label: value })}
					/>
				</PanelBody>
			</InspectorControls>
			<div {...useBlockProps()}>
				<button
					type="button"
					className="matter-panel-toggle wp-block-matter-filters-toggle__button"
					disabled
				>
					<span className="matter-panel-toggle__label">
						{label || __('Filters', 'matter')}
					</span>
				</button>
			</div>
		</>
	);
}
