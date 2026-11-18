/**
 * A button with text but no link is marked in the editor ("No link"). On the
 * site WordPress shows it as text nobody can click, which is easy to miss when
 * looking over a page.
 *
 * Not marked: form buttons (`tagName: button`), a link given by a binding,
 * and empty buttons (WordPress leaves those out of the page).
 */

/**
 * WordPress dependencies
 */
import { createHigherOrderComponent } from '@wordpress/compose';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { needsLink } from './needs-link';

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
