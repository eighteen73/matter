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
			] as $name => $expected
		) {
			$this->assertSame( $expected, Scheme::kebab( $name ), $name );
			$this->assertSame( $expected, _wp_to_kebab_case( $name ), "core agrees on {$name}" );
		}
	}
}
