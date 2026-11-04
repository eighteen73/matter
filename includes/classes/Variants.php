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
		'matter/carousel' => [
			'label'          => 'Default',
			// Behaviour (Embla options and controls).
			'loop'           => false,
			'align'          => 'start',
			'slidesToScroll' => 1,
			'autoplay'       => 0,
			'arrows'         => true,
			'dots'           => true,
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
