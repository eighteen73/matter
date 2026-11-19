<?php
/**
 * A filter source: what a `matter/filter` block filters a listing by.
 *
 * A source owns its URL parameters, so a filtered listing is a plain URL
 * that the server renders the same way however it was reached (a click, a
 * reload, a shared link, a form with no JavaScript). It applies its selection
 * to a query, and lists its options with counts for a listing.
 *
 * URL parameters follow one convention: `filter_{name}` for a choice
 * (comma-separated values) with `filter_{name}_match=all` when every value
 * must match, and `filter_{name}_min` and `filter_{name}_max` for a range.
 * `{name}` is short and readable (`category`, `tag`, `color`, `price`), so
 * two sources can share one when they're for different post types (a post's
 * category and a product's): a source applies only to queries for its own.
 * A source the query block applies itself (WooCommerce's) translates its
 * parameters into the block's own (QueryParams).
 *
 * Two kinds:
 *
 * - `choice`: options to pick (terms, stock statuses, ratings). The
 *   selection is `[ 'values' => string[], 'operator' => 'or'|'and' ]`
 *   (`and` from `_match=all`).
 * - `range`: a low and high value (price). The selection is
 *   `[ 'min' => float|null, 'max' => float|null ]`.
 *
 * Core has TaxonomySource; integrations register more (see Sources).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Filters;

defined( 'ABSPATH' ) || exit;

/**
 * A filter source.
 */
interface Source {

	/**
	 * Unique key, saved in the filter block's `source` attribute (e.g.
	 * `taxonomy:category`, `price`).
	 *
	 * @return string
	 */
	public function key(): string;

	/**
	 * Name, for the filter's legend and the inserter ("Category").
	 *
	 * @return string
	 */
	public function label(): string;

	/**
	 * `choice` or `range`.
	 *
	 * @return string
	 */
	public function kind(): string;

	/**
	 * Post types it can filter (empty for any).
	 *
	 * @return string[]
	 */
	public function post_types(): array;

	/**
	 * Its URL parameters: for a choice, `value` (comma-separated values) and
	 * optionally `operator` (`and` when every value must match); for a range,
	 * `min` and `max`.
	 *
	 * @return array<string, string>
	 */
	public function params(): array;

	/**
	 * Its selection in a request's parameters.
	 *
	 * @param array $request Request parameters (`$_GET`, normalised).
	 * @return array Choice: `values`, `operator`. Range: `min`, `max`.
	 */
	public function selected( array $request ): array;

	/**
	 * A query's vars with the selection applied. A source whose plugin
	 * applies its own parameters (WooCommerce's) returns them unchanged.
	 *
	 * @param array $query_vars WP_Query vars.
	 * @param array $selected   Its selection.
	 * @return array
	 */
	public function apply( array $query_vars, array $selected ): array;

	/**
	 * What a listing offers, with counts of its results.
	 *
	 * For a choice, the options: each `value`, `label`, `count`, and
	 * optionally `parent` (the parent's value, for nested terms) and `swatch`
	 * (a CSS colour). Counts ignore the source's own selection when its
	 * operator is `or`, so other options stay available to add.
	 *
	 * For a range, its bounds: `min` and `max` (null when nothing matches).
	 *
	 * @param Listing   $listing  The listing.
	 * @param \WP_Block $block    The filter block (its context has the query).
	 * @param array     $settings The filter block's settings (e.g. `operator`).
	 * @return array
	 */
	public function options( Listing $listing, \WP_Block $block, array $settings ): array;

	/**
	 * The selection as removable chips (active filters): each `value` (for a
	 * choice, the option's; for a range, `range`) and `label`.
	 *
	 * @param array $selected Its selection.
	 * @return array<int, array{value: string, label: string}>
	 */
	public function chips( array $selected ): array;
}
