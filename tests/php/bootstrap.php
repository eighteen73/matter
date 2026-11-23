<?php
/**
 * PHPUnit bootstrap, run in the cli container of wp-env's test site
 * (.wp-env.tests.json, its own database, which the test suite reinstalls):
 *
 *     npm run test:php
 *
 * and, without WooCommerce or Gravity Forms (their own site, port 8889 too):
 *
 *     npm run test:php:nowc
 *
 * Matter is loaded by the must-use loader that wp-env maps in
 * (tests/wp-env/matter-loader.php), as on a real site, and the fixture theme
 * (tests/fixtures/matter-test-theme) is active.
 *
 * @package Eighteen73\Matter
 */

$matter_tests_dir = getenv( 'WP_TESTS_DIR' ) ?: rtrim( sys_get_temp_dir(), '/\\' ) . '/wordpress-tests-lib';

if ( ! file_exists( $matter_tests_dir . '/includes/functions.php' ) ) {
	echo "Could not find the WordPress test library in {$matter_tests_dir}. Run the tests with `npm run test:php`." . PHP_EOL; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	exit( 1 );
}

define( 'WP_TESTS_PHPUNIT_POLYFILLS_PATH', dirname( __DIR__, 2 ) . '/vendor/yoast/phpunit-polyfills' );

require_once $matter_tests_dir . '/includes/functions.php';

// Gravity Forms' public API, stubbed, so its integration boots and its block
// renders. `npm run test:php:nowc` (MATTER_TESTS_WITHOUT_PLUGINS) leaves it
// out, as on a site without the plugin. WooCommerce isn't loaded here: PHPUnit
// has its own database prefix, where no plugin is active.
if ( ! getenv( 'MATTER_TESTS_WITHOUT_PLUGINS' ) ) {
	tests_add_filter(
		'muplugins_loaded',
		static function (): void {
			require __DIR__ . '/../fixtures/gravity-forms-stub/gravity-forms-stub.php';
		}
	);
}

// The fixture theme, whatever the database says.
tests_add_filter( 'pre_option_template', fn() => 'matter-test-theme' );
tests_add_filter( 'pre_option_stylesheet', fn() => 'matter-test-theme' );

require $matter_tests_dir . '/includes/bootstrap.php';
require __DIR__ . '/includes/Snapshots.php';
require __DIR__ . '/includes/TestCase.php';
