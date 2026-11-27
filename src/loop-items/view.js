/**
 * Loop items (module: matter/loop-items): tells other scripts when a list's
 * loop items change after the page has loaded, so they can set up what they
 * add to them (review stars, tracking), however the list changed: a filter,
 * pagination, Back, or a results provider's HTML (Seek).
 *
 * `matter-loop-items-update` bubbles from the list (the `<ul>` around the
 * items) once per change, with:
 *
 * - `items`: the list's loop items now, in order (an item's position is its
 *   index here, plus the page's offset);
 * - `added`: those that are new to the page (or moved), to set up;
 * - `filled`: a promise that settles once the items' live blocks (prices)
 *   are filled, `true`, or `false` if they weren't after 10 seconds.
 *
 * Items already in the page when it loads are left to the page's load:
 * scripts set them up as they always have.
 *
 *     document.addEventListener( 'matter-loop-items-update', ( event ) => {
 *         event.detail.added.forEach( setUpStars );
 *     } );
 */

/**
 * Internal dependencies
 */
import { emit } from '../interactivity/api';

const ITEM = '.wp-block-matter-loop-item';
const LIVE = 'data-matter-live';

// How long `filled` waits for live blocks.
const FILL_WAIT = 10000;

/**
 * The list an item is in: the closest list around it, else its parent.
 *
 * @param {Element} item Loop item.
 * @return {Element|null} List.
 */
const listOf = (item) =>
	item.parentElement?.closest('ul, ol') ?? item.parentElement;

/**
 * A list's own loop items, in order (not those of a list inside an item).
 *
 * @param {Element} list List.
 * @return {Element[]} Loop items.
 */
const itemsOf = (list) =>
	[...list.querySelectorAll(ITEM)].filter((item) => listOf(item) === list);

/**
 * Loop items in a node: the node itself, or those inside it.
 *
 * @param {Node} node Node.
 * @return {Element[]} Loop items.
 */
const itemsIn = (node) => {
	if (node.nodeType !== 1) {
		return [];
	}

	return node.matches(ITEM) ? [node] : [...node.querySelectorAll(ITEM)];
};

/**
 * The live blocks in items still waiting to be filled.
 *
 * @param {Element[]} items Loop items.
 * @return {Element[]} Placeholders.
 */
const unfilled = (items) =>
	items
		.flatMap((item) => [...item.querySelectorAll(`[${LIVE}]`)])
		.filter(
			(placeholder) =>
				placeholder.dataset.matterFilled !==
				placeholder.getAttribute(LIVE)
		);

/**
 * Settles once the items' live blocks are filled (matter/live marks each
 * with `data-matter-filled` after filling it).
 *
 * @param {Element[]} items Loop items.
 * @return {Promise<boolean>} Whether they were filled in time.
 */
export function filled(items) {
	if (!unfilled(items).length) {
		return Promise.resolve(true);
	}

	return new Promise((resolve) => {
		const observer = new window.MutationObserver(() => {
			if (!unfilled(items).length) {
				done(true);
			}
		});

		const timer = window.setTimeout(() => done(false), FILL_WAIT);

		function done(result) {
			observer.disconnect();
			window.clearTimeout(timer);
			resolve(result);
		}

		items.forEach((item) =>
			observer.observe(item, {
				subtree: true,
				attributes: true,
				attributeFilter: ['data-matter-filled'],
			})
		);
	});
}

// List => loop items added to it, since the last update was sent.
let changed = new Map();
let scheduled = false;

/**
 * Note a list that changed, with any items added to it.
 *
 * @param {Element|null} list  List.
 * @param {Element[]}    added Items added.
 */
const note = (list, added = []) => {
	if (!list) {
		return;
	}

	changed.set(list, [...(changed.get(list) ?? []), ...added]);
};

/**
 * Send an update for each list that changed. In the next task, so a change
 * made in steps (the router's render, then its hydration) is sent once.
 */
const send = () => {
	const lists = changed;

	changed = new Map();
	scheduled = false;

	lists.forEach((added, list) => {
		if (!list.isConnected) {
			return;
		}

		const items = itemsOf(list);

		if (!items.length) {
			return;
		}

		const fresh = [...new Set(added)].filter((item) =>
			items.includes(item)
		);

		emit(list, 'loop-items', 'update', {
			items,
			added: fresh,
			filled: filled(items),
		});
	});
};

const observer = new window.MutationObserver((mutations) => {
	mutations.forEach(({ target, addedNodes, removedNodes }) => {
		[...addedNodes].flatMap(itemsIn).forEach((item) => {
			note(listOf(item), [item]);
		});

		// Items removed (and none added): the list still changed, and
		// positions with it.
		if ([...removedNodes].some((node) => itemsIn(node).length)) {
			note(
				target.nodeType === 1 && target.matches('ul, ol')
					? target
					: target.closest?.('ul, ol')
			);
		}
	});

	if (changed.size && !scheduled) {
		scheduled = true;
		window.setTimeout(send);
	}
});

observer.observe(document.body ?? document.documentElement, {
	childList: true,
	subtree: true,
});
