<?php
/**
 * PHPUnit bootstrap, run inside wp-env's tests container:
 *
 *     npm run test:php
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

// The fixture theme, whatever the database says.
tests_add_filter( 'pre_option_template', fn() => 'matter-test-theme' );
tests_add_filter( 'pre_option_stylesheet', fn() => 'matter-test-theme' );

require $matter_tests_dir . '/includes/bootstrap.php';
require __DIR__ . '/includes/Snapshots.php';
require __DIR__ . '/includes/TestCase.php';
