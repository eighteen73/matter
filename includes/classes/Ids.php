<?php
/**
 * Element IDs, unique within the page being rendered.
 *
 * A block saved with an ID (`matterId`, `overlayId`, an HTML anchor) can render
 * more than once on a page: a synced pattern used twice, a template part in two
 * places, content rendered again for a feed or a preview. A repeated ID breaks
 * `aria-controls`, `#hash` links and `getElementById`, so every block that
 * outputs an ID from saved data claims it here. The first claim keeps the ID;
 * later ones get `-2`, `-3` and so on.
 *
 * A saved ID is the only stable one: a repeat's suffix depends on render order.
 *
 * When the registry starts empty:
 *
 * - A block theme renders its whole template before `wp_head()` runs (see
 *   `template-canvas.php`), so it is reset on `wp_before_include_template`,
 *   immediately before that render.
 * - A REST collection renders every item's `content.rendered` in one request;
 *   each item is a page of its own, so it is reset as the controller sets up
 *   each post. A synced pattern used in two pages gets the same IDs in both,
 *   as it does on the front end.
 * - Classic themes have no such ordering guarantee: a plugin that renders
 *   block content in `wp_head` (a header script, a banner) has claimed its IDs
 *   before the template runs, and an ID in the body can then be suffixed.
 *   There is deliberately no reset at the end of `wp_head`: a block theme's
 *   footer would then be able to reuse an ID from the body.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter;

defined( 'ABSPATH' ) || exit;

/**
 * Per-request ID registry.
 */
final class Ids {

	/**
	 * Claimed IDs.
	 *
	 * @var array<string, true>
	 */
	private static array $claimed = [];

	/**
	 * The next suffix to try for an ID that was claimed again.
	 *
	 * @var array<string, int>
	 */
	private static array $next = [];

	/**
	 * How many times each accessible name has been given out.
	 *
	 * @var array<string, int>
	 */
	private static array $labels = [];

	/**
	 * Counts the registries started, so what is kept per page elsewhere (which
	 * panel a toggle belongs to) can tell it is out of date.
	 *
	 * @var int
	 */
	private static int $generation = 0;

	/**
	 * How many REST requests are being handled (they can be nested).
	 *
	 * @var int
	 */
	private static int $rest_depth = 0;

	/**
	 * Hook the points where a new page starts.
	 *
	 * @return void
	 */
	public static function setup(): void {
		add_action( 'wp_before_include_template', [ self::class, 'reset' ], PHP_INT_MAX );

		add_filter(
			'rest_request_before_callbacks',
			static function ( $response ) {
				++self::$rest_depth;

				return $response;
			},
			PHP_INT_MIN
		);
		add_filter(
			'rest_request_after_callbacks',
			static function ( $response ) {
				self::$rest_depth = max( 0, self::$rest_depth - 1 );

				return $response;
			},
			PHP_INT_MAX
		);
		add_action( 'the_post', [ self::class, 'reset_for_rest_item' ], 10, 2 );
	}

	/**
	 * Start a new registry as a REST controller sets up an item, so each item
	 * is numbered as it would be on its own page. Only the main query's posts
	 * count: a query block's loop inside a response is one render.
	 *
	 * @param mixed $post  Post.
	 * @param mixed $query Query that set it up.
	 * @return void
	 */
	public static function reset_for_rest_item( $post = null, $query = null ): void {
		if ( self::$rest_depth > 0 && isset( $GLOBALS['wp_query'] ) && $query === $GLOBALS['wp_query'] ) {
			self::reset();
		}
	}

	/**
	 * Claim an ID.
	 *
	 * @param string $id Requested ID.
	 * @return string The ID, or the ID with `-N` appended if it was taken.
	 */
	public static function claim( string $id ): string {
		$id = sanitize_html_class( $id );

		if ( '' === $id ) {
			return '';
		}

		$candidate = $id;

		// A generated candidate can itself be someone's saved ID, so keep going.
		while ( isset( self::$claimed[ $candidate ] ) ) {
			self::$next[ $id ] ??= 2;
			$candidate           = $id . '-' . self::$next[ $id ]++;
		}

		self::$claimed[ $candidate ] = true;

		return $candidate;
	}

	/**
	 * The ID `claim()` would give next, without claiming it.
	 *
	 * @param string $id Requested ID.
	 * @return string
	 */
	public static function peek( string $id ): string {
		$id = sanitize_html_class( $id );

		if ( '' === $id ) {
			return '';
		}

		$candidate = $id;
		$next      = self::$next[ $id ] ?? 2;

		while ( isset( self::$claimed[ $candidate ] ) ) {
			$candidate = $id . '-' . $next;
			++$next;
		}

		return $candidate;
	}

	/**
	 * Claim an accessible name for a landmark, so no two on the page share one
	 * (axe: landmark-unique): the first keeps it, later ones are numbered,
	 * "Photos", "Photos (2)". An empty name stays empty.
	 *
	 * @param string $label Requested name.
	 * @return string
	 */
	public static function claim_label( string $label ): string {
		if ( '' === $label ) {
			return '';
		}

		$count = ( self::$labels[ $label ] ?? 0 ) + 1;

		self::$labels[ $label ] = $count;

		/* translators: 1: a name that is used more than once on the page, 2: its number (2, 3…). */
		return 1 === $count ? $label : sprintf( __( '%1$s (%2$d)', 'matter' ), $label, $count );
	}

	/**
	 * Claim the `id` in a wrapper attribute string (what
	 * `get_block_wrapper_attributes()` returns, where core's anchor support put
	 * the block's HTML anchor), so a repeated block's wrapper is unique too.
	 *
	 * @param string $attributes Attribute string.
	 * @return string
	 */
	public static function claim_wrapper( string $attributes ): string {
		return (string) preg_replace_callback(
			'/(^|\s)id="([^"]*)"/',
			function ( $found ) {
				$id = self::claim( html_entity_decode( $found[2] ) );

				return '' === $id ? $found[0] : $found[1] . 'id="' . esc_attr( $id ) . '"';
			},
			$attributes
		);
	}

	/**
	 * An ID as the editor saves it: lowercase letters, numbers, hyphens and
	 * underscores (the same rule as the editor's `sanitizeId`).
	 *
	 * @param string $value Typed value.
	 * @return string
	 */
	public static function sanitize( string $value ): string {
		$value = strtolower( trim( $value ) );
		$value = (string) preg_replace( '/[^a-z0-9_-]+/', '-', $value );

		return trim( $value, '-' );
	}

	/**
	 * Which registry is current (changes whenever one starts).
	 *
	 * @return int
	 */
	public static function generation(): int {
		return self::$generation;
	}

	/**
	 * Forget every claim (a new page, or a test).
	 *
	 * @return void
	 */
	public static function reset(): void {
		++self::$generation;
		self::$claimed = [];
		self::$next    = [];
		self::$labels  = [];
	}

	/**
	 * Run a render with a registry of its own, then put the page's back: for a
	 * preview rendered inside a request that is rendering something else, so
	 * the preview's IDs are the ones the block itself would have.
	 *
	 * @template T
	 * @param callable():T $callback Render.
	 * @return T
	 */
	public static function isolate( callable $callback ): mixed {
		$page = [ self::$claimed, self::$next, self::$labels ];

		self::reset();

		try {
			return $callback();
		} finally {
			[ self::$claimed, self::$next, self::$labels ] = $page;
		}
	}
}
