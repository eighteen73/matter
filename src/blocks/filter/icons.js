/**
 * A filter's icon in the editor, from its source's (`icon` in
 * `matterEditor.filterSources`, from the source's `icon()`): core's, so they
 * match the rest of the inserter. A source without one has the funnel.
 */

/**
 * WordPress dependencies
 */
import {
	box,
	category,
	color,
	currencyDollar,
	currencyEuro,
	currencyPound,
	funnel,
	payment,
	postTerms,
	starHalf,
	arrowDown,
	store,
	tag,
} from '@wordpress/icons';

const ICONS = {
	category,
	tag,
	brand: store,
	color,
	attribute: postTerms,
	'currency-pound': currencyPound,
	'currency-euro': currencyEuro,
	'currency-dollar': currencyDollar,
	price: payment,
	stock: box,
	rating: starHalf,
	sort: arrowDown,
};

/**
 * A source's icon.
 *
 * @param {Object|undefined} source A source from `matterEditor.filterSources`.
 * @return {Element} Icon.
 */
export const sourceIcon = (source) => ICONS[source?.icon] ?? funnel;
