<?php
/**
 * The theme's icons are in the icon registry for everything that reads it.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Icons;
use ReflectionProperty;

/**
 * Icons.
 */
class IconsTest extends TestCase {

	/**
	 * Start without the theme's icons, as before `init`: by now the suite has
	 * registered them (on `init`, at bootstrap), which would let these tests
	 * pass whatever registers them. Each test then gets what `init` gives it.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		self::unregister_theme_icons();
		( new ReflectionProperty( Icons::class, 'registered' ) )->setValue( Icons::instance(), false );
	}

	/**
	 * Put the icons back for the tests that follow.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		self::unregister_theme_icons();
		( new ReflectionProperty( Icons::class, 'registered' ) )->setValue( Icons::instance(), false );
		Icons::instance()->register_theme_icons();

		parent::tear_down();
	}

	/**
	 * Remove the test theme's icon collection from the registry.
	 *
	 * @return void
	 */
	private static function unregister_theme_icons(): void {
		foreach ( \WP_Icons_Registry::get_instance()->get_registered_icons( 'matter-test-theme/' ) as $icon ) {
			wp_unregister_icon( $icon['name'] );
		}

		if ( \WP_Icon_Collections_Registry::get_instance()->is_registered( 'matter-test-theme' ) ) {
			wp_unregister_icon_collection( 'matter-test-theme' );
		}
	}

	/**
	 * Run what Matter hooked to `init`, as WordPress does on every request
	 * (not the whole of `init`, which has run).
	 *
	 * @return void
	 */
	private static function run_init_callbacks(): void {
		global $wp_filter;

		foreach ( $wp_filter['init']->callbacks ?? [] as $callbacks ) {
			foreach ( $callbacks as $callback ) {
				if ( is_array( $callback['function'] ) && $callback['function'][0] instanceof Icons ) {
					call_user_func( $callback['function'] );
				}
			}
		}
	}

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
		$this->assertStringNotContainsString( '<svg', $this->render( '<!-- wp:icon {"icon":"matter-test-theme/star"} /-->' ), 'not there before init' );

		self::run_init_callbacks();

		$this->assertStringContainsString( '<svg', $this->render( '<!-- wp:icon {"icon":"matter-test-theme/star"} /-->' ) );
	}

	/**
	 * wp_get_icon() finds a theme icon.
	 *
	 * @return void
	 */
	public function test_wp_get_icon_finds_a_theme_icon(): void {
		$this->assertSame( '', (string) wp_get_icon( 'matter-test-theme/star' ), 'not there before init' );

		self::run_init_callbacks();

		$this->assertStringContainsString( '<svg', (string) wp_get_icon( 'matter-test-theme/star' ) );
	}
}
