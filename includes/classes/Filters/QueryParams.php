<?php
/**
 * A source whose selection the query block applies itself, from parameters
 * of its own: WooCommerce's (`categories`, `filter_color`, `min_price`…).
 *
 * A source's URL parameters are Matter's convention (`filter_{name}`, see
 * Source::params()). For a source like this, Matter adds the query block's
 * own parameters to the request as it starts (Request::normalise()), so the
 * query block (and Seek, which maps them) reads them as if the URL had them.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Filters;

defined( 'ABSPATH' ) || exit;

/**
 * Query parameters.
 */
interface QueryParams {

	/**
	 * The query block's own parameters for a selection, by name: every one
	 * it reads, `''` for those the selection doesn't set.
	 *
	 * @param array $selected Selection (see Source).
	 * @return array<string, string>
	 */
	public function query_params( array $selected ): array;
}
