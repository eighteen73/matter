/**
 * Internal dependencies
 */
import {
	addStyles,
	contentUrl,
	importMapOf,
	mergedData,
	missingImports,
	newModules,
} from '../content';

/**
 * A document from HTML.
 *
 * @param {string} head Head HTML.
 * @param {string} body Body HTML.
 * @return {Document} Document.
 */
const docOf = (head, body = '') =>
	new window.DOMParser().parseFromString(
		`<!doctype html><html><head>${head}</head><body>${body}</body></html>`,
		'text/html'
	);

describe('contentUrl', () => {
	it('adds the parameter to the product URL, without its hash', () => {
		expect(
			contentUrl(
				'https://example.com/product/ball/?ref=1#reviews',
				'matter-quick-add'
			)
		).toBe('https://example.com/product/ball/?ref=1&matter-quick-add=1');
	});
});

describe('import maps and modules', () => {
	const map = (imports) =>
		`<script type="importmap">${JSON.stringify({ imports })}</script>`;

	it('reads every import map', () => {
		const doc = docOf(map({ a: '/a.js' }) + map({ b: '/b.js' }));

		expect(importMapOf(doc)).toEqual({ a: '/a.js', b: '/b.js' });
	});

	it('names the module IDs the page has no entry for', () => {
		const page = docOf(map({ a: '/a.js', b: '/b.js' }));
		const doc = docOf(map({ b: '/b.js', c: '/c.js' }));

		expect(missingImports(page, doc)).toEqual(['c']);
	});

	it('names the modules the page has not loaded', () => {
		const page = document.implementation.createHTMLDocument('');
		const doc = document.implementation.createHTMLDocument('');

		page.head.innerHTML =
			'<script type="module" src="https://example.com/a.js?ver=1"></script>';
		doc.head.innerHTML =
			'<script type="module" src="https://example.com/a.js?ver=1"></script><script type="module" src="https://example.com/b.js?ver=1"></script><script type="module" src="https://example.com/b.js?ver=1"></script><script type="module">inline()</script>';

		expect(newModules(page, doc)).toEqual([
			'https://example.com/b.js?ver=1',
		]);
	});
});

describe('addStyles', () => {
	it('adds what the page lacks, in the content’s order around shared styles', () => {
		const page = document.implementation.createHTMLDocument('');

		page.head.innerHTML =
			'<link rel="stylesheet" href="https://example.com/library.css"><link rel="stylesheet" href="https://example.com/theme.css">';

		const doc = docOf(
			'<link rel="stylesheet" href="https://example.com/library.css"><link rel="stylesheet" href="https://example.com/gallery.css"><style id="gallery-inline-css">.g{}</style><link rel="stylesheet" href="https://example.com/theme.css"><link rel="stylesheet" href="https://example.com/late.css">'
		);

		const added = addStyles(page, doc);

		expect(added).toHaveLength(3);
		expect(
			[...page.head.children].map(
				(element) => element.getAttribute('href') ?? `#${element.id}`
			)
		).toEqual([
			'https://example.com/library.css',
			'https://example.com/gallery.css',
			'#gallery-inline-css',
			'https://example.com/theme.css',
			'https://example.com/late.css',
		]);
	});

	it('keeps inline styles that share an ID but not their rules, once', () => {
		const page = document.implementation.createHTMLDocument('');

		page.head.innerHTML =
			'<style id="core-block-supports-inline-css">.a{}</style>';

		const doc = docOf(
			'<style id="core-block-supports-inline-css">.b{}</style>'
		);

		addStyles(page, doc);
		addStyles(page, doc);

		const styles = [...page.head.querySelectorAll('style')];

		expect(styles.map((style) => style.textContent)).toEqual([
			'.a{}',
			'.b{}',
		]);
		expect(new Set(styles.map((style) => style.id)).size).toBe(2);
	});
});

describe('mergedData', () => {
	it('keeps every namespace the page has, with the content merged in', () => {
		const current = (namespace) =>
			({
				'matter/quick-add': { config: { modal: 'matter-quick-add' } },
				'matter/filters': {
					state: { listings: { 1: { total: 64 } } },
					config: {},
				},
				'woocommerce/products': {
					state: { products: { 1: { name: 'One' } } },
				},
			})[namespace] ?? {};

		const content = {
			state: {
				'woocommerce/products': { products: { 2: { name: 'Two' } } },
				'woocommerce/add-to-cart-with-options': { isFormValid: false },
			},
			config: { woocommerce: { nonce: 'x' } },
			derivedStateClosures: { 'woocommerce/products': ['state.x'] },
		};

		expect(
			mergedData(
				content,
				[
					'matter/quick-add',
					'matter/filters',
					'woocommerce/products',
					'woocommerce/add-to-cart-with-options',
					'woocommerce',
				],
				current
			)
		).toEqual({
			state: {
				'matter/filters': { listings: { 1: { total: 64 } } },
				'woocommerce/products': {
					products: { 1: { name: 'One' }, 2: { name: 'Two' } },
				},
				'woocommerce/add-to-cart-with-options': { isFormValid: false },
			},
			config: {
				'matter/quick-add': { modal: 'matter-quick-add' },
				woocommerce: { nonce: 'x' },
			},
			derivedStateClosures: { 'woocommerce/products': ['state.x'] },
		});
	});
});
