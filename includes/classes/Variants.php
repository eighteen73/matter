<?php
/**
 * Block variants: named, theme-defined presets for Matter blocks.
 *
 * Clients choose a variant (shown as a block style); the theme decides what it
 * means — layout and look in CSS (`.is-style-{slug}`), behaviour in options:
 *
 *     add_filter( 'matter_variants', fn( $variants ) => array_replace_recursive( $variants, [
 *         'matter/carousel' => [
 *             'cards' => [ 'label' => 'Cards', 'loop' => false, 'dots' => true ],
 *         ],
 *     ] ) );
 *
 * Each block defines its default options under the `default` key; variants
 * inherit them.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter;

defined( 'ABSPATH' ) || exit;

/**
 * Block variants.
 */
class Variants {

	use Singleton;

	/**
	 * Blocks' default options.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	private const DEFAULTS = [
		'matter/carousel'     => [
			'label'          => 'Default',
			// Behaviour (Embla options).
			'loop'           => false,
			'align'          => 'start',
			'slidesToScroll' => 1,
			// Seconds per slide (0 = off), or a continuous scroll speed
			// (e.g. 1, for a ticker of logos; 0 = off).
			'autoplay'       => 0,
			'autoScroll'     => 0,
			// Controls: groups of parts by position (before, stage = over the
			// slides, after). Parts: prev, next, dots, progress, timer,
			// counter, play, thumbnails (image slides), expand (gallery).
			'controls'       => [ 'after' => [ 'prev', 'dots', 'next' ] ],
			// Image size for the thumbnails part.
			'thumbnailSize'  => 'thumbnail',
			// Image-only carousels: default crop, an aspect ratio preset slug
			// (theme.json) or 'auto' for the images' own shape.
			'aspectRatio'    => 'auto',
		],
		'matter/tabs'         => [
			'label'         => 'Default',
			// Breakpoint below which tabs set to "Show as a dropdown on
			// smaller screens" switch to the dropdown. False: the theme does
			// it in CSS (`.wp-block-matter-tabs.has-dropdown`).
			'dropdownBelow' => 'md',
		],
		'matter/archive-loop' => [
			'label' => 'Default',
		],
		'matter/gallery'      => [
			'label'          => 'Default',
			// Registered image size used for every image in the gallery.
			// Carousel options above also apply to the gallery's carousel
			// layout.
			'imageSize'      => 'large',
			// Column counts editors can choose for the grid (empty: no
			// control; the theme's CSS sets the columns), and the default.
			'columns'        => [ 2, 3, 4 ],
			'defaultColumns' => 3,
			// Default crop: an aspect ratio preset slug (theme.json) or
			// 'auto' for the images' own shape.
			'aspectRatio'    => 'square',
		],
	];

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'init', [ $this, 'register_block_styles' ], 20 );
	}

	/**
	 * All variants, keyed by block then slug.
	 *
	 * @return array<string, array<string, array<string, mixed>>>
	 */
	public static function all(): array {
		$variants = array_map( fn( $defaults ) => [ 'default' => $defaults ], self::DEFAULTS );

		/**
		 * Filters block variants.
		 *
		 * @param array $variants Variants keyed by block name, then slug. The
		 *                        `default` variant holds the block's defaults.
		 */
		return (array) apply_filters( 'matter_variants', $variants );
	}

	/**
	 * Options for a block instance, from its chosen variant (block style).
	 *
	 * @param string $block_name Block name.
	 * @param array  $attributes Block attributes (className carries is-style-*).
	 * @return array<string, mixed>
	 */
	public static function get( string $block_name, array $attributes ): array {
		$variants = self::all()[ $block_name ] ?? [];
		$defaults = $variants['default'] ?? [];
		$slug     = 'default';

		if ( preg_match( '/(?:^|\s)is-style-([\w-]+)/', (string) ( $attributes['className'] ?? '' ), $matches ) ) {
			$slug = $matches[1];
		}

		return array_merge( $defaults, $variants[ $slug ] ?? [] );
	}

	/**
	 * Register variants as block styles so editors can pick them.
	 *
	 * @return void
	 */
	public function register_block_styles(): void {
		foreach ( self::all() as $block_name => $variants ) {
			if ( count( $variants ) < 2 ) {
				continue;
			}

			foreach ( $variants as $slug => $variant ) {
				register_block_style(
					$block_name,
					[
						'name'       => $slug,
						'label'      => (string) ( $variant['label'] ?? ucfirst( (string) $slug ) ),
						'is_default' => 'default' === $slug,
					]
				);
			}
		}
	}
}
