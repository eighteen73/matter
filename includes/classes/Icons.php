<?php
/**
 * Icons from the WordPress icon registry, for Matter's icon choices (button
 * icons, tab icons). The theme limits which collections editors see.
 *
 * The theme's own SVGs (`assets/svg/icons/*.svg`, child theme overriding the
 * parent) are registered as an icon collection, named after the theme's
 * folder unless the theme names it (`matter_theme_icons`). An icon's name is
 * stored in content (e.g. `pulsar/arrow-right`), so a theme should name its
 * collection explicitly if its folder may be renamed.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter;

defined( 'ABSPATH' ) || exit;

/**
 * Icon helpers.
 */
class Icons {

	use Singleton;

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'init', [ $this, 'register_theme_icons' ] );
	}

	/**
	 * Register the theme's SVGs as an icon collection.
	 *
	 * @return void
	 */
	public function register_theme_icons(): void {
		if ( ! function_exists( 'wp_register_icon_collection' ) || ! function_exists( 'wp_register_icon' ) ) {
			return;
		}

		$directories = [ get_template_directory() . '/assets/svg/icons' ];

		if ( is_child_theme() ) {
			$directories[] = get_stylesheet_directory() . '/assets/svg/icons';
		}

		/**
		 * Filters the theme's icon collection.
		 *
		 * @param array $args {
		 *     @type string   $collection  Collection slug, the prefix of every icon name.
		 *     @type string   $label       Name shown in the icon picker.
		 *     @type string[] $directories Folders of SVG files; later folders override earlier ones.
		 * }
		 */
		$args = (array) apply_filters(
			'matter_theme_icons',
			[
				// The theme's namespace (its parent's, for a child theme).
				'collection'  => (string) ( array_slice( theme_namespaces(), -1 )[0] ?? sanitize_key( get_template() ) ),
				'label'       => get_bloginfo( 'name' ) ?: __( 'Theme', 'matter' ),
				'directories' => $directories,
			]
		);

		$collection = sanitize_key( (string) ( $args['collection'] ?? '' ) );
		$files      = self::svg_files( (array) ( $args['directories'] ?? [] ) );

		if ( '' === $collection || ! $files ) {
			return;
		}

		wp_register_icon_collection(
			$collection,
			[
				'label'       => (string) ( $args['label'] ?? $collection ),
				'description' => __( 'Theme icons.', 'matter' ),
			]
		);

		foreach ( $files as $slug => $file ) {
			wp_register_icon(
				"{$collection}/{$slug}",
				[
					'label'     => ucwords( str_replace( [ '-', '_' ], ' ', $slug ) ),
					'file_path' => $file,
				]
			);
		}
	}

	/**
	 * SVG files in the folders, keyed by icon slug (the file name). Later
	 * folders override earlier ones.
	 *
	 * @param string[] $directories Folders.
	 * @return array<string, string> Slug => file path.
	 */
	private static function svg_files( array $directories ): array {
		$files = [];

		foreach ( array_unique( $directories ) as $directory ) {
			foreach ( glob( trailingslashit( (string) $directory ) . '*.svg' ) ?: [] as $file ) {
				$slug = sanitize_title( basename( $file, '.svg' ) );

				if ( preg_match( '/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/', $slug ) ) {
					$files[ $slug ] = $file;
				}
			}
		}

		return $files;
	}

	/**
	 * Icon collections offered in the editor (empty = all).
	 *
	 * @return string[]
	 */
	public static function collections(): array {
		/**
		 * Filters the icon collections editors can choose icons from.
		 *
		 * @param string[] $collections Collection slugs; empty allows every collection.
		 */
		return array_values( (array) apply_filters( 'matter_icon_collections', [] ) );
	}

	/**
	 * An icon's inline SVG, wrapped in a span with the given class.
	 *
	 * @param string $name  Icon name, e.g. pulsar/arrow-right.
	 * @param string $classname Wrapper class.
	 * @return string Empty when the icon doesn't exist.
	 */
	public static function render( string $name, string $classname ): string {
		if ( '' === $name || ! function_exists( 'wp_get_icon' ) ) {
			return '';
		}

		$svg = (string) wp_get_icon( $name, [ 'size' => null ] );

		return '' !== $svg
			? sprintf( '<span class="%1$s" aria-hidden="true">%2$s</span>', esc_attr( $classname ), $svg )
			: '';
	}
}
