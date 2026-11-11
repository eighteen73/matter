/**
 * Archive content in a template (Site Editor, developers only): the list of
 * posts or products it wraps, with a note that editors add content around it.
 */

/**
 * WordPress dependencies
 */
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

export default function Edit() {
	const blockProps = useBlockProps();
	// On the front end the list is always inside the archive list block's
	// wrapper (see archive-loop/render.php), so the same classes here give it
	// the theme's styles for that band (e.g. its padding and wide width).
	const innerBlocksProps = useInnerBlocksProps(
		{
			className:
				'wp-block-matter-archive-content__loop wp-block-matter-archive-loop alignfull',
		},
		{ templateLock: false }
	);

	return (
		<div {...blockProps}>
			<p className="wp-block-matter-archive-content__note">
				{__(
					'Archive: editors add sections above and below this list in Appearance › Archives.',
					'matter'
				)}
			</p>
			<div {...innerBlocksProps} />
		</div>
	);
}
