/**
 * Internal dependencies
 */
import { needsLink } from '../needs-link';

describe('needsLink', () => {
	it('marks a button with text and no link', () => {
		expect(needsLink('core/button', { text: 'See all' })).toBe(true);
		expect(
			needsLink('core/button', { text: { toString: () => '<b>Go</b>' } })
		).toBe(true);
	});

	it('leaves linked, bound, form and empty buttons alone', () => {
		expect(needsLink('core/button', { text: 'Go', url: '/shop/' })).toBe(
			false
		);
		expect(
			needsLink('core/button', {
				text: 'Go',
				metadata: { bindings: { url: { source: 'core/post-data' } } },
			})
		).toBe(false);
		expect(
			needsLink('core/button', { text: 'Send', tagName: 'button' })
		).toBe(false);
		expect(needsLink('core/button', { text: '' })).toBe(false);
		expect(needsLink('core/button', { text: ' &nbsp;<br>' })).toBe(false);
		expect(needsLink('core/button', {})).toBe(false);
	});

	it('leaves other blocks alone', () => {
		expect(needsLink('core/paragraph', { text: 'Hi' })).toBe(false);
	});
});
