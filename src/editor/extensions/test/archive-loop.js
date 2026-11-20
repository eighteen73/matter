/**
 * Internal dependencies
 */
import { withArchiveLoopOnlyInEntries } from '../archive-loop';

describe('withArchiveLoopOnlyInEntries', () => {
	const loop = { name: 'matter/archive-loop' };

	it('allows the Archive list in an archive entry only', () => {
		expect(withArchiveLoopOnlyInEntries(true, loop, 'matter_archive')).toBe(
			true
		);
		expect(withArchiveLoopOnlyInEntries(true, loop, 'page')).toBe(false);
		expect(withArchiveLoopOnlyInEntries(true, loop, 'wp_template')).toBe(
			false
		);
		expect(withArchiveLoopOnlyInEntries(true, loop, undefined)).toBe(false);
	});

	it('does not allow what was already refused, or touch other blocks', () => {
		expect(
			withArchiveLoopOnlyInEntries(false, loop, 'matter_archive')
		).toBe(false);
		expect(
			withArchiveLoopOnlyInEntries(
				true,
				{ name: 'core/paragraph' },
				'page'
			)
		).toBe(true);
	});
});
