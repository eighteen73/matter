/**
 * Live blocks (module: matter/live): fills the placeholders a page or
 * a card holds for blocks whose output can't be shared (a price that depends
 * on who is looking, a stock level), with the visitor's own, current, from `GET matter/v1/live?ids[]=…` (see
 * Live\Live).
 *
 * A placeholder, `<div data-matter-live="12:0">`, is item 12's first
 * live block. Its contents are filled; the element itself stays, so the
 * Interactivity router, which may have rendered it, still recognises it. New
 * placeholders (a router navigation, a results provider's cards) and changed
 * ones are filled as they appear.
 *
 * What's fetched is kept until it expires (the server says when: the next
 * scheduled price change, at most a few minutes), so a placeholder seen again
 * fills at once. Other modules can fill or fetch ahead:
 *
 *     import { fill, prefetch } from 'matter/live';
 *     await prefetch( [ 12, 13 ] );
 */

/**
 * WordPress dependencies
 */
import { getConfig } from '@wordpress/interactivity';

const ATTRIBUTE = 'data-matter-live';

// Most items in one request (Live::MAX_ITEMS).
const MAX_PER_REQUEST = 100;

// Post ID => { blocks: string[], expires: ms }.
const items = new Map();

// Post ID => the request fetching it.
const pending = new Map();

const config = () => getConfig('matter/live') ?? {};

let nonce = '';

/**
 * A fetched item, if it hasn't expired.
 *
 * @param {number} id Post ID.
 * @return {Object|undefined} Item.
 */
const fresh = (id) => {
	const item = items.get(id);

	return item && item.expires > Date.now() ? item : undefined;
};

/**
 * Fetch items' live blocks (those not fetched yet, or expired).
 *
 * @param {number[]} ids Post IDs.
 * @return {Promise<void>} Settles once they're fetched (or failed).
 */
export async function prefetch(ids) {
	const wanted = [...new Set(ids.map(Number))].filter(
		(id) => id > 0 && !fresh(id)
	);
	const needed = wanted.filter((id) => !pending.has(id));
	const requests = [];

	for (let i = 0; i < needed.length; i += MAX_PER_REQUEST) {
		const chunk = needed.slice(i, i + MAX_PER_REQUEST);
		const request = fetchItems(chunk).finally(() =>
			chunk.forEach((id) => pending.delete(id))
		);

		chunk.forEach((id) => pending.set(id, request));
		requests.push(request);
	}

	await Promise.all([
		...requests,
		...wanted.map((id) => pending.get(id)).filter(Boolean),
	]);
}

/**
 * Request a chunk of items. A logged-in visitor without a nonce (on a cached
 * page) is refused with one, then asks again.
 *
 * @param {number[]} ids     Post IDs.
 * @param {boolean}  isRetry Whether this is the retry with a nonce.
 * @return {Promise<void>} Settles once stored.
 */
async function fetchItems(ids, isRetry = false) {
	const { endpoint, version = '' } = config();

	if (!endpoint) {
		return;
	}

	const url = new URL(endpoint, window.location.href);

	ids.forEach((id) => url.searchParams.append('ids[]', id));
	url.searchParams.set('v', version);

	const headers = {};
	const sent = nonce || config().nonce;

	if (sent) {
		headers['X-WP-Nonce'] = sent;
	}

	try {
		const response = await window.fetch(url, {
			credentials: 'same-origin',
			headers,
		});
		const body = await response.json();

		if (
			response.status === 403 &&
			body?.code === 'matter_live_nonce' &&
			body?.data?.nonce &&
			!isRetry
		) {
			nonce = body.data.nonce;
			await fetchItems(ids, true);
			return;
		}

		if (!response.ok) {
			return;
		}

		const expires = Number(body.expires) * 1000 || Date.now() + 60000;

		Object.entries(body.items ?? {}).forEach(([id, blocks]) =>
			items.set(Number(id), { blocks: blocks ?? [], expires })
		);
	} catch {
		// Placeholders stay empty: never a wrong price.
	}
}

/**
 * Fill a placeholder from what's fetched.
 *
 * @param {Element} placeholder Placeholder.
 * @return {boolean} Whether it was filled.
 */
function fillOne(placeholder) {
	const key = placeholder.getAttribute(ATTRIBUTE) ?? '';
	const item = fresh(Number(key.split(':')[0]));

	if (!item) {
		return false;
	}

	const index = Number(key.split(':')[1]);

	if (placeholder.dataset.matterFilled !== key) {
		placeholder.innerHTML = item.blocks[index] ?? '';
		placeholder.dataset.matterFilled = key;
	}

	placeholder.removeAttribute('aria-busy');

	return true;
}

/**
 * Fill the placeholders in an element (the page by default), fetching what
 * they need.
 *
 * @param {Element|Document} root Where to look.
 * @return {Promise<void>} Settles once they're filled.
 */
export async function fill(root = document) {
	const placeholders = [...root.querySelectorAll(`[${ATTRIBUTE}]`)];
	const missing = placeholders.filter((placeholder) => !fillOne(placeholder));

	if (!missing.length) {
		return;
	}

	await prefetch(
		missing.map((placeholder) =>
			Number(placeholder.getAttribute(ATTRIBUTE).split(':')[0])
		)
	);

	missing.forEach(fillOne);
}

// Placeholders that appear or change later (a router navigation) are filled
// too, in one batch per change.
let scheduled = false;

const observer = new window.MutationObserver((mutations) => {
	const relevant = mutations.some(
		({ type, target, addedNodes }) =>
			(type === 'attributes' && target.hasAttribute?.(ATTRIBUTE)) ||
			[...addedNodes].some(
				(node) =>
					node.nodeType === 1 &&
					(node.hasAttribute(ATTRIBUTE) ||
						node.querySelector(`[${ATTRIBUTE}]`))
			)
	);

	if (relevant && !scheduled) {
		scheduled = true;
		window.queueMicrotask(() => {
			scheduled = false;
			fill();
		});
	}
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true,
	attributes: true,
	attributeFilter: [ATTRIBUTE],
});

fill();
