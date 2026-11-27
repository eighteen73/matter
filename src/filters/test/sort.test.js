/**
 * Internal dependencies
 */
import { chipsOf, urlFor } from '../view';

jest.mock(
	'@wordpress/interactivity',
	() => ({
		getConfig: () => ({}),
		getContext: () => ({}),
		getElement: () => ({}),
		getServerState: () => ({}),
		store: () => ({ state: {}, actions: {} }),
		withScope: (callback) => callback,
		withSyncEvent: (callback) => callback,
	}),
	{ virtual: true }
);

jest.mock('../../interactivity/api', () => ({
	emit: jest.fn(),
	registerInstance: jest.fn(),
	registerType: jest.fn(),
}));

const listing = (sort, colour = []) => ({
	baseUrl: 'https://example.com/shop/',
	filters: {
		sort: {
			kind: 'sort',
			params: { value: 'orderby' },
			values: [sort],
			default: 'menu_order',
			labels: {},
		},
		colour: {
			kind: 'choice',
			params: { value: 'filter_colour' },
			values: colour,
			labels: { red: 'Red' },
		},
	},
});

describe('a sort', () => {
	it('is never an active filter', () => {
		expect(chipsOf(listing('price'))).toEqual([]);
		expect(
			chipsOf(listing('price', ['red'])).map((chip) => chip.label)
		).toEqual(['Red']);
	});

	it('leaves its default out of the URL', () => {
		expect(urlFor(listing('menu_order'))).toBe('https://example.com/shop/');
	});

	it('puts another order in WooCommerce’s parameter', () => {
		expect(urlFor(listing('price-desc', ['red']))).toBe(
			'https://example.com/shop/?orderby=price-desc&filter_colour=red'
		);
	});
});
