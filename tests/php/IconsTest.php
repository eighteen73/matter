<?php
/**
 * The theme's icons are in the icon registry for everything that reads it.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Icons;

/**
 * Icons.
 */
class IconsTest extends TestCase {

	/**
	 * Registered on init, not when Matter's blocks first ask: core's Icon block
	 * and wp_get_icon() never go through Icons::render().
	 *
	 * @return void
	 */
	public function test_theme_icons_register_on_init(): void {
		$this->assertNotFalse( has_action( 'init', [ Icons::instance(), 'register_theme_icons' ] ) );
	}

	/**
	 * Core's Icon block renders a theme icon.
	 *
	 * @return void
	 */
	public function test_core_icon_block_renders_a_theme_icon(): void {
		$this->assertStringContainsString( '<svg', $this->render( '<!-- wp:icon {"icon":"matter-test-theme/star"} /-->' ) );
	}

	/**
	 * wp_get_icon() finds a theme icon.
	 *
	 * @return void
	 */
	public function test_wp_get_icon_finds_a_theme_icon(): void {
		$this->assertStringContainsString( '<svg', (string) wp_get_icon( 'matter-test-theme/star' ) );
	}
}
