<?php
/**
 * Shared block context helpers.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Provides shared context keys and helpers for block rendering.
 */
class Context {

	/**
	 * Context key indicating a block is rendered inside a query-loop item.
	 */
	public const IN_QUERY_LOOP = 'matter/in-query-loop';

	/**
	 * Block names that render repeated query-loop items.
	 *
	 * @var array<int, string>
	 */
	private const QUERY_LOOP_TEMPLATE_BLOCKS = [
		// WordPress can expose repeated Query Loop item wrappers as core/null at render time.
		'core/null',
		'core/post-template',
		'woocommerce/product-template',
	];

	/**
	 * Add shared Matter context values for a block render.
	 *
	 * @param array<string, mixed> $context      Default block context.
	 * @param \WP_Block|null       $parent_block Parent block instance.
	 * @return array<string, mixed>
	 */
	public static function provide( array $context, $parent_block = null ): array {
		$is_template_parent = self::is_query_loop_template_parent( $parent_block );
		$is_parent_in_loop  = self::is_parent_in_query_loop( $parent_block );

		if ( ( $is_template_parent && ! empty( $context['postId'] ) ) || $is_parent_in_loop ) {
			$context[ self::IN_QUERY_LOOP ] = true;
		}

		return $context;
	}

	/**
	 * Whether the provided context is inside a repeated query-loop item.
	 *
	 * @param array<string, mixed> $context Block context.
	 * @return bool
	 */
	public static function is_in_query_loop( array $context ): bool {
		return ! empty( $context[ self::IN_QUERY_LOOP ] );
	}

	/**
	 * Whether the parent block renders repeated query-loop items.
	 *
	 * @param \WP_Block|null $parent_block Parent block instance.
	 * @return bool
	 */
	private static function is_query_loop_template_parent( $parent_block ): bool {
		if ( ! is_object( $parent_block ) || empty( $parent_block->name ) ) {
			return false;
		}

		/**
		 * Filter block names that render repeated query-loop items.
		 *
		 * @param array<int, string> $template_blocks Query-loop template block names.
		 */
		$template_blocks = apply_filters( 'matter_query_loop_template_blocks', self::QUERY_LOOP_TEMPLATE_BLOCKS );

		if ( ! is_array( $template_blocks ) ) {
			return false;
		}

		return in_array( $parent_block->name, $template_blocks, true );
	}

	/**
	 * Whether the parent block has already been marked as inside a query loop.
	 *
	 * @param \WP_Block|null $parent_block Parent block instance.
	 * @return bool
	 */
	private static function is_parent_in_query_loop( $parent_block ): bool {
		if ( ! is_object( $parent_block ) || empty( $parent_block->context ) || ! is_array( $parent_block->context ) ) {
			return false;
		}

		return ! empty( $parent_block->context[ self::IN_QUERY_LOOP ] );
	}
}
