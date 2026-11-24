<?php
/**
 * Prerendered loop items: an item's loop item, rendered ahead of time to be
 * stored and shown elsewhere.
 *
 * A search index can hold each item's prerendered loop item, so a listing's
 * results can be shown without a page render (Seek does, through its Matter
 * integration). It's what `matter/loop-item` renders in a plain loop's item
 * (the theme's `loop-item-{post_type}` pattern), with what goes around it:
 *
 * - `html`: the loop item. Live blocks (Live\Live) are placeholders, filled in
 *   the browser like a page's, so nothing in it depends on who looks.
 * - `classes`: the item's post classes, for its list item (sorted).
 * - `data`: the Interactivity API state and config its blocks add.
 * - `version`: which pattern and code rendered it; see version().
 *
 * It's shared by everyone who sees it (anything in a search index can be read
 * by anyone who can search it), so it's always rendered as a guest,
 * and its blocks' state is kept apart from the page being served.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\LoopItems;

use Eighteen73\Matter\Blocks\LoopItem;
use Eighteen73\Matter\Live\Live;
use WP_Block_Patterns_Registry;
use WP_Interactivity_API;
use WP_Post;
use WP_User;

defined( 'ABSPATH' ) || exit;

/**
 * Loop items.
 */
final class Prerendered {

	/**
	 * Versions worked out this request, by post type.
	 *
	 * @var array<string, string|null>
	 */
	private static array $versions = [];

	/**
	 * An item's prerendered loop item, or null when it has none: it isn't published and
	 * public, or the theme has no loop item pattern for its type.
	 *
	 * @param int $post_id Post ID.
	 * @return array{html: string, classes: string[], data: array, version: string}|null
	 */
	public static function render( int $post_id ): ?array {
		$post = get_post( $post_id );

		if ( ! $post instanceof WP_Post || ! self::is_public( $post ) ) {
			return null;
		}

		$version = self::version( $post->post_type );

		if ( null === $version ) {
			return null;
		}

		// As a guest, and with its own Interactivity API state: swapped
		// directly, rather than through wp_set_current_user(), so nothing
		// hooked to a login change (a shop's session) runs for it.
		$user          = $GLOBALS['current_user'] ?? null;
		$interactivity = $GLOBALS['wp_interactivity'] ?? null;

		$GLOBALS['current_user']     = new WP_User( 0 ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restored below.
		$GLOBALS['wp_interactivity'] = new WP_Interactivity_API(); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restored below.

		/**
		 * Fires before a loop item renders, as a guest: hide anything of the
		 * current visitor's its blocks would otherwise show (a shop's cart).
		 *
		 * @param WP_Post $post The item.
		 */
		do_action( 'matter_prerender_loop_item_start', $post );

		try {
			// A block that isn't registered here would be missing from the
			// copy, and the copy is shown in place of the item: render none.
			if ( [] !== LoopItem::unregistered_blocks( $post->post_type ) ) {
				return null;
			}

			$html    = Live::with_placeholders( fn() => LoopItem::render( $post->ID ) );
			$classes = get_post_class( '', $post );
			$data    = $GLOBALS['wp_interactivity']->filter_script_module_interactivity_data( [] );
		} finally {
			/**
			 * Fires after a loop item renders, to restore what matter_prerender_loop_item_start hid.
			 *
			 * @param WP_Post $post The item.
			 */
			do_action( 'matter_prerender_loop_item_end', $post );

			$GLOBALS['wp_interactivity'] = $interactivity; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restoring.
			$GLOBALS['current_user']     = $user; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restoring.
		}

		$item = [
			'html'    => $html,
			'classes' => self::classes( $classes ),
			'data'    => array_filter(
				[
					'state'  => self::without_closures( (array) ( $data['state'] ?? [] ) ),
					'config' => self::without_closures( (array) ( $data['config'] ?? [] ) ),
				]
			),
			'version' => $version,
		];

		/**
		 * Filters a loop item: e.g. without classes or state that belong to the
		 * page (a shop's cart) or to where the item is in a list.
		 *
		 * @param array   $item The loop item: `html`, `classes`, `data` and `version`.
		 * @param WP_Post $post The item.
		 */
		$item = apply_filters( 'matter_prerender_loop_item', $item, $post );

		return is_array( $item ) ? $item : null;
	}

	/**
	 * A version of a post type's loop items: changes when what renders them does
	 * (the theme's pattern, Matter, the theme, which blocks are live), so a
	 * loop item with another version is stale. Null when the theme has no loop
	 * item pattern for the type.
	 *
	 * Blocks' own code isn't covered, beyond what `matter_prerender_loop_item_version` adds
	 * (WooCommerce's version, by Matter's WooCommerce integration).
	 *
	 * @param string $post_type Post type.
	 * @return string|null
	 */
	public static function version( string $post_type ): ?string {
		if ( array_key_exists( $post_type, self::$versions ) ) {
			return self::$versions[ $post_type ];
		}

		$slug = LoopItem::pattern( $post_type );

		if ( null === $slug ) {
			self::$versions[ $post_type ] = null;

			return null;
		}

		$pattern = WP_Block_Patterns_Registry::get_instance()->get_registered( $slug );
		$theme   = wp_get_theme();

		$parts = [
			'pattern' => $slug,
			'content' => (string) ( $pattern['content'] ?? '' ),
			'matter'  => defined( 'MATTER_VERSION' ) ? MATTER_VERSION : '',
			'theme'   => $theme->get_stylesheet() . '@' . $theme->get( 'Version' ),
			'live'    => Live::blocks(),
		];

		/**
		 * Filters what a post type's prerendered loop items' version is made from: add what else
		 * changes loop items (a plugin's version, for its blocks).
		 *
		 * @param array  $parts     Name => value.
		 * @param string $post_type Post type.
		 */
		$parts = (array) apply_filters( 'matter_prerender_loop_item_version', $parts, $post_type );

		self::$versions[ $post_type ] = substr( md5( (string) wp_json_encode( $parts ) ), 0, 12 );

		return self::$versions[ $post_type ];
	}

	/**
	 * Forget the versions worked out this request (after a theme or pattern
	 * change in the same request; tests).
	 *
	 * @return void
	 */
	public static function reset(): void {
		self::$versions = [];
	}

	/**
	 * Post classes, the same wherever the loop item is rendered: WordPress orders
	 * them differently in admin, and a shop's can be empty.
	 *
	 * @param array $classes Classes.
	 * @return string[]
	 */
	private static function classes( array $classes ): array {
		$classes = array_unique( array_filter( array_map( 'strval', $classes ) ) );

		sort( $classes );

		return $classes;
	}

	/**
	 * State without derived state (closures the server evaluates for its own
	 * render, which the browser's store works out for itself).
	 *
	 * @param array $values Values.
	 * @return array
	 */
	private static function without_closures( array $values ): array {
		foreach ( $values as $key => $value ) {
			if ( $value instanceof \Closure ) {
				unset( $values[ $key ] );
			} elseif ( is_array( $value ) ) {
				$values[ $key ] = self::without_closures( $value );

				if ( [] === $values[ $key ] ) {
					unset( $values[ $key ] );
				}
			}
		}

		return $values;
	}

	/**
	 * Whether anyone may see the item: published, without a password, of a
	 * viewable type.
	 *
	 * @param WP_Post $post Post.
	 * @return bool
	 */
	private static function is_public( WP_Post $post ): bool {
		return 'publish' === $post->post_status
			&& '' === $post->post_password
			&& is_post_type_viewable( $post->post_type );
	}
}
