import { useBlockProps } from '@wordpress/block-editor';

/**
 * @return {Element} Element to render.
 */
export default function Edit() {
	const blockProps = useBlockProps();

	return <dialog {...blockProps}></dialog>;
}
