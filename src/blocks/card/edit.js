/**
 * WordPress dependencies
 */
import { useBlockProps } from '@wordpress/block-editor';
import { Placeholder, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useServerSideRender } from '@wordpress/server-side-render';

/**
 * The theme's card for the loop item, rendered by the server exactly as on
 * the front end (same wrapper, same markup). There's nothing to edit: the
 * design is the theme's. The preview is inert, so clicks fall through to the
 * loop or carousel around it.
 *
 * @param {Object} props
 * @param {Object} props.context        Block context.
 * @param {number} props.context.postId The loop item.
 * @return {Element} Card preview.
 */
export default function Edit({ context: { postId } }) {
	const { content = '', status } = useServerSideRender({
		block: 'matter/card',
		attributes: {},
		urlQueryArgs: postId ? { post_id: postId } : {},
	});
	const hasPreview = Boolean(postId) && status === 'success' && content;
	const blockProps = useBlockProps(
		hasPreview
			? {
					inert: '',
					dangerouslySetInnerHTML: { __html: innerHtml(content) },
				}
			: {}
	);

	if (hasPreview) {
		return <div {...blockProps} />;
	}

	return (
		<div {...blockProps}>
			{postId ? (
				status !== 'error' && <Spinner />
			) : (
				<Placeholder
					label={__('Card', 'matter')}
					instructions={__(
						"Shows the theme's card for each item in the loop.",
						'matter'
					)}
				/>
			)}
		</div>
	);
}

/**
 * The server output without its own wrapper, which useBlockProps provides.
 *
 * @param {string} html Rendered block.
 * @return {string} Inner HTML.
 */
function innerHtml(html) {
	const template = document.createElement('template');
	template.innerHTML = html.trim();
	const wrapper = template.content.firstElementChild;

	return wrapper?.classList.contains('wp-block-matter-card')
		? wrapper.innerHTML
		: html;
}
