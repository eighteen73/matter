<?php
/**
 * Carousels of posts or products: a Query Loop or Product Collection that is
 * itself the carousel.
 *
 * The query block carries a `carousel` attribute (`style`, `scheme`,
 * `label`); on the front end its output is wrapped in the carousel block's
 * markup, so the carousel's template, scripts, block styles (Matter's and the
 * theme's) and colour scheme apply exactly as for a carousel block. In the
 * editor it's one block: a "Posts carousel" / "Products carousel" with the
 * carousel's settings and the query's own filters.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Query carousels.
 */
final class QueryCarousel {

	use Singleton;

	/**
	 * Query blocks that can be carousels.
	 */
	public const BLOCKS = [ 'core/query', 'woocommerce/product-collection' ];

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'register_block_type_args', [ $this, 'register_attribute' ], 10, 2 );

		foreach ( self::BLOCKS as $name ) {
			add_filter( "render_block_{$name}", [ $this, 'render' ], 10, 2 );
		}
	}

	/**
	 * Add the `carousel` attribute to the query blocks.
	 *
	 * @param array  $args       Block type args.
	 * @param string $block_name Block name.
	 * @return array
	 */
	public function register_attribute( array $args, string $block_name ): array {
		if ( in_array( $block_name, self::BLOCKS, true ) ) {
			$args['attributes']             = $args['attributes'] ?? [];
			$args['attributes']['carousel'] = [ 'type' => 'object' ];
		}

		return $args;
	}

	/**
	 * Wrap a carousel query's output in the carousel block.
	 *
	 * @param string $content Rendered query.
	 * @param array  $block   Parsed block.
	 * @return string
	 */
	public function render( string $content, array $block ): string {
		$carousel = $block['attrs']['carousel'] ?? null;

		if ( ! is_array( $carousel ) || '' === trim( $content ) ) {
			return $content;
		}

		$style = sanitize_key( (string) ( $carousel['style'] ?? '' ) );
		$align = sanitize_key( (string) ( $block['attrs']['align'] ?? '' ) );
		$attrs = array_filter(
			[
				// The query's alignment applies to the carousel around it.
				'className' => trim( ( $style ? 'is-style-' . $style : '' ) . ( $align ? ' align' . $align : '' ) ),
				'scheme'    => sanitize_key( (string) ( $carousel['scheme'] ?? '' ) ),
				'label'     => (string) ( $carousel['label'] ?? '' ),
			]
		);

		// Rendered as the carousel block (not just its markup), so its
		// assets load and block supports such as the scheme apply.
		return render_block(
			[
				'blockName'    => 'matter/carousel',
				'attrs'        => $attrs,
				'innerBlocks'  => [],
				'innerHTML'    => $content,
				'innerContent' => [ $content ],
			]
		);
	}
}
