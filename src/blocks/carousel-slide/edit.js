import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

import './editor.scss';
export default function Edit() {
	const blockProps = useBlockProps({
		className: 'embla__slide',
	});

	const innerBlocksProps = useInnerBlocksProps(blockProps);

	return <div {...innerBlocksProps} />;
}
