/**
 * WordPress dependencies
 */
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function Save() {
	const blockProps = useBlockProps.save();

	return (
		<div {...blockProps}>
			<div className="wp-block-matter-tab-list__list" role="tablist">
				<InnerBlocks.Content />
			</div>
		</div>
	);
}
