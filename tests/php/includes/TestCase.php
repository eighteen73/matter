<?php
/**
 * Base test case.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Ids;
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
