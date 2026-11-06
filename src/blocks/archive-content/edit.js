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
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-matter-archive-content__loop' },
		{ templateLock: false }
	);

	return (
		<div {...blockProps}>
			<p className="wp-block-matter-archive-content__note">
				{__(
					'Archive content: editors add sections above and below this list in Appearance › Archive content.',
					'matter'
				)}
			</p>
			<div {...innerBlocksProps} />
		</div>
	);
}
