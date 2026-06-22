/**
 * WordPress dependencies
 */
import {
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

/**
 * Initial template applied only when the block is first inserted (i.e. when
 * inner blocks are empty). templateLock is false, so this is never applied to
 * existing blocks that already have tab panels saved.
 */
const TAB_PANELS_TEMPLATE = [
	['matter/tab-panel', { label: __('Tab') }],
	['matter/tab-panel', { label: __('Tab') }],
];

export default function Edit() {
	const blockProps = useBlockProps();

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		template: TAB_PANELS_TEMPLATE,
		templateLock: false,
		renderAppender: false,
	});

	return <div {...innerBlocksProps} />;
}
