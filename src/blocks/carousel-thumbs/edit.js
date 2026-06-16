import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

import './editor.scss';

export default function Edit() {
	const blockProps = useBlockProps({
		className: 'embla__thumbs',
	});

	const { children, ...innerBlocksProps } = useInnerBlocksProps(blockProps, {
		orientation: 'horizontal',
		templateLock: false,
		renderAppender: false,
	});

	return (
		<div {...innerBlocksProps}>
			<div className="embla__thumbs__viewport">
				<div className="embla__thumbs__container">{children}</div>
			</div>
		</div>
	);
}
