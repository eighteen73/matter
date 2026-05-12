import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

/**
 * @return {Element} Element to render.
 */
export default function Edit() {
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps({}, {});

	return (
		<div {...blockProps}>
			<div {...innerBlocksProps} />
		</div>
	);
}
