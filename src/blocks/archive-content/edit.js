/**
 * Archive content in a template (Site Editor, developers only): the list of
 * posts or products it wraps, tagged with where editors add content around
 * it.
 */

/**
 * WordPress dependencies
 */
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

export default function Edit() {
	// Marked, as a button with no link is (editor/canvas.scss): a tag in its
	// corner saying where its content is edited.
	const blockProps = useBlockProps({
		className: 'matter-has-hint',
		'data-matter-hint': __(
			'Editors add sections around this in Appearance › Archives',
			'matter'
		),
	});
	// On the front end the list is always inside the archive list block's
	// wrapper (see archive-loop/render.php), so the same classes here give it
	// the theme's styles for that band (e.g. its padding and wide width).
	const innerBlocksProps = useInnerBlocksProps(
		{
			className:
				'wp-block-matter-archive-content__loop wp-block-matter-archive-loop alignfull',
		},
		// Constrained, as on the front end, so the list can be wide.
		{ templateLock: false, layout: { type: 'constrained' } }
	);

	return (
		<div {...blockProps}>
			<div {...innerBlocksProps} />
		</div>
	);
}
