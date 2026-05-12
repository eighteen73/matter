import { useBlockProps } from '@wordpress/block-editor';

export default function Edit() {
	const blockProps = useBlockProps({
		className: 'embla__dots',
	});

	return <div {...blockProps}></div>;
}
