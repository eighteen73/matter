/**
 * Filters (store: matter/filters): filter blocks for a listing (a Query Loop,
 * or a Product Collection with the WooCommerce integration).
 *
 * The filter state is the URL: each filter's source owns its parameters
 * (`filter_category=news,events`, `min_price=10`), so the server renders the
 * same listing however it's reached. A change of filters builds that URL and
 * goes there:
 *
 * 1. through a results provider, if one is registered and answers (e.g.
 *    Seek, searching Meilisearch from the browser), whose HTML the
 *    Interactivity router renders and hydrates as if it were the server's;
 * 2. otherwise through the router, which fetches the page and updates the
 *    listing's query block (its one router region), filters included.
 *
 * Providers register with `registerProvider()`, exported from this module
 * (`matter/filters`). A provider is given `{ url, listing, filters }` and
 * returns `{ html }` (a page with the listing's region) or nothing, to leave
 * it to the next provider and finally the router.
 *
 * `matter.filters( target )` returns a listing's instance: `selection`,
 * `set( filterId, values )` and `clear()`. Events `matter-filters-ready` and
 * `matter-filters-change` (with `detail.url`) bubble from the filters block.
 */

/**
 * WordPress dependencies
 */
import {
	getConfig,
	getContext,
	getElement,
	getServerState,
	store,
	withSyncEvent,
} from '@wordpress/interactivity';

/**
 * Internal dependencies
 */
import { emit, registerInstance, registerType } from '../interactivity/api';

const SELECTOR = '.wp-block-matter-filters';

registerType('filters', SELECTOR);

const providers = [];

/**
 * Register a results provider, tried before the router fetches the page.
 *
 * @param {Function} provider Given `{ url, listing, filters }`, returns (or
 *                            resolves to) `{ html }` or nothing.
 */
export function registerProvider(provider) {
	if (typeof provider === 'function' && !providers.includes(provider)) {
		providers.push(provider);
	}
}

/**
 * A chip: `key`, `filter`, `value`, `label` and `removeText` (its remove
 * button's name).
 *
 * @param {string} filter Filter ID.
 * @param {string} value  Value (`range` for a range).
 * @param {string} label  Name.
 * @return {Object} Chip.
 */
const chip = (filter, value, label) => ({
	key: `${filter}:${value}`,
	filter,
	value,
	label,
	removeText: (getConfig('matter/filters').removeText ?? '%s').replace(
		'%s',
		label
	),
});

/**
 * A range's chip label from its source's templates (`rangeLabels`), as the
 * server words it ("Up to £20"), or null without them.
 *
 * @param {Object} filter Filter state.
 * @return {string|null} Label.
 */
function rangeLabel(filter) {
	const labels = filter.rangeLabels;

	if (!labels) {
		return null;
	}

	const amount = (value) => {
		const number = Number(value);
		const [whole, fraction] = number
			.toFixed(Number.isInteger(number) ? 0 : (labels.decimals ?? 2))
			.split('.');
		const grouped = whole.replace(
			/\B(?=(\d{3})+(?!\d))/g,
			labels.thousand ?? ''
		);

		return (labels.amount ?? '%s').replace(
			'%s',
			fraction ? `${grouped}${labels.decimal ?? '.'}${fraction}` : grouped
		);
	};

	if (isSet(filter.min) && isSet(filter.max)) {
		return labels.both
			.replace('%1$s', amount(filter.min))
			.replace('%2$s', amount(filter.max));
	}

	return isSet(filter.min)
		? labels.min.replace('%s', amount(filter.min))
		: labels.max.replace('%s', amount(filter.max));
}

/**
 * The listing's active filters, as chips (see chip()).
 *
 * @param {Object} listing Listing state.
 * @return {Array} Chips.
 */
export function chipsOf(listing) {
	const chips = [];

	Object.entries(listing?.filters ?? {}).forEach(([id, filter]) => {
		const labels = filter.labels ?? {};

		if (filter.kind === 'range') {
			if (isSet(filter.min) || isSet(filter.max)) {
				chips.push(
					chip(
						id,
						'range',
						rangeLabel(filter) ||
							labels.range ||
							[filter.min, filter.max]
								.map((bound) => (isSet(bound) ? bound : '…'))
								.join(' – ')
					)
				);
			}

			return;
		}

		(filter.values ?? []).forEach((value) =>
			chips.push(chip(id, value, labels[value] ?? value))
		);
	});

	return chips;
}

/**
 * Whether a range bound is set.
 *
 * @param {*} bound Bound.
 * @return {boolean} Set.
 */
const isSet = (bound) => bound !== null && bound !== undefined && bound !== '';

/**
 * A listing's results state, as the server words it (Filters::results_state):
 * `total`, `resultsText` ("Showing 1–12 of 48 results", "48 results" or "No
 * results") and `showText` ("Show 48 results"), for a provider's results.
 *
 * @param {number} total   Results in all.
 * @param {number} page    The page shown.
 * @param {number} perPage Results per page.
 * @return {Object} State.
 */
export function resultsState(total, page = 1, perPage = 10) {
	const texts = getConfig('matter/filters').texts ?? {};
	const locale = document.documentElement.lang || undefined;
	const number = (value) => new Intl.NumberFormat(locale).format(value);
	const form = (forms, count) => {
		let plural = 'other';

		try {
			plural = new Intl.PluralRules(locale).select(count);
		} catch {}

		return (plural === 'one' ? forms?.one : forms?.other) ?? '';
	};
	const fill = (text, ...values) =>
		values.reduce(
			(result, value, index) =>
				result
					.replace(`%${index + 1}$s`, value)
					.replace(index === 0 ? '%s' : '\u0000', value),
			text
		);

	if (!total) {
		return {
			total: 0,
			resultsText: texts.none ?? '',
			showText: texts.none ?? '',
		};
	}

	const first = (page - 1) * perPage + 1;
	const last = Math.min(total, page * perPage);

	return {
		total,
		resultsText:
			first === 1 && last >= total
				? fill(form(texts.all, total), number(total))
				: fill(
						form(texts.showing, total),
						number(first),
						number(last),
						number(total)
					),
		showText: fill(form(texts.show, total), number(total)),
	};
}

/**
 * The URL for a listing's filters: its base URL (the page without filters or
 * paging) and each filter's parameters.
 *
 * @param {Object} listing Listing state.
 * @return {string} URL.
 */
export function urlFor(listing) {
	const url = new URL(listing.baseUrl, window.location.href);

	Object.values(listing.filters ?? {}).forEach((filter) => {
		const { params = {} } = filter;

		if (filter.kind === 'range') {
			['min', 'max'].forEach((bound) => {
				if (params[bound] && isSet(filter[bound])) {
					url.searchParams.set(params[bound], filter[bound]);
				}
			});

			return;
		}

		if (params.value && filter.values?.length) {
			url.searchParams.set(params.value, filter.values.join(','));

			if (filter.operator === 'and' && params.operator) {
				url.searchParams.set(params.operator, 'all');
			}
		}
	});

	// Commas read better than %2C, and the server reads either.
	return url.href.replace(/%2C/gi, ',');
}

/**
 * A filter's state, from the context's `listing` and `filter`.
 *
 * @param {Object} context Context.
 * @return {Object|undefined} Filter state.
 */
const filterOf = (context) =>
	state.listings[context.listing]?.filters?.[context.filter];

/**
 * A copy of a listing's filters, for providers and the API.
 *
 * @param {Object} listing Listing state.
 * @return {Object} Filter ID => { values, min, max, operator }.
 */
const selectionOf = (listing) =>
	Object.fromEntries(
		Object.entries(listing?.filters ?? {}).map(([id, filter]) => [
			id,
			{
				values: [...(filter.values ?? [])],
				min: filter.min ?? null,
				max: filter.max ?? null,
				operator: filter.operator,
			},
		])
	);

/**
 * The URL a toggled option would go to (for prefetching).
 *
 * @param {Object} listing Listing state.
 * @param {string} id      Filter ID.
 * @param {string} value   Option value.
 * @return {string} URL.
 */
const toggledUrl = (listing, id, value) => {
	const filter = listing.filters[id];
	const values = filter.values.includes(value)
		? filter.values.filter((item) => item !== value)
		: [...filter.values, value];

	return urlFor({
		...listing,
		filters: { ...listing.filters, [id]: { ...filter, values } },
	});
};

// Filters blocks, by element.
const elements = new Map();

const { state, actions } = store('matter/filters', {
	state: {
		// The filter form's Apply button is for browsers without JavaScript.
		get isInteractive() {
			return true;
		},
		// An option is chosen; "Any" (`''`) when none is.
		get isChecked() {
			const context = getContext();
			const values = filterOf(context)?.values ?? [];

			return context.value === ''
				? !values.length
				: values.includes(context.value);
		},
		get count() {
			const context = getContext();

			return filterOf(context)?.counts?.[context.value] ?? 0;
		},
		// An option with no results is hidden, unless it's chosen.
		get isHidden() {
			const context = getContext();

			return !state.isChecked && !state.count && context.value !== '';
		},
		get chips() {
			return chipsOf(state.listings[getContext().listing]);
		},
		get activeCount() {
			return state.chips.length;
		},
		get hasActive() {
			return state.activeCount > 0;
		},
		get resultsText() {
			return state.listings[getContext().listing]?.resultsText ?? '';
		},
		get showText() {
			return state.listings[getContext().listing]?.showText ?? '';
		},
		// A long choice shows its first options until "Show more".
		get isCollapsed() {
			const context = getContext();

			return !!context.more && !context.expanded;
		},
	},
	actions: {
		/**
		 * Go to a listing's filtered URL: a provider's results, else the
		 * router's.
		 *
		 * @param {string} key Listing key.
		 */
		*navigate(key) {
			const listing = state.listings[key];

			if (!listing) {
				return;
			}

			const url = urlFor(listing);
			const element = [...elements.keys()].find(
				(el) => elements.get(el) === key
			);

			if (element) {
				emit(element, 'filters', 'change', { url });
			}

			const router = yield import('@wordpress/interactivity-router');

			for (const provider of providers) {
				let result;

				try {
					result = yield Promise.resolve(
						provider({
							url,
							listing: key,
							filters: selectionOf(listing),
						})
					);
				} catch {
					result = null;
				}

				if (result?.html) {
					yield router.actions.navigate(url, {
						html: result.html,
						force: true,
					});
					return;
				}
			}

			yield router.actions.navigate(url);
		},

		// A checkbox or chip option: add or remove it.
		*toggle() {
			const context = getContext();
			const filter = filterOf(context);

			if (!filter) {
				return;
			}

			filter.values = filter.values.includes(context.value)
				? filter.values.filter((value) => value !== context.value)
				: [...filter.values, context.value];

			yield actions.navigate(context.listing);
		},

		// A radio or dropdown: just this one (none for "Any").
		*choose(event) {
			const context = getContext();
			const filter = filterOf(context);
			const value = event?.target?.value ?? context.value ?? '';

			if (!filter) {
				return;
			}

			filter.values = value ? [value] : [];

			yield actions.navigate(context.listing);
		},

		// A range's low or high value (`context.bound`), when it's changed.
		*setRange(event) {
			const context = getContext();
			const filter = filterOf(context);
			const value = event?.target?.value ?? '';

			if (!filter || !['min', 'max'].includes(context.bound)) {
				return;
			}

			filter[context.bound] = value === '' ? null : Number(value);

			yield actions.navigate(context.listing);
		},

		// An active filter's chip.
		*remove() {
			const { chip: removed, listing } = getContext();
			const filter = state.listings[listing]?.filters?.[removed?.filter];

			if (!filter) {
				return;
			}

			if (removed.value === 'range') {
				filter.min = null;
				filter.max = null;
			} else {
				filter.values = filter.values.filter(
					(value) => value !== removed.value
				);
			}

			yield actions.navigate(listing);
		},

		*clearAll() {
			const { listing } = getContext();

			Object.values(state.listings[listing]?.filters ?? {}).forEach(
				(filter) => {
					filter.values = [];
					filter.min = null;
					filter.max = null;
				}
			);

			yield actions.navigate(listing);
		},

		// The form's own submit (Enter in a range's field).
		submit: withSyncEvent(function* (event) {
			event.preventDefault();

			yield actions.navigate(getContext().listing);
		}),

		// Hovering or focusing an option fetches where it leads.
		*prefetch() {
			const context = getContext();
			const listing = state.listings[context.listing];

			if (!listing?.filters?.[context.filter] || providers.length) {
				return;
			}

			const router = yield import('@wordpress/interactivity-router');

			yield router.actions.prefetch(
				toggledUrl(listing, context.filter, context.value)
			);
		},

		showMore() {
			getContext().expanded = true;
		},
	},
	callbacks: {
		// After the router renders a page, its listings' state (selection,
		// counts, results) is the server's: the router doesn't overwrite
		// what's already in the store, so copy it in.
		syncWithServer() {
			const { listing } = getContext();
			const server = getServerState().listings?.[listing];

			if (server) {
				state.listings[listing] = structuredClone(server);
			}
		},

		// The filters block: its instance for the public API.
		init() {
			const { listing } = getContext();
			const { ref } = getElement();

			elements.set(ref, listing);

			registerInstance('filters', ref, {
				element: ref,
				id: listing,
				get selection() {
					return selectionOf(state.listings[listing]);
				},
				set(filterId, values) {
					const filter = state.listings[listing]?.filters?.[filterId];

					if (filter) {
						filter.values = [...values];
						actions.navigate(listing);
					}
				},
				clear() {
					Object.values(
						state.listings[listing]?.filters ?? {}
					).forEach((filter) => {
						filter.values = [];
						filter.min = null;
						filter.max = null;
					});
					actions.navigate(listing);
				},
			});

			return () => elements.delete(ref);
		},
	},
});
