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
	 * Forget every claim (a new page, or a test).
	 *
	 * @return void
	 */
	public static function reset(): void {
		self::$claimed = [];
		self::$next    = [];
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
		$page = [ self::$claimed, self::$next ];

		self::reset();

		try {
			return $callback();
		} finally {
			[ self::$claimed, self::$next ] = $page;
		}
	}
}
