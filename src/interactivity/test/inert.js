/**
 * Making the surroundings of an element inert, and putting back exactly that.
 */
import { inertAround } from '../inert';

const build = () => {
	document.body.innerHTML = `
		<header id="header"><button id="toggle"></button></header>
		<main id="main"></main>
		<div id="panel">
			<div id="backdrop" class="backdrop"></div>
			<div id="content"><nav id="menu"><button id="inside"></button></nav></div>
		</div>
		<script id="script"></script>`;

	return document.getElementById('content');
};

const inert = () =>
	[...document.querySelectorAll('[inert]')].map((element) => element.id);

describe('inertAround', () => {
	it('makes the siblings of the element and its ancestors inert', () => {
		inertAround(build());

		expect(inert().sort()).toEqual(['backdrop', 'header', 'main']);
		expect(document.getElementById('inside').closest('[inert]')).toBeNull();
	});

	it('leaves what it is told to keep, and scripts', () => {
		inertAround(build(), { keep: '.backdrop' });

		expect(inert().sort()).toEqual(['header', 'main']);
	});

	it('stops at the root', () => {
		const content = build();

		inertAround(content, { root: document.getElementById('panel') });

		expect(inert()).toEqual(['backdrop']);
	});

	it('releases only what it made inert', () => {
		const content = build();

		document.getElementById('main').setAttribute('inert', '');

		const release = inertAround(content);

		expect(inert().sort()).toEqual(['backdrop', 'header', 'main']);
		release();
		expect(inert()).toEqual(['main']);
	});

	describe('live regions', () => {
		it('never makes a live region inert', () => {
			const content = build();

			document
				.getElementById('main')
				.insertAdjacentHTML(
					'afterend',
					'<div id="cart" aria-live="polite"></div><p id="status" role="status"></p><p id="alert" role="alert"></p><p id="log" role="log"></p>'
				);

			inertAround(content);

			expect(inert().sort()).toEqual(['backdrop', 'header', 'main']);
		});

		it('makes inert the rest of a sibling that holds a live region', () => {
			const content = build();
			const main = document.getElementById('main');

			main.innerHTML = `
				<article id="article"><p id="text"></p></article>
				<section id="wrap"><div id="announcer" aria-live="polite"></div><p id="more"></p></section>
				<div id="loose"></div>`;

			inertAround(content);

			// The live region, and the chain down to it, stay live.
			expect(inert().sort()).toEqual([
				'article',
				'backdrop',
				'header',
				'loose',
				'more',
			]);
			expect(
				document.getElementById('announcer').closest('[inert]')
			).toBeNull();
		});

		it('releases what it made inert inside such a sibling', () => {
			const content = build();

			document.getElementById('main').innerHTML =
				'<p id="a"></p><div role="status"></div>';

			inertAround(content)();

			expect(inert()).toEqual([]);
		});
	});
});
