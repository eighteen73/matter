<?php
/**
 * Megamenu template part helpers.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Megamenu block.
 */
class Megamenu {

	use Singleton;

	/**
	 * Template part area slug.
	 *
	 * @var string
	 */
	public const AREA = 'megamenu';

	/**
	 * Slugs currently being rendered, keyed to prevent recursion.
	 *
	 * @var array<string, true>
	 */
	private static $rendering_slugs = [];

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'default_wp_template_part_areas', [ $this, 'register_template_part_area' ] );
		add_action( 'init', [ $this, 'register_template_part_area_term' ], 11 );
	}

	/**
	 * Register the megamenu template part area.
	 *
	 * @param array<int, array<string, string>> $areas Template part areas.
	 * @return array<int, array<string, string>>
	 */
	public function register_template_part_area( array $areas ): array {
		$areas[] = [
			'area'        => self::AREA,
			'label'       => __( 'Megamenu', 'matter' ),
			'description' => __( 'Template parts used as megamenu panels in navigation.', 'matter' ),
			'icon'        => 'layout',
			'area_tag'    => 'div',
		];

		return $areas;
	}

	/**
	 * Ensure the megamenu area exists as a wp_template_part_area term.
	 *
	 * Core stores the area via tax_input. Without this term, newly created
	 * parts can fall back to "uncategorized".
	 *
	 * @return void
	 */
	public function register_template_part_area_term(): void {
		if ( ! taxonomy_exists( 'wp_template_part_area' ) ) {
			return;
		}

		if ( term_exists( self::AREA, 'wp_template_part_area' ) ) {
			return;
		}

		wp_insert_term(
			self::AREA,
			'wp_template_part_area',
			[
				'slug'        => self::AREA,
				'description' => __( 'Template parts used as megamenu panels in navigation.', 'matter' ),
			]
		);
	}

	/**
	 * Render a megamenu template part by slug.
	 *
	 * @param string $slug Template part slug.
	 * @return string
	 */
	public static function render_template_part( string $slug ): string {
		$slug = sanitize_title( $slug );

		if ( '' === $slug ) {
			return '';
		}

		if ( isset( self::$rendering_slugs[ $slug ] ) ) {
			return '';
		}

		$template = self::get_template_part( $slug );

		if ( ! $template || empty( $template->content ) ) {
			return '';
		}

		self::$rendering_slugs[ $slug ] = true;
		$html                           = do_blocks( $template->content );
		unset( self::$rendering_slugs[ $slug ] );

		return $html;
	}

	/**
	 * Load a template part, trying the child theme then the parent theme.
	 *
	 * @param string $slug Template part slug.
	 * @return \WP_Block_Template|null
	 */
	private static function get_template_part( string $slug ) {
		$stylesheets = array_unique(
			array_filter(
				[
					get_stylesheet(),
					get_template(),
				]
			)
		);

		foreach ( $stylesheets as $stylesheet ) {
			$template = get_block_template( $stylesheet . '//' . $slug, 'wp_template_part' );

			if ( $template && ! empty( $template->content ) ) {
				return $template;
			}
		}

		return null;
	}
}
