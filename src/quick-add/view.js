/**
 * Quick add (store: matter/quick-add): opens the modal and loads a
 * product's content into it (see Integrations\WooCommerce\QuickAdd).
 *
 * A button is a link to the product. Clicked, the modal opens with a
 * loading status, and the product's content is fetched from its URL with
 * `?matter-quick-add=1` (or taken from a fetch started when the pointer
 * rested on the button, or it was focused, in the last minute). The styles
 * and script modules it needs that the page doesn't have are added, its
 * Interactivity API data merged, and it's rendered into the modal's router
 * region, where its blocks run as on the product page.
 *
 * Rendering into one region, rather than through the router (which would
 * replace the page's other regions: the listing), uses the Interactivity
 * API's private functions the router itself is built on. They may change
 * with WordPress; when they do, or anything else fails (the content needs a
 * module the page's import map doesn't have, it can't be fetched), the
 * button is followed as a link, to the product page.
 *
 * Events `matter-quick-add-open` and `matter-quick-add-load` (`detail.url`,
 * the content's) bubble from the button.
 */

/**
 * WordPress dependencies
 */
import {
	getConfig,
	getElement,
	getServerState,
	privateApis,
	store,
	withSyncEvent,
} from '@wordpress/interactivity';

/**
 * Internal dependencies
 */
import { emit } from '../interactivity/api';
import {
	addStyles,
	contentUrl,
	mergedData,
	missingImports,
	newModules,
} from './content';

const PRIVATE =
	'I acknowledge that using private APIs means my theme or plugin will inevitably break in the next version of WordPress.';

const REGION = 'matter/quick-add';

// How long the pointer rests on a button before its content is fetched.
const INTENT_DELAY = 100;

// How long a fetched content is kept for its button's click.
const KEEP = 60000;

// Content URL => { at, promise }.
const fetched = new Map();

let intent = 0;
let opening = 0;

const config = () => getConfig('matter/quick-add') ?? {};

/**
 * The Interactivity API's private functions, or null when they've changed.
 *
 * @return {Object|null} Functions.
 */
const internals = () => {
	try {
		const api = privateApis(PRIVATE);

		return api?.routerRegions && api.toVdom && api.batch ? api : null;
	} catch {
		return null;
	}
};

/**
 * A product's content, fetched once per minute at most.
 *
 * @param {string} url Content URL.
 * @return {Promise<Document>} Its document.
 */
const load = (url) => {
	const kept = fetched.get(url);

	if (kept && Date.now() - kept.at < KEEP) {
		return kept.promise;
	}

	const promise = window
		.fetch(url, {
			credentials: 'same-origin',
			headers: { Accept: 'text/html' },
		})
		.then((response) => {
			const type = response.headers.get('content-type') ?? '';

			if (!response.ok || !type.includes('text/html')) {
				throw new Error(`Quick add: ${response.status}`);
			}

			return response.text();
		})
		.then((html) =>
			new window.DOMParser().parseFromString(html, 'text/html')
		);

	fetched.set(url, { at: Date.now(), promise });
	promise.catch(() => fetched.delete(url));

	return promise;
};

/**
 * A region's content without the region directive, as the router renders
 * it (cloneRouterRegionContent in @wordpress/interactivity-router).
 *
 * @param {Object}   vdom Region's virtual DOM.
 * @param {Function} h    createElement.
 * @return {Object} Content.
 */
const contentsOf = (vdom, h) => {
	const levels = vdom.props.priorityLevels;
	const at = levels.findIndex((level) => level.includes('router-region'));
	const rest = at !== -1 ? levels.slice(at + 1) : levels;

	return rest.length > 0
		? h(vdom.type, { ...vdom.props, priorityLevels: rest })
		: vdom.props.element;
};

/**
 * Render a product's content into the modal's region.
 *
 * @param {Document} doc Content.
 * @param {Object}   api The Interactivity API's private functions.
 */
async function show(doc, api) {
	const {
		toVdom,
		parseServerData,
		populateServerData,
		routerRegions,
		batch,
		h,
	} = api;
	const source = doc.querySelector(`[data-wp-router-region="${REGION}"]`);
	const missing = missingImports(document, doc);

	if (!source) {
		throw new Error('Quick add: no content');
	}

	if (missing.length) {
		throw new Error(
			`Quick add: modules not in the page's import map: ${missing.join(', ')}`
		);
	}

	addStyles(document, doc);

	await Promise.all(
		newModules(document, doc).map(
			(url) => import(/* webpackIgnore: true */ url)
		)
	);

	const content = parseServerData(doc);
	const page = parseServerData(document);

	// The page's cart (WooCommerce's store) is newer than a fetched one, which
	// may have waited a minute.
	if (page?.state?.woocommerce?.cart) {
		delete content.state?.woocommerce?.cart;
	}

	// Populating replaces every store's server state and config (it's made
	// for a new page), so it's given the page's, with the content's merged in.
	// A store's state itself is only added to, never overwritten.
	const namespaces = new Set([
		...Object.keys(page?.state ?? {}),
		...Object.keys(page?.config ?? {}),
		...Object.keys(content?.state ?? {}),
		...Object.keys(content?.config ?? {}),
		...[...document.querySelectorAll('[data-wp-interactive]')].map(
			(element) => element.getAttribute('data-wp-interactive')
		),
	]);
	const data = mergedData(content, [...namespaces], (namespace) => ({
		state: getServerState(namespace),
		config: getConfig(namespace),
	}));
	const vdom = toVdom(source);

	batch(() => {
		populateServerData(data);
		routerRegions.get(REGION).value = contentsOf(vdom, h);
	});
}

const { state } = store('matter/quick-add', {
	state: {
		isLoading: false,
	},
	actions: {
		/**
		 * Open quick add for the button's product, or leave the click to the
		 * link (a new tab, or quick add can't run here).
		 */
		open: withSyncEvent(function* (event) {
			const api = internals();
			const region = api?.routerRegions.get(REGION);
			const modal = config().modal;

			if (
				!api ||
				!region ||
				!modal ||
				!document.querySelector(
					`[data-wp-router-region="${REGION}"]`
				) ||
				event.defaultPrevented ||
				event.button > 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			) {
				return;
			}

			event.preventDefault();

			const { ref } = getElement();
			const url = contentUrl(ref.href, config().param);
			const overlays = store('matter/overlay');
			const token = ++opening;

			window.clearTimeout(intent);
			state.isLoading = true;
			api.batch(() => {
				// Empty, as the page had it, while this one loads.
				region.value = undefined;
			});
			overlays.actions.open(modal);
			emit(ref, 'quick-add', 'open', { url });

			try {
				const doc = yield load(url);

				// Used once: a later click fetches the visitor's latest.
				fetched.delete(url);

				if (token !== opening) {
					return;
				}

				yield show(doc, api);
				state.isLoading = false;
				emit(ref, 'quick-add', 'load', { url });
			} catch (error) {
				if (token !== opening) {
					return;
				}

				state.isLoading = false;
				overlays.actions.close(modal);
				// eslint-disable-next-line no-console
				console.warn(error);
				window.location.assign(ref.href);
			}
		}),

		/**
		 * Fetch the button's content once the pointer has rested on it.
		 */
		intend() {
			const { ref } = getElement();

			window.clearTimeout(intent);
			intent = window.setTimeout(
				() =>
					load(contentUrl(ref.href, config().param)).catch(() => {}),
				INTENT_DELAY
			);
		},

		/**
		 * The pointer left before its content was fetched.
		 */
		forget() {
			window.clearTimeout(intent);
		},

		/**
		 * Fetch the button's content (it was focused).
		 */
		prefetch() {
			const { ref } = getElement();

			load(contentUrl(ref.href, config().param)).catch(() => {});
		},
	},
});
