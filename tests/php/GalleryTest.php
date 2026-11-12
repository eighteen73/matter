<?php
/**
 * Gallery: lightbox data matches the images shown.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

/**
 * Gallery.
 */
class GalleryTest extends TestCase {

	/**
	 * An image block without an image doesn't shift the lightbox, and the
	 * lightbox uses each block's own alt text.
	 *
	 * @return void
	 */
	public function test_lightbox_skips_empty_images_and_uses_block_alt(): void {
		$image = fn( string $src, string $alt ) => '<!-- wp:image --><figure class="wp-block-image"><img src="' . $src . '" alt="' . $alt . '"/></figure><!-- /wp:image -->';

		$html = $this->render(
			'<!-- wp:matter/gallery {"lightbox":true} -->'
			. $image( 'https://example.com/one.jpg', 'First image' )
			. '<!-- wp:image --><figure class="wp-block-image"><img alt=""/></figure><!-- /wp:image -->'
			. $image( 'https://example.com/three.jpg', 'Third image' )
			. '<!-- /wp:matter/gallery -->'
		);

		$this->assertSame( 2, substr_count( $html, 'class="wp-block-matter-gallery__open"' ) );
		$this->assertStringContainsString( 'Enlarge image 2 of 2', $html );

		// The lightbox list, as passed to the front end.
		$state = wp_interactivity_state( 'matter/gallery' );
		$json  = wp_json_encode( $state ) . $html;

		$this->assertStringContainsString( 'Third image', html_entity_decode( $json ) );
	}
}
