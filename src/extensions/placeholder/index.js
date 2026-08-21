/**
 * Placeholder text for Heading and Paragraph (development / staging only).
 */

import { registerBlockExtension } from '../../utils/register-block-extension';

import PlaceholderControl from '../../components/placeholder-control';

/**
 * @param {Object}   props
 * @param {string}   props.name
 * @param {Function} props.setAttributes
 * @return {Element} The component.
 */
function PlaceholderEdit({ name, setAttributes }) {
	const placeholderType = name === 'core/heading' ? 'heading' : 'paragraph';

	return (
		<PlaceholderControl
			placeholderType={placeholderType}
			attribute="content"
			setAttributes={setAttributes}
		/>
	);
}

registerBlockExtension(['core/heading', 'core/paragraph'], {
	extensionName: 'matter/placeholder',
	classNameGenerator: () => null,
	Edit: PlaceholderEdit,
	order: 'after',
});
