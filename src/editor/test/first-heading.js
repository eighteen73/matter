/**
 * Internal dependencies
 */
import { firstHeading, firstText } from '../first-heading';

const block = (name, attributes = {}, innerBlocks = []) => ({
	name,
	attributes,
	innerBlocks,
});

describe('firstHeading', () => {
	it('finds the first heading, however deep', () => {
		expect(
			firstHeading([
				block('matter/slot', { name: 'media' }, [block('core/image')]),
				block('matter/slot', { name: 'content' }, [
					block('core/paragraph', { content: 'Intro' }),
					block('core/heading', { content: 'The perfect backdrop' }),
					block('core/heading', { content: 'Later' }),
				]),
			])
		).toBe('The perfect backdrop');
	});

	it('skips empty headings', () => {
		expect(
			firstHeading([
				block('core/heading', { content: '' }),
				block('core/heading', { content: 'Filled' }),
			])
		).toBe('Filled');
	});

	it('gives plain, shortened text, not the heading’s HTML', () => {
		expect(
			firstHeading([
				block('core/heading', {
					content: 'The <strong>perfect</strong> backdrop &amp; more',
				}),
			])
		).toBe('The perfect backdrop & more');

		expect(
			firstHeading([
				block('core/heading', {
					content:
						'A <em>very</em> long heading that goes on and on and on past any sensible length',
				}),
			])
		).toBe('A very long heading that goes on and on…');
	});

	it('is empty without a heading', () => {
		expect(firstHeading([block('core/paragraph', { content: 'A' })])).toBe(
			''
		);
	});
});

describe('firstText', () => {
	it('finds the first text, without markup, shortened', () => {
		expect(
			firstText([
				block('matter/slot', { name: 'media' }, [block('core/image')]),
				block('matter/slot', { name: 'content' }, [
					block('core/paragraph', { content: '' }),
					block('core/paragraph', {
						content:
							'“Beautifully <strong>made</strong> furniture that will last for generations.”',
					}),
				]),
			])
		).toBe('“Beautifully made furniture that will…');
	});

	it('keeps short text whole', () => {
		expect(firstText([block('core/paragraph', { content: 'Hi' })])).toBe(
			'Hi'
		);
	});
});
