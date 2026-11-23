<?php
/**
 * The test environment itself: Matter loaded, fixture theme active, blocks
 * registered.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use WP_Block_Type_Registry;

/**
 * Harness checks.
 */
class HarnessTest extends TestCase {

	/**
	 * Matter, its blocks and the fixture theme are loaded.
	 *
	 * @return void
	 */
	public function test_environment(): void {
		$this->assertTrue( defined( 'MATTER_VERSION' ), 'Matter is loaded' );
		$this->assertSame( 'matter-test-theme', get_stylesheet() );

		$registry = WP_Block_Type_Registry::get_instance();

		foreach ( [ 'matter/accordion', 'matter/tabs', 'matter/carousel', 'matter/modal', 'matter/slot', 'matter-test/section' ] as $name ) {
			$this->assertTrue( $registry->is_registered( $name ), "{$name} is registered" );
		}
	}
}
