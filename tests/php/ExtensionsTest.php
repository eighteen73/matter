<?php
/**
 * Core block extensions: button icon and focal point.
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
}
