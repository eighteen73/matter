/**
 * Making the surroundings of an element inert, and putting back exactly that.
 */
import { inertAround, onModal, suspendForModal } from '../inert';

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

	describe('a modal over the held page', () => {
		const withDialog = () => {
			const content = build();

			document
				.getElementById('main')
				.insertAdjacentHTML(
					'beforeend',
					'<section id="section"><dialog id="dialog"></dialog></section><p id="other"></p>'
				);

			return content;
		};

		it('lets go of what holds the dialog, and puts it back', () => {
			inertAround(withDialog());

			expect(
				document.getElementById('dialog').closest('[inert]')
			).not.toBeNull();

			const resume = suspendForModal(document.getElementById('dialog'));

			expect(
				document.getElementById('dialog').closest('[inert]')
			).toBeNull();
			// What doesn't hold the dialog stays inert.
			expect(inert()).toContain('header');
			resume();
			expect(
				document.getElementById('dialog').closest('[inert]')
			).not.toBeNull();
		});

		it("doesn't put back what its holder released meanwhile", () => {
			const release = inertAround(withDialog());
			const resume = suspendForModal(document.getElementById('dialog'));

			release();
			resume();

			expect(inert()).toEqual([]);
		});

		it('pauses and resumes what registered for a modal', () => {
			const resumeTrap = jest.fn();
			const pause = jest.fn(() => resumeTrap);
			const stop = onModal(pause);
			const dialog = withDialog() && document.getElementById('dialog');
			const resume = suspendForModal(dialog);

			expect(pause).toHaveBeenCalledWith(dialog);
			expect(resumeTrap).not.toHaveBeenCalled();
			resume();
			expect(resumeTrap).toHaveBeenCalled();

			stop();
			suspendForModal(dialog)();
			expect(pause).toHaveBeenCalledTimes(1);
		});
	});

	describe('several holders', () => {
		it('keeps an element inert until the last holder lets go, in any order', () => {
			const content = build();
			const first = inertAround(content);
			const second = inertAround(content);

			expect(inert().sort()).toEqual(['backdrop', 'header', 'main']);
			first();
			expect(inert().sort()).toEqual(['backdrop', 'header', 'main']);
			second();
			expect(inert()).toEqual([]);

			// Last in, first out gives the same.
			const a = inertAround(content);
			const b = inertAround(content);

			b();
			expect(inert().sort()).toEqual(['backdrop', 'header', 'main']);
			a();
			expect(inert()).toEqual([]);
		});

		it('leaves what was inert before any holder, whatever they do', () => {
			const content = build();

			document.getElementById('main').setAttribute('inert', '');

			const first = inertAround(content);
			const second = inertAround(content);

			second();
			first();
			expect(inert()).toEqual(['main']);
		});

		it('keeps a holder that is released twice from freeing another', () => {
			const content = build();
			const first = inertAround(content);
			const second = inertAround(content);

			first();
			first();
			expect(inert().sort()).toEqual(['backdrop', 'header', 'main']);
			second();
			expect(inert()).toEqual([]);
		});

		it('can hold the page around an element inside what another holds', () => {
			build();

			document.getElementById('main').innerHTML =
				'<div id="second"><button id="second-inside"></button></div><div id="aside"></div>';

			// The first holds around the first panel: `main` is inert.
			const first = inertAround(document.getElementById('content'));
			const second = inertAround(document.getElementById('second'));

			expect(
				document.getElementById('second-inside').closest('[inert]')
			).toBeNull();
			expect(document.getElementById('aside').hasAttribute('inert')).toBe(
				true
			);

			second();
			// Back to the first holder's page: all of it inert again.
			expect(document.getElementById('main').hasAttribute('inert')).toBe(
				true
			);
			first();
			expect(inert()).toEqual([]);
		});
	});

	describe('a failure part-way', () => {
		it('releases what it had made inert, and throws', () => {
			const content = build();
			const main = document.getElementById('main');

			main.setAttribute = () => {
				throw new Error('boom');
			};

			expect(() => inertAround(content)).toThrow('boom');
			expect(inert()).toEqual([]);

			// Nothing is left counted: a later hold works.
			delete main.setAttribute;
			inertAround(content)();
			expect(inert()).toEqual([]);
		});
	});

	describe('modal and top-layer UI', () => {
		it("doesn't make a modal or an open dialog inert", () => {
			const content = build();

			document
				.getElementById('main')
				.insertAdjacentHTML(
					'afterend',
					'<div id="consent" role="dialog" aria-modal="true"></div><dialog id="notice" open></dialog><dialog id="closed"></dialog>'
				);

			inertAround(content);

			// A closed dialog isn't shown, so it's held like anything else.
			expect(inert().sort()).toEqual([
				'backdrop',
				'closed',
				'header',
				'main',
			]);
		});

		it('leaves a modal inside a sibling that holds one alone too', () => {
			const content = build();

			document.getElementById('main').innerHTML =
				'<p id="text"></p><div id="wrap"><div id="cookie" aria-modal="true"></div></div>';

			inertAround(content);

			expect(
				document.getElementById('cookie').closest('[inert]')
			).toBeNull();
		});
	});
});
