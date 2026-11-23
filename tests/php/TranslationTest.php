<?php
/**
 * Matter's script translations are found in its own languages folder.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Plugin;

/**
 * Translation files.
 */
class TranslationTest extends TestCase {

	/**
	 * Matter's domain gets the file in its languages folder when there is one;
	 * another domain, or a file that isn't there, is left as WordPress had it.
	 *
	 * @return void
	 */
	public function test_script_translation_file_filter(): void {
		$name = 'matter-xx_XX-' . md5( 'test' ) . '.json';
		$own  = MATTER_PATH . 'languages/' . $name;
		$wp   = '/var/www/html/wp-content/languages/plugins/' . $name;

		$this->assertNotFalse( has_filter( 'load_script_translation_file', [ Plugin::instance(), 'script_translation_file' ] ) );

		file_put_contents( $own, '{}' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents

		try {
			$this->assertSame( $own, apply_filters( 'load_script_translation_file', $wp, 'matter-menu', 'matter' ) );

			// Another domain is untouched, even with a same-named file in Matter's folder.
			$this->assertSame( $wp, apply_filters( 'load_script_translation_file', $wp, 'other-script', 'other' ) );
			$this->assertFalse( apply_filters( 'load_script_translation_file', false, 'matter-menu', 'matter' ) );
		} finally {
			unlink( $own ); // phpcs:ignore WordPress.WP.AlternativeFunctions.unlink_unlink
		}

		// No file of that name in Matter's folder: WordPress's own path stays.
		$this->assertSame( $wp, apply_filters( 'load_script_translation_file', $wp, 'matter-menu', 'matter' ) );
	}
}
