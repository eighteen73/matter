/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import {
	store as blockEditorStore,
	useBlockProps,
} from '@wordpress/block-editor';
import { Placeholder, Spinner } from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

/**
 * Internal dependencies
 */
import { useInert } from '../../components/use-inert';

// Most items in one request (LoopItem::MAX_PREVIEWS).
const MAX_PER_REQUEST = 100;

// Rendered items by post ID for the editor session: the HTML, or null when
// the item can't be shown (e.g. the user can't read it). Kept so a preview
// that remounts (e.g. when its loop is selected) shows at once.
const previews = new Map();

// Each loading item's request, and the batch still collecting items.
const pending = new Map();
let batch = null;

/**
 * Fetch items' previews, up to 100 per request, into `previews`. Items that
 * aren't returned (or fail) are stored as null.
 *
 * @param {number[]} ids Item IDs.
 * @return {Promise} Settles when every request has.
 */
async function fetchPreviews(ids) {
	const requests = [];

	for (let i = 0; i < ids.length; i += MAX_PER_REQUEST) {
		requests.push(
			apiFetch({
				path: addQueryArgs('/matter/v1/loop-items', {
					ids: ids.slice(i, i + MAX_PER_REQUEST),
				}),
			})
				.then((items) =>
					items.forEach(({ id, html }) => previews.set(id, html))
				)
				.catch(() => {})
		);
	}

	await Promise.all(requests);

	ids.forEach((id) => previews.has(id) || previews.set(id, null));
}

/**
 * Load an item's preview. Items that start loading in the same tick (a
 * carousel's or an archive's) share one request.
 *
 * @param {number} postId Item ID.
 * @return {Promise} Settles once the preview is in `previews`.
 */
function loadPreview(postId) {
	if (!pending.has(postId)) {
		if (!batch) {
			const ids = new Set();

			batch = {
				ids,
				request: new Promise((resolve) => setTimeout(resolve)).then(
					() => {
						batch = null;
						return fetchPreviews([...ids]);
					}
				),
			};
		}

		batch.ids.add(postId);
		pending.set(
			postId,
			batch.request.finally(() => pending.delete(postId))
		);
	}

	return pending.get(postId);
}

/**
 * An item's preview: its HTML, null when it can't be shown, or undefined
 * while it loads.
 *
 * @param {number} postId Item ID.
 * @return {string|null|undefined} Preview.
 */
function usePreview(postId) {
	const [, setLoaded] = useState(0);

	useEffect(() => {
		if (!postId || previews.has(postId)) {
			return;
		}

		let current = true;
		loadPreview(postId).then(() => current && setLoaded((n) => n + 1));

		return () => {
			current = false;
		};
	}, [postId]);

	return postId ? previews.get(postId) : undefined;
}

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

	const preview = usePreview(postId);
	const hasPreview = typeof preview === 'string';
	const blockProps = useBlockProps({
		ref: useInert(),
		...(hasPreview && { dangerouslySetInnerHTML: { __html: preview } }),
	});

	if (hasPreview) {
		return <div {...blockProps} />;
	}

	return (
		<div {...blockProps}>
			{postId ? (
				preview === undefined && <Spinner />
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
