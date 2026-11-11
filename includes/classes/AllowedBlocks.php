<?php
/**
 * Limits the blocks content editors can add to the theme's list.
 *
 * The theme supplies the list through the `matter_allowed_blocks` filter (an
 * empty list leaves the editor unrestricted). Entries ending in `/*` allow
 * every registered block in that namespace. It applies to the post editor
 * only: templates are developer-owned and the Site Editor keeps every block.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter;

use WP_Block_Editor_Context;
use WP_Block_Type_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Allowed blocks.
 */
final class AllowedBlocks {

	use Singleton;

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'allowed_block_types_all', [ $this, 'filter' ], 10, 2 );
	}

	/**
	 * Limit the post editor to the theme's list.
	 *
	 * @param array|bool              $allowed_blocks Block names, or true/false for all/none.
	 * @param WP_Block_Editor_Context $editor_context Editor context.
	 * @return array|bool
	 */
	public function filter( array|bool $allowed_blocks, WP_Block_Editor_Context $editor_context ): array|bool {
		if ( empty( $editor_context->post ) || false === $allowed_blocks ) {
			return $allowed_blocks;
		}

		/**
		 * Filters the blocks content editors can add. Entries ending in `/*`
		 * allow a whole namespace. Empty leaves the editor unrestricted.
		 *
		 * @param string[]                $blocks         Block names and namespace wildcards.
		 * @param WP_Block_Editor_Context $editor_context Editor context.
		 */
		$entries = (array) apply_filters( 'matter_allowed_blocks', [], $editor_context );

		if ( ! $entries ) {
			return $allowed_blocks;
		}

		$allowed = self::expand( $entries );

		// Keep restrictions applied earlier by other code.
		if ( is_array( $allowed_blocks ) ) {
			$allowed = array_intersect( $allowed, $allowed_blocks );
		}

		return array_values( $allowed );
	}

	/**
	 * Expand `namespace/*` entries into every registered block in that namespace.
	 *
	 * @param string[] $entries Block names and namespace wildcards.
	 * @return string[]
	 */
	public static function expand( array $entries ): array {
		$registered = array_keys( WP_Block_Type_Registry::get_instance()->get_all_registered() );
		$blocks     = [];

		foreach ( $entries as $entry ) {
			$entry = (string) $entry;

			if ( ! str_ends_with( $entry, '/*' ) ) {
				$blocks[] = $entry;
				continue;
			}

			$prefix = substr( $entry, 0, -1 );

			foreach ( $registered as $name ) {
				if ( str_starts_with( $name, $prefix ) ) {
					$blocks[] = $name;
				}
			}
		}

		return array_values( array_unique( $blocks ) );
	}
}
