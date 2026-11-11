<?php
/**
 * Queries shown as a carousel, accordion or tabs: a Query Loop (or, for
 * carousels, a Product Collection) that is itself the block.
 *
 * The query carries a `matterDisplay` attribute: `type` (carousel, accordion
 * or tabs), `style` (the block's variant), `scheme`, and the block's own
 * settings (e.g. an accordion's `headingLevel`, tabs' `deepLink`). It's
 * namespaced as it's saved in content and core could add its own.
 *
 * On the front end the query's output is rendered inside that block (a
 * virtual one, with these settings), so its markup, scripts, variants and
 * colour scheme apply as for the block itself. Accordion and tabs items are
 * the post template's `matter/accordion-item` or `matter/tab`, recorded by
 * Instances as they render (the query counts as the container), so the tab
 * list and FAQ schema work too. In the editor it's one block: "Posts
 * carousel", "Posts accordion" or "Posts tabs", with the block's settings and
 * the query's own filters (editor/extensions/query-display).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Singleton;
use WP_Block;
use WP_Block_Type_Registry;
use WP_HTML_Tag_Processor;
use WP_REST_Request;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * Query displays.
 */
final class QueryDisplay {

	use Singleton;

	/**
	 * The attribute on query blocks.
	 */
	public const ATTRIBUTE = 'matterDisplay';

	/**
	 * Query blocks that can be shown as a block.
	 */
	public const BLOCKS = [ 'core/query', 'woocommerce/product-collection' ];

	/**
	 * Display types: the block each wraps the query in, and the query blocks
	 * it supports (products are carousels only).
	 */
	public const TYPES = [
		'carousel'  => [
			'block'   => 'matter/carousel',
			'queries' => self::BLOCKS,
		],
		'accordion' => [
			'block'   => 'matter/accordion',
			'queries' => [ 'core/query' ],
		],
		'tabs'      => [
			'block'   => 'matter/tabs',
			'queries' => [ 'core/query' ],
		],
	];

	/**
	 * Each item of an accordion or tabs query: the block, with the theme's
	 * panel design (a loop item) inside.
	 */
	private const ITEMS = [
		'accordion' => 'matter/accordion-item',
		'tabs'      => 'matter/tab',
	];

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'register_block_type_args', [ $this, 'register_attribute' ], 10, 2 );
		add_filter( 'allowed_block_types_all', [ $this, 'allow_query_blocks' ], 20 );

		// Before Instances finishes the query (10), so the block sees its items.
		add_filter( 'render_block', [ $this, 'render' ], 5, 3 );
		add_filter( 'render_block_context', [ $this, 'item_context' ], 10, 2 );
		add_action( 'rest_api_init', [ $this, 'register_route' ] );
	}

	/**
	 * Add the `matterDisplay` attribute to the query blocks.
	 *
	 * @param array  $args       Block type args.
	 * @param string $block_name Block name.
	 * @return array
	 */
	public function register_attribute( array $args, string $block_name ): array {
		if ( in_array( $block_name, self::BLOCKS, true ) ) {
			$args['attributes']                    = $args['attributes'] ?? [];
			$args['attributes'][ self::ATTRIBUTE ] = [ 'type' => 'object' ];
		}

		return $args;
	}

	/**
	 * A block's display, if it's a query shown as a block: the type, the
	 * block it's shown as, and that block's attributes (validated against
	 * its schema, with its defaults).
	 *
	 * @param string $name       Block name.
	 * @param array  $attributes Block attributes.
	 * @return array{type: string, block: string, attributes: array}|null
	 */
	public static function of( string $name, array $attributes ): ?array {
		$display = $attributes[ self::ATTRIBUTE ] ?? null;
		$type    = is_array( $display ) ? (string) ( $display['type'] ?? '' ) : '';

		if ( ! isset( self::TYPES[ $type ] ) || ! in_array( $name, self::TYPES[ $type ]['queries'], true ) ) {
			return null;
		}

		$block      = self::TYPES[ $type ]['block'];
		$block_type = WP_Block_Type_Registry::get_instance()->get_registered( $block );

		if ( ! $block_type ) {
			return null;
		}

		// The block's own settings only: not its class, lock or bindings.
		$settings = array_diff_key(
			array_intersect_key( $display, $block_type->get_attributes() ),
			array_flip( [ 'className', 'lock', 'metadata', 'anchor', 'style' ] )
		);

		return [
			'type'       => $type,
			'block'      => $block,
			'attributes' => $block_type->prepare_attributes_for_render( $settings ),
		];
	}

	/**
	 * Wherever a block a query can be shown as is allowed, allow the query
	 * blocks too. The inserter offers them only as Matter's variations
	 * (editor/extensions/query-display), so a theme's list doesn't need to
	 * name them. Runs after the theme's list is applied (AllowedBlocks, 10).
	 *
	 * @param array|bool $allowed_blocks Block names, or true/false for all/none.
	 * @return array|bool
	 */
	public function allow_query_blocks( array|bool $allowed_blocks ): array|bool {
		if ( ! is_array( $allowed_blocks ) ) {
			return $allowed_blocks;
		}

		$registry = WP_Block_Type_Registry::get_instance();
		$queries  = [];

		foreach ( self::TYPES as $type ) {
			if ( in_array( $type['block'], $allowed_blocks, true ) ) {
				$queries = array_merge( $queries, array_filter( $type['queries'], [ $registry, 'is_registered' ] ) );
			}
		}

		return array_values( array_unique( array_merge( $allowed_blocks, $queries ) ) );
	}

	/**
	 * Render a displayed query's output inside its block.
	 *
	 * @param string        $content Rendered query.
	 * @param array         $block   Parsed block.
	 * @param WP_Block|null $instance Block instance.
	 * @return string
	 */
	public function render( string $content, array $block, ?WP_Block $instance = null ): string {
		if ( ! in_array( $block['blockName'] ?? '', self::BLOCKS, true ) || '' === trim( $content ) ) {
			return $content;
		}

		$display = self::of( (string) $block['blockName'], $instance?->attributes ?? (array) ( $block['attrs'] ?? [] ) );

		if ( null === $display ) {
			return $content;
		}

		$settings = (array) ( $block['attrs'][ self::ATTRIBUTE ] ?? [] );
		$style    = sanitize_key( (string) ( $settings['style'] ?? '' ) );
		$align    = sanitize_key( (string) ( $block['attrs']['align'] ?? '' ) );
		$attrs    = array_filter(
			[
				// The query's alignment applies to the block around it.
				'className' => trim( ( $style ? 'is-style-' . $style : '' ) . ( $align ? ' align' . $align : '' ) ),
				'scheme'    => sanitize_key( (string) ( $settings['scheme'] ?? '' ) ),
			]
		) + $display['attributes'];

		// The post template's list is only a wrapper for accordion items and
		// tab panels, not a list readers need to hear about.
		if ( 'carousel' !== $display['type'] ) {
			$content = self::presentational_list( $content );
		}

		// Rendered as the block (not just its markup), so its assets load and
		// block supports such as the scheme apply.
		return render_block(
			[
				'blockName'    => $display['block'],
				'attrs'        => $attrs,
				'innerBlocks'  => [],
				'innerHTML'    => $content,
				'innerContent' => [ $content ],
			]
		);
	}

	/**
	 * An accordion query's items get the accordion's settings (heading level,
	 * one open at a time, open first) as a nested accordion block provides
	 * them, unless an accordion block around them already did.
	 *
	 * @param array $context      Block context.
	 * @param array $parsed_block Parsed block.
	 * @return array
	 */
	public function item_context( array $context, array $parsed_block ): array {
		if ( 'matter/accordion-item' !== ( $parsed_block['blockName'] ?? '' ) ) {
			return $context;
		}

		$settings = Instances::settings( 'matter/accordion' );

		if ( null === $settings ) {
			return $context;
		}

		return $context + [
			'matter/headingLevel' => $settings['headingLevel'] ?? 3,
			'matter/autoclose'    => $settings['autoclose'] ?? false,
			'matter/openFirst'    => $settings['openFirst'] ?? false,
		];
	}

	/**
	 * `POST matter/v1/query-display`: an accordion or tabs query rendered as
	 * on the front end, with the styles it enqueued, for the editor preview.
	 * Its items are always Matter's (the item block and the theme's panel),
	 * whatever the request.
	 *
	 * @return void
	 */
	public function register_route(): void {
		register_rest_route(
			'matter/v1',
			'/query-display',
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'preview' ],
				'permission_callback' => fn() => current_user_can( 'edit_posts' ),
				'args'                => [
					'attributes' => [
						'type'     => 'object',
						'required' => true,
					],
					'postId'     => [
						'type'    => 'integer',
						'default' => 0,
					],
				],
			]
		);
	}

	/**
	 * Render the preview.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return array{html: string, styles: string}|\WP_Error
	 */
	public function preview( WP_REST_Request $request ): array|\WP_Error {
		$attributes = (array) $request['attributes'];
		$display    = self::of( 'core/query', $attributes );

		if ( null === $display || ! isset( self::ITEMS[ $display['type'] ] ) ) {
			return new \WP_Error( 'matter_query_display', __( 'Not an accordion or tabs query.', 'matter' ), [ 'status' => 400 ] );
		}

		// The page being edited, e.g. for "exclude current".
		$post_id = (int) $request['postId'];

		if ( $post_id && current_user_can( 'read_post', $post_id ) ) {
			$GLOBALS['post'] = get_post( $post_id ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- A REST request has no post.
			setup_postdata( $GLOBALS['post'] );
		}

		return Preview::render( self::query_block( $attributes, $display['type'] ) );
	}

	/**
	 * A displayed query with Matter's items: the post template holds the
	 * item block, which holds the theme's panel design.
	 *
	 * @param array  $attributes Query attributes.
	 * @param string $type       Display type (accordion or tabs).
	 * @return array Parsed block.
	 */
	public static function query_block( array $attributes, string $type ): array {
		$panel = self::parsed( 'matter/loop-item', [ 'design' => 'panel' ] );
		$item  = self::parsed( self::ITEMS[ $type ], [], [ $panel ] );

		return self::parsed(
			'core/query',
			$attributes,
			[ self::parsed( 'core/post-template', [], [ $item ] ) ],
			[ '<div class="wp-block-query">', null, '</div>' ]
		);
	}

	/**
	 * A parsed block.
	 *
	 * @param string     $name          Block name.
	 * @param array      $attrs         Attributes.
	 * @param array      $inner_blocks  Inner blocks.
	 * @param array|null $inner_content Inner content (a placeholder per inner block by default).
	 * @return array
	 */
	private static function parsed( string $name, array $attrs = [], array $inner_blocks = [], ?array $inner_content = null ): array {
		$inner_content ??= array_fill( 0, count( $inner_blocks ), null );

		return [
			'blockName'    => $name,
			'attrs'        => $attrs,
			'innerBlocks'  => $inner_blocks,
			'innerHTML'    => implode( '', array_filter( $inner_content, 'is_string' ) ),
			'innerContent' => $inner_content,
		];
	}

	/**
	 * Mark the post template's list and its items as presentational.
	 *
	 * @param string $html Rendered query.
	 * @return string
	 */
	private static function presentational_list( string $html ): string {
		$tags = new WP_HTML_Tag_Processor( $html );

		while ( $tags->next_tag() ) {
			$is_list = 'UL' === $tags->get_tag() && $tags->has_class( 'wp-block-post-template' );
			$is_item = 'LI' === $tags->get_tag() && $tags->has_class( 'wp-block-post' );

			if ( $is_list || $is_item ) {
				$tags->set_attribute( 'role', 'presentation' );
			}
		}

		return $tags->get_updated_html();
	}
}
