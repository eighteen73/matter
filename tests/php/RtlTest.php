<?php
/**
 * Right-to-left sites.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Assets;

/**
 * Right-to-left sites.
 */
class RtlTest extends TestCase {

	/**
	 * The site's text direction before the test.
	 *
	 * @var string
	 */
	private string $direction;

	/**
	 * Switch the site to right-to-left.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		$this->direction                       = $GLOBALS['wp_locale']->text_direction;
		$GLOBALS['wp_locale']->text_direction = 'rtl';
	}

	/**
	 * Restore the direction.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		$GLOBALS['wp_locale']->text_direction = $this->direction;

		parent::tear_down();
	}

	/**
	 * Carousels scroll right to left, and CSS printed inline is the flipped build.
	 *
	 * @return void
	 */
	public function test_rtl(): void {
		$html = $this->render( '<!-- wp:matter/carousel --><!-- wp:paragraph --><p>One</p><!-- /wp:paragraph --><!-- /wp:matter/carousel -->' );

		$this->assertStringContainsString( '"direction":"rtl"', $html );
		$this->assertStringEndsWith( 'build/menu/dropdown-rtl.css', Assets::style_path( 'menu/dropdown.css' ) );
		$this->assertSame( 'replace', wp_styles()->get_data( 'matter-menu', 'rtl' ) );
	}
}
