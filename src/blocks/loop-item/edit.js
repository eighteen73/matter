/**
 * WordPress dependencies
 */
import {
	store as blockEditorStore,
	useBlockProps,
} from '@wordpress/block-editor';
import { Placeholder, Spinner } from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useServerSideRender } from '@wordpress/server-side-render';

// Rendered items by post ID, for the editor session.
const previews = new Map();

/**
 * The theme's design for the loop item, rendered by the server exactly as on
 * the front end (same wrapper, same markup). There's nothing to edit: the
 * design is the theme's. The preview is inert, so clicks fall through to the
 * loop or carousel around it.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes           Block attributes.
 * @param {string}   props.attributes.itemLabel The post type's name, for List View.
 * @param {Object}   props.context              Block context.
 * @param {number}   props.context.postId       The loop item.
 * @param {string}   props.context.postType     The loop item's post type.
 * @param {Function} props.setAttributes        Attribute setter.
 * @return {Element} Loop item preview.
 */
export default function Edit({
	attributes: { itemLabel },
	context: { postId, postType },
	setAttributes,
}) {
	useItemLabel(postType, itemLabel, setAttributes);

	const { content = '', status } = useServerSideRender({
		block: 'matter/loop-item',
		attributes: {},
		urlQueryArgs: postId ? { post_id: postId } : {},
	});
	// The last render of each item, shown while a remounted preview (e.g.
	// when its loop is selected) fetches again, so slides don't collapse.
	if (postId && status === 'success' && content) {
		previews.set(postId, innerHtml(content));
	}

	const preview = postId ? previews.get(postId) : undefined;
	const hasPreview = preview !== undefined;
	const blockProps = useBlockProps(
		hasPreview
			? { inert: '', dangerouslySetInnerHTML: { __html: preview } }
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
					label={__('Loop item', 'matter')}
					instructions={__(
						"Shows the theme's design for each item in the loop.",
						'matter'
					)}
				/>
			)}
		</div>
	);
}

/**
 * Keeps the `itemLabel` attribute set to the post type's singular name, so
 * List View and the breadcrumb say "Product" or "Post" rather than "Loop
 * item". The attribute is local (never saved) and the change isn't an edit.
 *
 * @param {string}   postType      Post type from context.
 * @param {string}   itemLabel     Current label.
 * @param {Function} setAttributes Attribute setter.
 */
function useItemLabel(postType, itemLabel, setAttributes) {
	const label = useSelect(
		(select) =>
			postType
				? select(coreStore).getPostType(postType)?.labels?.singular_name
				: undefined,
		[postType]
	);
	const { __unstableMarkNextChangeAsNotPersistent } =
		useDispatch(blockEditorStore);

	useEffect(() => {
		if (label && label !== itemLabel) {
			__unstableMarkNextChangeAsNotPersistent();
			setAttributes({ itemLabel: label });
		}
	}, [
		label,
		itemLabel,
		setAttributes,
		__unstableMarkNextChangeAsNotPersistent,
	]);
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

	return wrapper?.classList.contains('wp-block-matter-loop-item')
		? wrapper.innerHTML
		: html;
}
