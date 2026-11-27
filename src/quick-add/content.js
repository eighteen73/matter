/**
 * Quick add's content documents: what a product's content needs that the
 * page doesn't have yet (its styles, script modules and import map
 * entries), and adding it.
 */

/**
 * A product's quick add content URL: its own URL with the parameter.
 *
 * @param {string} href  Product URL.
 * @param {string} param Query parameter (QuickAdd::PARAM).
 * @return {string} URL.
 */
export function contentUrl(href, param) {
	const url = new URL(href, window.location.href);

	url.hash = '';
	url.searchParams.set(param, '1');

	return url.href;
}

/**
 * A document's import map entries (all its import maps').
 *
 * @param {Document} doc Document.
 * @return {Object<string, string>} Module ID => URL.
 */
export function importMapOf(doc) {
	const imports = {};

	doc.querySelectorAll('script[type="importmap"]').forEach((script) => {
		try {
			Object.assign(
				imports,
				JSON.parse(script.textContent).imports ?? {}
			);
		} catch {
			// An import map that isn't JSON maps nothing.
		}
	});

	return imports;
}

/**
 * Module IDs a document's import map has and the page's doesn't. A page
 * can't add to its import map once modules have loaded, so content needing
 * them can't be shown in place.
 *
 * @param {Document} page Page.
 * @param {Document} doc  Content.
 * @return {string[]} Module IDs.
 */
export function missingImports(page, doc) {
	const have = importMapOf(page);

	return Object.keys(importMapOf(doc)).filter((id) => !(id in have));
}

/**
 * Script modules a document loads that the page hasn't.
 *
 * @param {Document} page Page.
 * @param {Document} doc  Content.
 * @return {string[]} Module URLs.
 */
export function newModules(page, doc) {
	const src = (script) =>
		new URL(script.getAttribute('src'), page.baseURI).href;
	const have = new Set(
		[...page.querySelectorAll('script[type="module"][src]')].map(src)
	);

	return [
		...new Set(
			[...doc.querySelectorAll('script[type="module"][src]')].map(src)
		),
	].filter((url) => !have.has(url));
}

/**
 * A style element's identity: a stylesheet's URL, or inline styles' text
 * (an ID can be the same with different rules: core's block supports).
 *
 * @param {Element} element `link` or `style`.
 * @param {string}  base    URL to resolve against.
 * @return {string} Key.
 */
const styleKey = (element, base) =>
	'LINK' === element.tagName
		? `link:${new URL(element.getAttribute('href'), base).href}`
		: `style:${element.textContent.trim()}`;

const STYLES = 'link[rel="stylesheet"][href],style';

/**
 * Add a document's styles the page doesn't have, each where the document
 * has it relative to the styles they share (so a block's own stylesheet
 * comes before the theme's rules for it, as on its page).
 *
 * @param {Document} page Page.
 * @param {Document} doc  Content.
 * @return {Element[]} The elements added.
 */
export function addStyles(page, doc) {
	const onPage = new Map(
		[...page.querySelectorAll(STYLES)].map((element) => [
			styleKey(element, page.baseURI),
			element,
		])
	);
	const incoming = [...doc.querySelectorAll(STYLES)];
	const added = [];

	incoming.forEach((element, index) => {
		const key = styleKey(element, doc.baseURI || page.baseURI);

		if (onPage.has(key)) {
			return;
		}

		const copy = page.importNode(element, true);

		// Inline styles with the page's ID (core's block supports): kept, as
		// another element.
		if (copy.id && page.getElementById(copy.id)) {
			copy.id = `${copy.id}-quick-add-${added.length}`;
		}

		if ('LINK' === copy.tagName) {
			copy.href = new URL(
				element.getAttribute('href'),
				doc.baseURI || page.baseURI
			).href;
		}

		// Before the first style after it that the page has, else at the end.
		const next = incoming
			.slice(index + 1)
			.map((later) =>
				onPage.get(styleKey(later, doc.baseURI || page.baseURI))
			)
			.find(Boolean);

		if (next?.parentNode) {
			next.parentNode.insertBefore(copy, next);
		} else {
			page.head.append(copy);
		}

		onPage.set(key, copy);
		added.push(copy);
	});

	return added;
}

/**
 * A plain copy of a value (a store's read-only state or config).
 *
 * @param {*} value Value.
 * @return {*} Copy, or undefined.
 */
const plain = (value) => {
	try {
		return value === undefined
			? undefined
			: JSON.parse(JSON.stringify(value));
	} catch {
		return undefined;
	}
};

const isObject = (value) =>
	!!value && 'object' === typeof value && !Array.isArray(value);

/**
 * Two plain objects merged, the second's values winning.
 *
 * @param {Object} base  Base.
 * @param {Object} extra Extra.
 * @return {Object} Merged.
 */
export function merge(base, extra) {
	const merged = { ...base };

	Object.entries(extra ?? {}).forEach(([key, value]) => {
		merged[key] =
			isObject(merged[key]) && isObject(value)
				? merge(merged[key], value)
				: value;
	});

	return merged;
}

/**
 * The Interactivity API data to populate with: the page's current server
 * state and config for every namespace (populating replaces them all), with
 * the content's merged in.
 *
 * @param {Object}   content    The content's data (parseServerData()).
 * @param {string[]} namespaces The namespaces the page and content have.
 * @param {Function} current    Namespace => { state, config } now.
 * @return {Object} Data.
 */
export function mergedData(content, namespaces, current) {
	const data = { state: {}, config: {} };

	namespaces.forEach((namespace) => {
		const now = current(namespace);
		const state = merge(plain(now.state) ?? {}, content.state?.[namespace]);
		const config = merge(
			plain(now.config) ?? {},
			content.config?.[namespace]
		);

		if (Object.keys(state).length) {
			data.state[namespace] = state;
		}

		if (Object.keys(config).length) {
			data.config[namespace] = config;
		}
	});

	if (content.derivedStateClosures) {
		data.derivedStateClosures = content.derivedStateClosures;
	}

	return data;
}
