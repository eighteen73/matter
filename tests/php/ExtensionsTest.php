<?php
/**
 * Core block extensions: button icon, focal point and image sizes.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

/**
 * Core block extensions.
 */
class ExtensionsTest extends TestCase {

	/**
	 * A button's icon is its `matterIcon`, from the theme's icon collection.
	 *
	 * @return void
	 */
	public function test_button_icon(): void {
		$button = fn( string $attrs ) => $this->render(
			'<!-- wp:button ' . $attrs . ' --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#">Go</a></div><!-- /wp:button -->'
		);

		$html = $button( '{"matterIcon":"matter-test-theme/star"}' );

		$this->assertMatchesRegularExpression( '/<a [^>]*class="[^"]*\bhas-icon\b/', $html );
		$this->assertStringContainsString( 'Go<span class="wp-block-button__icon" aria-hidden="true"><svg', $html );

		// The unprefixed name isn't Matter's.
		$this->assertStringNotContainsString( 'wp-block-button__icon', $button( '{"icon":"matter-test-theme/star"}' ) );
	}

	/**
	 * An image's focal point becomes one object-position, replacing core's.
	 *
	 * @return void
	 */
	public function test_image_focal_point(): void {
		$html = $this->render( '<!-- wp:image {"focalPoint":{"x":0.2,"y":0.8}} --><figure class="wp-block-image"><img src="a.jpg" alt=""/></figure><!-- /wp:image -->' );
		$this->assertStringContainsString( 'style="object-position:20% 80%"', $html );

		// Core saves object-position for images with a scale.
		$html = $this->render( '<!-- wp:image {"focalPoint":{"x":0.2,"y":0.8},"scale":"cover"} --><figure class="wp-block-image"><img src="a.jpg" alt="" style="object-fit:cover;object-position:20% 80%;width:10px"/></figure><!-- /wp:image -->' );
		$this->assertSame( 1, substr_count( $html, 'object-position' ) );
		$this->assertStringContainsString( 'style="object-fit:cover;width:10px;object-position:20% 80%"', $html );

		// The centre is the default, so nothing is added.
		$html = $this->render( '<!-- wp:image {"focalPoint":{"x":0.5,"y":0.5}} --><figure class="wp-block-image"><img src="a.jpg" alt=""/></figure><!-- /wp:image -->' );
		$this->assertStringNotContainsString( 'object-position', $html );
	}

	/**
	 * Wide and full-width images get `sizes` from their alignment, so the
	 * browser picks a file as wide as they're shown; core then adds the
	 * `srcset` and keeps it.
	 *
	 * @return void
	 */
	public function test_image_sizes(): void {
		$theme_json = fn( $data ) => $data->update_with(
			[
				'version'  => 3,
				'settings' => [ 'layout' => [ 'wideSize' => '1200px' ] ],
			]
		);

		add_filter( 'wp_theme_json_data_theme', $theme_json );
		wp_clean_theme_json_cache();

		$id    = self::factory()->attachment->create_upload_object( DIR_TESTDATA . '/images/33772.jpg' );
		$image = fn( string $align ) => wp_filter_content_tags(
			$this->render(
				'<!-- wp:image {"id":' . $id . ',"sizeSlug":"large"' . ( $align ? ',"align":"' . $align . '"' : '' ) . '} --><figure class="wp-block-image' . ( $align ? ' align' . $align : '' ) . ' size-large"><img src="' . wp_get_attachment_image_url( $id, 'large' ) . '" alt="" class="wp-image-' . $id . '"/></figure><!-- /wp:image -->'
			)
		);

		$full = $image( 'full' );

		// Lazy-loaded, so core puts `auto, ` first.
		$this->assertMatchesRegularExpression( '/sizes="(auto, )?100vw"/', $full );
		$this->assertStringContainsString( 'srcset=', $full );
		$this->assertMatchesRegularExpression( '/sizes="(auto, )?\\(max-width: 1200px\\) 100vw, 1200px"/', $image( 'wide' ) );

		// Others keep core's, from the chosen size.
		$this->assertMatchesRegularExpression( '/sizes="(auto, )?\(max-width: 1024px\) 100vw, 1024px"/', $image( '' ) );
		$this->assertStringNotContainsString( 'sizes="100vw"', $image( '' ) );

		remove_filter( 'wp_theme_json_data_theme', $theme_json );
		wp_clean_theme_json_cache();
	}

	/**
	 * A featured image's focal point applies only while the post has a
	 * featured image.
	 *
	 * @return void
	 */
	public function test_featured_image_focal_point_needs_an_image(): void {
		$post       = self::factory()->post->create();
		$attachment = self::factory()->attachment->create( [ 'post_mime_type' => 'image/jpeg' ] );
		$html       = '<figure class="wp-block-post-featured-image"><img src="a.jpg" alt=""/></figure>';
		$block      = new \WP_Block(
			[ 'blockName' => 'core/post-featured-image' ],
			[ 'postId' => $post ]
		);
		$focal      = \Eighteen73\Matter\Extensions\FocalPoint::instance();

		update_post_meta(
			$post,
			\Eighteen73\Matter\Extensions\FocalPoint::META_KEY,
			[
				'x' => 0.2,
				'y' => 0.8,
			]
		);

		// A point is kept after the image is removed: it applies to nothing.
		$this->assertStringNotContainsString( 'object-position', $focal->render_featured_image( $html, [], $block ) );

		update_post_meta( $post, '_thumbnail_id', $attachment );

		$this->assertStringContainsString( 'object-position:20% 80%', $focal->render_featured_image( $html, [], $block ) );
	}
}
