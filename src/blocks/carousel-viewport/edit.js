import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

export default function Edit({ attributes }) {
	const { allowedBlocks } = attributes;

	const blockProps = useBlockProps();
	const isSingleInserterEnabled = allowedBlocks && allowedBlocks.length === 1;

	const { children, ...innerBlocksProps } = useInnerBlocksProps(blockProps, {
		orientation: 'horizontal',
		templateLock: false,
		allowedBlocks: isSingleInserterEnabled ? allowedBlocks : null,
		renderAppender: isSingleInserterEnabled ? () => false : undefined,
	});

	return (
		<>
			<div {...innerBlocksProps}>
				<div className="embla__container">{children}</div>
			</div>
		</>
	);
}
