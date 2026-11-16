/**
 * Internal dependencies
 */
import { withSlotOnly } from '../slot-only';

describe('withSlotOnly', () => {
	it('limits a slot-only block to the sections that allow it', () => {
		expect(
			withSlotOnly({ title: 'Icon' }, 'core/icon', {
				'core/icon': ['pulsar/card', 'pulsar/cta'],
			})
		).toEqual({ title: 'Icon', ancestor: ['pulsar/card', 'pulsar/cta'] });
	});

	it('adds the sections to an ancestor the block already has', () => {
		expect(
			withSlotOnly({ ancestor: ['core/query'] }, 'core/x', {
				'core/x': ['pulsar/card', 'core/query'],
			}).ancestor
		).toEqual(['core/query', 'pulsar/card']);
	});

	it('leaves other blocks alone', () => {
		const settings = { title: 'Paragraph' };

		expect(withSlotOnly(settings, 'core/paragraph', {})).toBe(settings);
		expect(withSlotOnly(settings, 'core/paragraph')).toBe(settings);
	});
});
