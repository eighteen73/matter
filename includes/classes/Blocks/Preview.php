<?php
/**
 * Editor previews rendered by the server, with the stylesheets the render
 * enqueued (e.g. a menu's or tabs' generated CSS), which core's block
 * renderer endpoint would drop.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Server-rendered previews.
 */
final class Preview {

	/**
	 * Render a block, collecting the stylesheets (with their inline CSS)
	 * enqueued while it rendered.
	 *
	 * @param array $parsed_block Parsed block.
	 * @return array{html: string, styles: string}
	 */
	public static function render( array $parsed_block ): array {
		$styles = wp_styles();
		$queued = $styles->queue;

		$html = render_block( $parsed_block );

		ob_start();
		$styles->do_items( array_values( array_diff( $styles->queue, $queued ) ) );

		return [
			'html'   => $html,
			'styles' => (string) ob_get_clean(),
		];
	}
}
