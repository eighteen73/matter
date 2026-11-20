<?php
/**
 * Base test case.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Ids;
use Eighteen73\Matter\Navigation\Menu;
use Eighteen73\Matter\Overlays\Panel;
use WP_UnitTestCase;

/**
 * Base test case.
 */
abstract class TestCase extends WP_UnitTestCase {

	use Snapshots;

	/**
	 * Every test starts a new page: nothing is claimed yet.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		Ids::reset();
		self::reset_static_caches();
	}

	/**
	 * Forget what the panel and menu classes remember between renders (the
	 * panel settings, and the generated CSS already printed), so a render
	 * doesn't depend on the tests that ran before it.
	 *
	 * @return void
	 */
	protected static function reset_static_caches(): void {
		foreach ( [
			Panel::class => [ 'panels', 'printed_css', 'rendered' ],
			Menu::class  => [ 'printed_css' ],
		] as $class => $properties ) {
			foreach ( $properties as $property ) {
				( new \ReflectionProperty( $class, $property ) )->setValue( null, [] );
			}
		}
	}

	/**
	 * Render block markup as the front end would.
	 *
	 * @param string $markup Serialised blocks.
	 * @return string
	 */
	protected function render( string $markup ): string {
		return do_blocks( $markup );
	}
}
