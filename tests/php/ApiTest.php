<?php
/**
 * Public API names: the head stub and the CSS variable names.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Assets;
use Eighteen73\Matter\Supports\Scheme;

/**
 * API names.
 */
class ApiTest extends TestCase {

	/**
	 * The stub keeps its queue under a symbol, not on `window.matter`.
	 *
	 * @return void
	 */
	public function test_stub_has_no_underscore_keys(): void {
		$stub = Assets::api_stub();

		$this->assertStringContainsString( 'Symbol.for("matter")', $stub );
		$this->assertDoesNotMatchRegularExpression( '/\bm\._\w+/', $stub );

		foreach ( Assets::API_TYPES as $type ) {
			$this->assertStringContainsString( '"' . $type . '"', $stub );
		}
	}

	/**
	 * The stub is what tells CSS that JavaScript is running.
	 *
	 * @return void
	 */
	public function test_stub_marks_the_page(): void {
		$stub = Assets::api_stub();

		$this->assertStringContainsString( 'classList.add("matter-js")', $stub );
		$this->assertStringContainsString( 'classList.add("matter-late")', $stub );
		// Before the early return, so a second stub on the page still marks it.
		$this->assertLessThan( strpos( $stub, 'if(m.ready)return' ), strpos( $stub, 'matter-js' ) );
	}

	/**
	 * Names become the variables WordPress makes, without core's private function.
	 *
	 * @return void
	 */
	public function test_kebab(): void {
		foreach (
			[
				'brand'       => 'brand',
				'textMuted'   => 'text-muted',
				'text_muted'  => 'text-muted',
				'Text Muted'  => 'text-muted',
				'accent2'     => 'accent-2',
				'accent-2'    => 'accent-2',
				'primaryCTA'  => 'primary-cta',
				'dark-mode_1' => 'dark-mode-1',
				'text2Heading' => 'text-2-heading',
				'color1Dark'  => 'color-1-dark',
				'a1b2'        => 'a-1-b-2',
				'dark2mode'   => 'dark-2-mode',
				'1st'         => '1st',
				'HTMLText2'   => 'html-text-2',
				'über'        => 'über',
			] as $name => $expected
		) {
			$this->assertSame( $expected, Scheme::kebab( $name ), $name );
			$this->assertSame( _wp_to_kebab_case( $name ), Scheme::kebab( $name ), "equals core on {$name}" );
			$this->assertSame( _wp_to_kebab_case( $name ), Scheme::kebab_port( $name ), "port equals core on {$name}" );
		}
	}
}
