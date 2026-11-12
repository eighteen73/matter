<?php
/**
 * The theme's PHP template parts, for the matter/template-part block.
 *
 * Block templates render version-controlled PHP parts (header, footer…) with
 * `<!-- wp:matter/template-part {"slug":"header"} /-->`. A part is any PHP
 * file in the theme's `template-parts/` folder (child theme first); its slug
 * is its path there without `.php`, e.g. `header` or `footer/social`.
 *
 * The editor previews a part with the stylesheets its render enqueues (e.g.
 * a menu's or panel's, with their generated breakpoint CSS), which core's
 * block renderer endpoint would drop, so the preview matches the front end.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Singleton;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use WP_REST_Request;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * Theme template parts.
 */
final class TemplatePart {

	use Singleton;

	/**
	 * The folder parts live in, relative to the theme.
	 */
	public const DIRECTORY = 'template-parts';

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'rest_api_init', [ $this, 'register_route' ] );
	}

	/**
	 * `GET matter/v1/template-part?slug=…`: the part's HTML and the styles it
	 * enqueued, for the editor preview.
	 *
	 * @return void
	 */
	public function register_route(): void {
		register_rest_route(
			'matter/v1',
			'/template-part',
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'preview' ],
				'permission_callback' => fn() => current_user_can( 'edit_posts' ),
				'args'                => [
					'slug' => [
						'type'              => 'string',
						'required'          => true,
						'validate_callback' => fn( $slug ) => is_string( $slug ) && self::is_valid_slug( $slug ),
					],
				],
			]
		);
	}

	/**
	 * Render a part through its block, with the stylesheets it enqueued.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return array{html: string, styles: string}
	 */
	public function preview( WP_REST_Request $request ): array {
		return Preview::render(
			[
				'blockName'    => 'matter/template-part',
				'attrs'        => [ 'slug' => (string) $request['slug'] ],
				'innerBlocks'  => [],
				'innerHTML'    => '',
				'innerContent' => [],
			]
		);
	}

	/**
	 * Whether a slug is a plain path inside the folder: no dots, so it can't
	 * leave `template-parts/`.
	 *
	 * @param string $slug Part slug.
	 * @return bool
	 */
	public static function is_valid_slug( string $slug ): bool {
		return 1 === preg_match( '#^[a-z0-9_-]+(?:/[a-z0-9_-]+)*$#i', $slug );
	}

	/**
	 * Render a part, passing it the block's attributes and context as `$args`.
	 *
	 * @param string $slug Part slug.
	 * @param array  $args Arguments for the part.
	 * @return string Empty for an invalid or missing part.
	 */
	public static function render( string $slug, array $args = [] ): string {
		if ( ! self::is_valid_slug( $slug ) || ! locate_template( self::DIRECTORY . "/{$slug}.php" ) ) {
			return '';
		}

		ob_start();
		get_template_part( self::DIRECTORY . "/{$slug}", null, $args );

		return (string) ob_get_clean();
	}

	/**
	 * Parts offered in the block's settings: files with a `Title:` header,
	 * sorted by title.
	 *
	 * @return array<int, array{slug: string, title: string}>
	 */
	public static function all(): array {
		$parts = [];

		// Parent first, so the child theme's file wins for the same slug.
		foreach ( array_unique( [ get_template_directory(), get_stylesheet_directory() ] ) as $theme ) {
			$directory = $theme . '/' . self::DIRECTORY;

			if ( ! is_dir( $directory ) ) {
				continue;
			}

			$files = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $directory, RecursiveDirectoryIterator::SKIP_DOTS ) );

			foreach ( $files as $file ) {
				if ( ! $file->isFile() || 'php' !== $file->getExtension() ) {
					continue;
				}

				$slug  = substr( str_replace( '\\', '/', substr( $file->getPathname(), strlen( $directory ) + 1 ) ), 0, -4 );
				$title = get_file_data( $file->getPathname(), [ 'title' => 'Title' ] )['title'];

				if ( '' !== $title && self::is_valid_slug( $slug ) ) {
					$parts[ $slug ] = $title;
				}
			}
		}

		/**
		 * Filters the template parts offered in the editor.
		 *
		 * @param array<string, string> $parts Slug => title.
		 */
		$parts = (array) apply_filters( 'matter_template_parts', $parts );
		asort( $parts, SORT_NATURAL | SORT_FLAG_CASE );

		return array_map(
			fn( $slug, $title ) => [
				'slug'  => (string) $slug,
				'title' => (string) $title,
			],
			array_keys( $parts ),
			$parts
		);
	}
}
