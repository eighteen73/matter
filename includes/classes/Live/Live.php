<?php
/**
 * Live blocks: blocks whose output can't be part of a copy that's shared (a
 * cached page, a card in a search index), because it depends on who is
 * looking or changes too often: a price that differs per customer, a stock
 * level.
 *
 * A plugin that makes a block live declares it (`matter_live_blocks`;
 * e.g. Abacus, for WooCommerce's Product Price and Sale Badge). In a loop item
 * (Blocks\LoopItem), a live block can then render as an empty placeholder
 * instead of its output:
 *
 *     <div class="matter-live is-woocommerce-product-price"
 *          data-matter-live="12:0" aria-busy="true"></div>
 *
 * keyed by the item's post ID and the block's place among the item's live
 * blocks. The browser (src/live/view.js) fills placeholders from
 * `GET matter/v1/live?ids[]=12`, which renders each item's live blocks
 * as the current visitor. So a card can be shared by everyone (cached, or
 * stored in a search index) while its price is always current and the
 * visitor's own.
 *
 * Guests' answers are shared (cacheable), so a live block must show every
 * guest the same thing: what depends on a guest's session (their basket)
 * doesn't belong here.
 *
 * Placeholders are used:
 * - while rendering with_placeholders() (e.g. a card for a search index);
 * - on pages, when `matter_live_placeholders` is true, so a listing can be
 *   cached for every visitor, logged in or not.
 *
 * On a normal page, live blocks render as usual.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Live;

use Eighteen73\Matter\Blocks\LoopItem;
use Eighteen73\Matter\Singleton;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * Live blocks.
 */
final class Live {

	use Singleton;

	/**
	 * Most items in one request.
	 */
	public const MAX_ITEMS = 100;

	/**
	 * How long a visitor's blocks are good for, at most, in seconds (unless the
	 * plugin that makes them live says sooner; see expires()).
	 */
	public const MAX_AGE = 300;

	/**
	 * What live blocks do while an item renders: `render` (as usual),
	 * `placeholder` or `capture` (render, and keep their output for the
	 * endpoint).
	 *
	 * @var string
	 */
	private static string $mode = 'render';

	/**
	 * Loop items rendering (innermost last): each its post ID, the number of
	 * live blocks so far, and what they rendered (when capturing).
	 *
	 * @var array<int, array{post: int, count: int, captured: string[]}>
	 */
	private static array $items = [];

	/**
	 * What each item's live blocks rendered, by post ID, while capturing.
	 *
	 * @var array<int, string[]>
	 */
	private static array $captured = [];

	/**
	 * Whether any placeholder was output on this page (so the browser script
	 * loads).
	 *
	 * @var bool
	 */
	private static bool $used = false;

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'render_block', [ $this, 'render_block' ], 20, 2 );
		add_action( 'rest_api_init', [ $this, 'register_route' ] );
		add_action( 'wp_footer', [ $this, 'enqueue' ], 1 );
	}

	/**
	 * The blocks declared live.
	 *
	 * @return string[] Block names.
	 */
	public static function blocks(): array {
		/**
		 * Filters the blocks whose output depends on who is looking (e.g. a
		 * price that differs per customer), which loop items can render as
		 * placeholders for the browser to fill.
		 *
		 * @param string[] $blocks Block names.
		 */
		return array_values( array_unique( array_filter( (array) apply_filters( 'matter_live_blocks', [] ), 'is_string' ) ) );
	}

	/**
	 * Whether live blocks on pages are placeholders, filled in the browser
	 * (so the page can be cached for every visitor).
	 *
	 * @return bool
	 */
	public static function placeholders_on_pages(): bool {
		if ( is_admin() || wp_is_serving_rest_request() || ( defined( 'WP_CLI' ) && WP_CLI ) ) {
			return false;
		}

		/**
		 * Filters whether live blocks in loop items render as placeholders on
		 * pages, filled in the browser with the visitor's own (so a listing can be
		 * cached for every visitor). Off by default: they render as usual.
		 *
		 * @param bool $placeholders Whether they're placeholders.
		 */
		return (bool) apply_filters( 'matter_live_placeholders', false );
	}

	/**
	 * Render something with live blocks as placeholders (e.g. a card for a
	 * search index).
	 *
	 * @param callable $render Renders it.
	 * @return string
	 */
	public static function with_placeholders( callable $render ): string {
		return (string) self::in_mode( 'placeholder', $render );
	}

	/**
	 * Run something in a mode.
	 *
	 * @param string   $mode   Mode.
	 * @param callable $render Callback.
	 * @return mixed
	 */
	private static function in_mode( string $mode, callable $render ): mixed {
		$previous   = self::$mode;
		self::$mode = $mode;

		try {
			return $render();
		} finally {
			self::$mode = $previous;
		}
	}

	/**
	 * Render a loop item (in a plain loop, not a carousel or the like, whose
	 * pattern can differ): its live blocks numbered as they render.
	 *
	 * @param int      $post_id Item's post ID.
	 * @param callable $render  Renders it.
	 * @return string
	 */
	public static function item( int $post_id, callable $render ): string {
		self::$items[] = [
			'post'     => $post_id,
			'count'    => 0,
			'captured' => [],
		];

		try {
			return (string) $render();
		} finally {
			$item = array_pop( self::$items );

			if ( 'capture' === self::$mode ) {
				self::$captured[ $post_id ] = $item['captured'];
			}
		}
	}

	/**
	 * A loop item's live blocks, rendered as the current visitor, in the
	 * order its placeholders are numbered.
	 *
	 * @param int $post_id Post ID.
	 * @return string[]
	 */
	public static function capture( int $post_id ): array {
		unset( self::$captured[ $post_id ] );

		self::in_mode( 'capture', fn() => LoopItem::render( $post_id ) );

		return self::$captured[ $post_id ] ?? [];
	}

	/**
	 * A live block in a loop item: a placeholder, or captured.
	 *
	 * @param string $content Rendered block.
	 * @param array  $block   Parsed block.
	 * @return string
	 */
	public function render_block( string $content, array $block ): string {
		if ( ! self::$items || ! in_array( $block['blockName'] ?? '', self::blocks(), true ) ) {
			return $content;
		}

		$mode = 'render' === self::$mode && self::placeholders_on_pages() ? 'placeholder' : self::$mode;

		if ( 'render' === $mode ) {
			return $content;
		}

		$index = array_key_last( self::$items );
		$item  = &self::$items[ $index ];
		$n     = $item['count']++;

		if ( 'capture' === $mode ) {
			$item['captured'][ $n ] = $content;

			return $content;
		}

		self::$used = true;

		return sprintf(
			'<div class="matter-live is-%1$s" data-matter-live="%2$d:%3$d" aria-busy="true"></div>',
			esc_attr( str_replace( '/', '-', (string) $block['blockName'] ) ),
			$item['post'],
			$n
		);
	}

	/**
	 * Load the browser script on pages with placeholders.
	 *
	 * @return void
	 */
	public function enqueue(): void {
		if ( ! self::$used ) {
			return;
		}

		wp_enqueue_script_module( 'matter/live' );

		// A placeholder holds a line's space until it's filled.
		wp_register_style( 'matter-live', false, [], MATTER_VERSION );
		wp_enqueue_style( 'matter-live' );
		wp_add_inline_style( 'matter-live', ':where(.matter-live[aria-busy]){display:block;min-block-size:1lh}' );
		wp_interactivity_config(
			'matter/live',
			[
				'endpoint' => rest_url( 'matter/v1/live' ),
				'version'  => self::version(),
				// Logged in: the REST nonce, so the endpoint knows who's asking.
				// Not on a cached page: it asks for one when it needs it.
				'nonce'    => is_user_logged_in() ? wp_create_nonce( 'wp_rest' ) : '',
			]
		);
	}

	/**
	 * Whether a page rendered placeholders.
	 *
	 * @return bool
	 */
	public static function used(): bool {
		return self::$used;
	}

	/**
	 * What live blocks show now: changes when anything they show changes
	 * (e.g. a price), so a cached copy is dropped.
	 *
	 * @return string
	 */
	public static function version(): string {
		/**
		 * Filters the version of what live blocks show, which changes when
		 * any of it changes (Abacus: its prices and promotions).
		 *
		 * @param string $version Version.
		 */
		return (string) apply_filters( 'matter_live_version', '1' );
	}

	/**
	 * When what live blocks show now stops being right: at most MAX_AGE
	 * from now, sooner when something scheduled changes it.
	 *
	 * @return int Unix time.
	 */
	public static function expires(): int {
		$max = time() + self::MAX_AGE;

		/**
		 * Filters when what live blocks show changes next by itself (e.g. a
		 * promotion that starts or ends), as a Unix time; at most MAX_AGE from
		 * now.
		 *
		 * @param int $expires Unix time.
		 */
		$expires = (int) apply_filters( 'matter_live_expires', $max );

		return max( time() + 1, min( $max, $expires ) );
	}

	/**
	 * `GET matter/v1/live?ids[]=…`: each item's live blocks as the
	 * current visitor.
	 *
	 * @return void
	 */
	public function register_route(): void {
		register_rest_route(
			'matter/v1',
			'/live',
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'respond' ],
				'permission_callback' => '__return_true',
				'args'                => [
					'ids' => [
						'type'     => 'array',
						'items'    => [
							'type'    => 'integer',
							'minimum' => 1,
						],
						'maxItems' => self::MAX_ITEMS,
						'required' => true,
					],
					'v'   => [
						'type'        => 'string',
						'description' => 'The version the page has, so caches key by it.',
					],
				],
			]
		);
	}

	/**
	 * Each item's live blocks, for items any visitor may see (published,
	 * of a viewable post type).
	 *
	 * A request with a login cookie but no REST nonce would be answered as a
	 * guest (WordPress drops the user), showing a customer someone else's
	 * prices, so it's refused with a fresh nonce to try again with.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function respond( WP_REST_Request $request ) {
		if ( ! is_user_logged_in() ) {
			$user_id = (int) wp_validate_auth_cookie( '', 'logged_in' );

			if ( $user_id > 0 ) {
				wp_set_current_user( $user_id );
				$nonce = wp_create_nonce( 'wp_rest' );
				wp_set_current_user( 0 );

				return new WP_Error(
					'matter_live_nonce',
					__( 'Logged in: send the REST nonce.', 'matter' ),
					[
						'status' => 403,
						'nonce'  => $nonce,
					]
				);
			}
		}

		$items = [];

		foreach ( array_unique( array_map( 'intval', (array) $request['ids'] ) ) as $id ) {
			if ( self::visible( $id ) ) {
				$items[ (string) $id ] = array_values( self::capture( $id ) );
			}
		}

		$expires  = self::expires();
		$response = new WP_REST_Response(
			[
				'version' => self::version(),
				'expires' => $expires,
				'items'   => (object) $items,
			]
		);

		$response->header(
			'Cache-Control',
			is_user_logged_in()
				? 'private, no-store'
				: sprintf( 'public, max-age=%d', max( 0, min( 60, $expires - time() ) ) )
		);
		$response->header( 'Vary', 'Cookie' );

		return $response;
	}

	/**
	 * Whether any visitor may see an item: published, of a viewable post type.
	 *
	 * @param int $post_id Post ID.
	 * @return bool
	 */
	private static function visible( int $post_id ): bool {
		$post = get_post( $post_id );

		return $post && 'publish' === $post->post_status && empty( $post->post_password ) && is_post_type_viewable( $post->post_type );
	}
}
