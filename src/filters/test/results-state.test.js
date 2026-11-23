/**
 * Internal dependencies
 */
import { resultsState } from '../view';

jest.mock(
	'@wordpress/interactivity',
	() => ({
		getConfig: () => ({
			texts: {
				none: 'No results',
				all: { one: '%s result', other: '%s results' },
				showing: {
					one: 'Showing %1$s–%2$s of %3$s result',
					other: 'Showing %1$s–%2$s of %3$s results',
				},
				show: { one: 'Show %s result', other: 'Show %s results' },
			},
		}),
		getContext: () => ({}),
		getElement: () => ({}),
		getServerState: () => ({}),
		store: () => ({ state: {}, actions: {} }),
		withSyncEvent: (callback) => callback,
	}),
	{ virtual: true }
);

jest.mock('../../interactivity/api', () => ({
	emit: jest.fn(),
	registerInstance: jest.fn(),
	registerType: jest.fn(),
}));

describe('resultsState', () => {
	beforeAll(() => {
		document.documentElement.lang = 'en-GB';
	});

	it('words a page of results as the server does', () => {
		expect(resultsState(48, 2, 12)).toEqual({
			total: 48,
			resultsText: 'Showing 13–24 of 48 results',
			showText: 'Show 48 results',
		});
	});

	it('says how many when they fit on one page', () => {
		expect(resultsState(1, 1, 12)).toEqual({
			total: 1,
			resultsText: '1 result',
			showText: 'Show 1 result',
		});
	});

	it('formats numbers for the page language', () => {
		expect(resultsState(10551, 1, 10).resultsText).toBe(
			'Showing 1–10 of 10,551 results'
		);
	});

	it('says when there are none', () => {
		expect(resultsState(0)).toEqual({
			total: 0,
			resultsText: 'No results',
			showText: 'No results',
		});
	});
});
