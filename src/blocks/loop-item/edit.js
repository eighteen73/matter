/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import {
	store as blockEditorStore,
	useBlockProps,
} from '@wordpress/block-editor';
import { Button, Placeholder, Spinner } from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

/**
 * Internal dependencies
 */
import { useInert } from '../../components/use-inert';
import boundedMap from '../../components/bounded-map';

// Most items in one request (LoopItem::MAX_PREVIEWS).
const MAX_PER_REQUEST = 100;

// Where each kind of item is rendered: posts, and a Terms Query's terms.
const ROUTES = {
	post: '/matter/v1/loop-items',
	term: '/matter/v1/loop-items/terms',
};

// Loop templates whose items are posts. A loop item in one of these, even
// inside a term's design, is a post.
const POST_LOOPS = ['core/post-template', 'woocommerce/product-template'];

// Rendered items by kind, block and ID (`post:carousel:12`) for the editor
// session: the HTML, or null when the item can't be shown (e.g. the user
// can't read it). Kept so a preview that remounts (e.g. when its loop is
// selected) shows at once.
const previews = boundedMap(500);

// Items whose request failed (e.g. a network error): not cached, so they can
// be tried again. Trying again retries every failed item (they failed
// together), so mounted previews are told to reload.
const failed = new Set();
const reloaders = new Set();

const retryFailed = () => {
	failed.clear();
	reloaders.forEach((reload) => reload());
};

// Accordions and tabs of posts show the server's rendering of the whole
// query (preview-edit.js); the query's own items are hidden, so their loop
// items load nothing.
const HIDDEN_IN = ['accordion', 'tabs'];

// Each loading item's request, and per kind and block the batch still
// collecting.
const pending = new Map();
const batches = new Map();

const keyOf = (kind, block, id) => `${kind}:${block}:${id}`;

/**
 * Fetch items' previews (in a displayed query's block), up to 100 per request, into `previews`.
 * Items that aren't returned (or fail) are stored as null.
 *
 * @param {string}   kind  `post` or `term`.
 * @param {string}   block The block its query is shown as (empty for none).
 * @param {number[]} ids   Item IDs.
 * @return {Promise} Settles when every request has.
 */
async function fetchPreviews(kind, block, ids) {
	const requests = [];

	for (let i = 0; i < ids.length; i += MAX_PER_REQUEST) {
		const chunk = ids.slice(i, i + MAX_PER_REQUEST);

		requests.push(
			apiFetch({
				path: addQueryArgs(ROUTES[kind], {
					ids: chunk,
					...(block && { block }),
				}),
			})
				.then((items) => {
					items.forEach(({ id, html }) =>
						previews.set(keyOf(kind, block, id), html)
					);

					// Not returned: the item can't be shown.
					chunk.forEach(
						(id) =>
							previews.has(keyOf(kind, block, id)) ||
							previews.set(keyOf(kind, block, id), null)
					);
				})
				.catch(() =>
					chunk.forEach((id) => failed.add(keyOf(kind, block, id)))
				)
		);
	}

	await Promise.all(requests);
}

/**
 * Load an item's preview. Items of a kind for the same block that start
 * loading in the same tick (a carousel's or an archive's) share one request.
 *
 * @param {string} kind  `post` or `term`.
 * @param {string} block The block its query is shown as (empty for none).
 * @param {number} id    Item ID.
 * @return {Promise} Settles once the preview is in `previews`.
 */
function loadPreview(kind, block, id) {
	const key = keyOf(kind, block, id);
	const batchKey = `${kind}:${block}`;

	if (!pending.has(key)) {
		if (!batches.has(batchKey)) {
			const ids = new Set();

			batches.set(batchKey, {
				ids,
				request: new Promise((resolve) => setTimeout(resolve)).then(
					() => {
						batches.delete(batchKey);
						return fetchPreviews(kind, block, [...ids]);
					}
				),
			});
		}

		const batch = batches.get(batchKey);

		batch.ids.add(id);
		pending.set(
			key,
			batch.request.finally(() => pending.delete(key))
		);
	}

	return pending.get(key);
}

/**
 * An item's preview: its HTML, null when it can't be shown, false when it
 * failed to load (with a retry), or undefined while it loads.
 *
 * @param {string} kind  `post` or `term`.
 * @param {string} block The block its query is shown as (empty for none).
 * @param {number} id    Item ID.
 * @return {{preview: string|null|false|undefined, retry: Function}} Preview.
 */
function usePreview(kind, block, id) {
	const [attempt, setLoaded] = useState(0);
	const key = keyOf(kind, block, id);
	const isHidden = HIDDEN_IN.includes(block);

	useEffect(() => {
		if (!id || isHidden || previews.has(key) || failed.has(key)) {
			return;
		}

		let current = true;
		loadPreview(kind, block, id).then(
			() => current && setLoaded((n) => n + 1)
		);

		return () => {
			current = false;
		};
	}, [kind, block, id, key, isHidden, attempt]);

	useEffect(() => {
		const reload = () => setLoaded((n) => n + 1);

		reloaders.add(reload);

		return () => reloaders.delete(reload);
	}, []);

	const retry = retryFailed;

	if (!id || isHidden) {
		return { preview: undefined, retry };
	}

	return { preview: failed.has(key) ? false : previews.get(key), retry };
}

/**
 * The theme's design for the loop item, rendered by the server exactly as on
 * the front end (same wrapper, same markup). There's nothing to edit: the
 * design is the theme's. The preview is inert, so clicks fall through to the
 * loop or carousel around it.
 *
 * In a Terms Query's term template the item is the term (`termId` wins over
 * the page's `postId`), unless a Query Loop inside is the innermost loop.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes               Block attributes.
 * @param {string}   props.attributes.itemLabel     The post type's (or taxonomy's) name, for List View.
 * @param {Object}   props.context                  Block context.
 * @param {number}   props.context.postId           The loop item.
 * @param {string}   props.context.postType         The loop item's post type.
 * @param {number}   props.context.termId           The loop item, in a Terms Query.
 * @param {string}   props.context.taxonomy         The term's taxonomy.
 * @param {Object}   props.context.'matter/display' The query's display (carousel, accordion or tabs), if any.
 * @param {string}   props.clientId                 Block client ID.
 * @param {Function} props.setAttributes            Attribute setter.
 * @return {Element} Loop item preview.
 */
export default function Edit({
	attributes: { itemLabel },
	context: { postId, postType, termId, taxonomy, 'matter/display': display },
	clientId,
	setAttributes,
}) {
	const isInPostLoop = useSelect(
		(select) => {
			const { getBlockName, getBlockParentsByBlockName } =
				select(blockEditorStore);
			const [innermost] = getBlockParentsByBlockName(
				clientId,
				[...POST_LOOPS, 'core/term-template'],
				true
			);

			return !!innermost && POST_LOOPS.includes(getBlockName(innermost));
		},
		[clientId]
	);
	const isTerm = !!termId && !isInPostLoop;

	useItemLabel(
		isTerm ? 'taxonomy' : 'postType',
		isTerm ? taxonomy : postType,
		itemLabel,
		setAttributes
	);

	// The block its query is shown as, if any, from the query's context.
	const block = display?.type ?? '';
	const { preview, retry } = usePreview(
		isTerm ? 'term' : 'post',
		block,
		isTerm ? termId : postId
	);
	const hasPreview = typeof preview === 'string';
	const blockProps = useBlockProps({
		ref: useInert(),
		...(hasPreview && { dangerouslySetInnerHTML: { __html: preview } }),
	});

	if (hasPreview) {
		return <div {...blockProps} />;
	}

	if (preview === false) {
		return (
			<div {...blockProps}>
				<Placeholder
					label={__('Loop item', 'matter')}
					instructions={__(
						"The preview couldn't be loaded.",
						'matter'
					)}
				>
					<Button variant="secondary" onClick={retry}>
						{__('Try again', 'matter')}
					</Button>
				</Placeholder>
			</div>
		);
	}

	return (
		<div {...blockProps}>
			{(isTerm ? termId : postId) ? (
				preview === undefined &&
				!HIDDEN_IN.includes(block) && <Spinner />
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
 * Keeps the `itemLabel` attribute set to the post type's (or taxonomy's)
 * singular name, so List View and the breadcrumb say "Product", "Post" or
 * "Category" rather than "Loop item". The attribute is local (never saved)
 * and the change isn't an edit.
 *
 * @param {string}   kind          `postType` or `taxonomy`.
 * @param {string}   name          Post type or taxonomy from context.
 * @param {string}   itemLabel     Current label.
 * @param {Function} setAttributes Attribute setter.
 */
function useItemLabel(kind, name, itemLabel, setAttributes) {
	const label = useSelect(
		(select) =>
			name
				? select(coreStore).getEntityRecord('root', kind, name)?.labels
						?.singular_name
				: undefined,
		[kind, name]
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
