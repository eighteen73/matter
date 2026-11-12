<?php
/**
 * Base test case.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use WP_UnitTestCase;

/**
 * Base test case.
 */
abstract class TestCase extends WP_UnitTestCase {

	use Snapshots;

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
