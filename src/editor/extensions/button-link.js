/**
 * A button with text but no link is marked in the editor ("No link"), with a
 * line in its sidebar saying how to add one. On the site WordPress shows it as
 * text nobody can click, which is easy to miss when looking over a page.
 *
 * Not marked: form buttons (`tagName: button`), a link given by a binding,
 * and empty buttons (WordPress leaves those out of the page).
 */

/**
 * WordPress dependencies
 */
import { InspectorControls } from '@wordpress/block-editor';
import { Notice } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { needsLink } from './needs-link';

addFilter(
	'editor.BlockEdit',
	'matter/button-link/notice',
	createHigherOrderComponent(
		(BlockEdit) => (props) => {
			if (!needsLink(props.name, props.attributes)) {
				return <BlockEdit {...props} />;
			}

			return (
				<>
					<BlockEdit {...props} />
					<InspectorControls>
						<div className="matter-button-link-notice">
							<Notice status="warning" isDismissible={false}>
								{__(
									'This button doesn’t go anywhere yet. Add a link with the link icon in its toolbar.',
									'matter'
								)}
							</Notice>
						</div>
					</InspectorControls>
				</>
			);
		},
		'withButtonLinkNotice'
	)
);

addFilter(
	'editor.BlockListBlock',
	'matter/button-link/marker',
	createHigherOrderComponent(
		(BlockListBlock) => (props) => {
			if (!needsLink(props.name, props.attributes)) {
				return <BlockListBlock {...props} />;
			}

			return (
				<BlockListBlock
					{...props}
					className={[props.className, 'matter-needs-link']
						.filter(Boolean)
						.join(' ')}
					wrapperProps={{
						...props.wrapperProps,
						'data-matter-hint': __('No link', 'matter'),
					}}
				/>
			);
		},
		'withButtonLinkMarker'
	)
);
