/**
 * WordPress dependencies
 */
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

const TAB_PANELS_TEMPLATE = [['matter/tab-panel'], ['matter/tab-panel']];

export default function Edit() {
	const blockProps = useBlockProps();

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		template: TAB_PANELS_TEMPLATE,
		templateLock: false,
		renderAppender: false,
	});

	return <div {...innerBlocksProps} />;
}
