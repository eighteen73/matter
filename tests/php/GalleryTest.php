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

	/**
	 * A caption with an ampersand reaches the lightbox as text, not as
	 * entities it would show as typed; an image outside the media library
	 * opens as itself.
	 *
	 * @return void
	 */
	public function test_lightbox_caption_is_text_and_unattached_images_open_as_themselves(): void {
		$images = $this->gallery_images( $this->render(
			'<!-- wp:matter/gallery {"lightbox":true} --><!-- wp:image --><figure class="wp-block-image"><img src="https://example.com/one.jpg" alt="One"/><figcaption class="wp-element-caption">Fish &amp; chips</figcaption></figure><!-- /wp:image --><!-- /wp:matter/gallery -->'
		) );

		$this->assertSame( 'Fish & chips', $images[0]['caption'] );
		$this->assertSame( 'https://example.com/one.jpg', $images[0]['src'] );
	}

	/**
	 * The lightbox's images from a rendered gallery's context.
	 *
	 * @param string $html Rendered gallery.
	 * @return array<int, array<string, string>>
	 */
	private function gallery_images( string $html ): array {
		preg_match( '/data-wp-context=\'(.*?)\'/s', $html, $match );

		return json_decode( html_entity_decode( $match[1] ?? '{}' ), true )['images'] ?? [];
	}

	/**
	 * An accordion's FAQ schema is text, not entities.
	 *
	 * @return void
	 */
	public function test_faq_schema_is_entity_decoded(): void {
		$html = $this->render(
			'<!-- wp:matter/accordion {"faqSchema":true} --><!-- wp:matter/accordion-item {"title":"Fish &amp; chips?"} --><!-- wp:paragraph --><p>Salt &amp; vinegar</p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item --><!-- /wp:matter/accordion -->'
		);

		preg_match( '/<script type="application\/ld\+json">(.*?)<\/script>/s', $html, $match );

		$schema = json_decode( $match[1] ?? '{}', true );

		$this->assertSame( 'Fish & chips?', $schema['mainEntity'][0]['name'] );
		$this->assertSame( 'Salt & vinegar', $schema['mainEntity'][0]['acceptedAnswer']['text'] );
	}
}
