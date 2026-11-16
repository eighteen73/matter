<?php
/**
 * Limits the blocks content editors can add to the theme's list.
 *
 * The theme supplies the list through the `matter_allowed_blocks` filter (an
 * empty list leaves the editor unrestricted). Entries ending in `/*` allow
 * every registered block in that namespace. It applies to the post editor
 * only: templates are developer-owned and the Site Editor keeps every block.
 *
 * A block a section's slot allows (`allowedBlocks`) that isn't on the list is
 * allowed only in those sections: the editor gives it their names as its
 * `ancestor`, so the inserter offers it there and not at the top level.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter;

use Eighteen73\Matter\Sections\Sections;
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

		$allowed = self::theme_list( $editor_context );

		if ( null === $allowed ) {
			return $allowed_blocks;
		}

		// Keep restrictions applied earlier by other code.
		if ( is_array( $allowed_blocks ) ) {
			$allowed = array_intersect( $allowed, $allowed_blocks );
		}

		$slot_only = array_keys( self::slot_only( $allowed ) );

		if ( is_array( $allowed_blocks ) ) {
			$slot_only = array_intersect( $slot_only, $allowed_blocks );
		}

		return array_values( array_unique( array_merge( $allowed, $slot_only ) ) );
	}

	/**
	 * The theme's list for an editor, expanded.
	 *
	 * @param WP_Block_Editor_Context $editor_context Editor context.
	 * @return string[]|null Block names, or null when the theme sets none.
	 */
	public static function theme_list( WP_Block_Editor_Context $editor_context ): ?array {
		/**
		 * Filters the blocks content editors can add. Entries ending in `/*`
		 * allow a whole namespace. Empty leaves the editor unrestricted.
		 *
		 * @param string[]                $blocks         Block names and namespace wildcards.
		 * @param WP_Block_Editor_Context $editor_context Editor context.
		 */
		$entries = (array) apply_filters( 'matter_allowed_blocks', [], $editor_context );

		return $entries ? self::expand( $entries ) : null;
	}

	/**
	 * Blocks that sections' slots allow but the list doesn't, with the
	 * sections that allow them.
	 *
	 * @param string[] $allowed The blocks allowed everywhere.
	 * @return array<string, string[]> Block name => section names.
	 */
	public static function slot_only( array $allowed ): array {
		$registry  = WP_Block_Type_Registry::get_instance();
		$slot_only = [];

		foreach ( Sections::names() as $section ) {
			foreach ( (array) ( $registry->get_registered( $section )?->supports['matter']['slots'] ?? [] ) as $slot ) {
				if ( ! isset( $slot['allowedBlocks'] ) || ! is_array( $slot['allowedBlocks'] ) ) {
					continue;
				}

				foreach ( self::expand( $slot['allowedBlocks'] ) as $name ) {
					if ( ! in_array( $name, $allowed, true ) && $registry->is_registered( $name ) ) {
						$slot_only[ $name ][] = $section;
					}
				}
			}
		}

		return array_map( fn( $sections ) => array_values( array_unique( $sections ) ), $slot_only );
	}

	/**
	 * Slot-only blocks for the post being edited, for the editor (empty in
	 * the Site Editor, or without a theme list).
	 *
	 * @return array<string, string[]> Block name => section names.
	 */
	public static function editor_slot_only(): array {
		$post = get_post();

		if ( ! $post || 'site-editor' === get_current_screen()?->id ) {
			return [];
		}

		$allowed = self::theme_list( new WP_Block_Editor_Context( [ 'post' => $post ] ) );

		return null === $allowed ? [] : self::slot_only( $allowed );
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
