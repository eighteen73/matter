/**
 * Internal dependencies
 */
import { firstHeading } from '../first-heading';

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

	it('is empty without a heading', () => {
		expect(firstHeading([block('core/paragraph', { content: 'A' })])).toBe(
			''
		);
	});
});
