<?php
/**
 * Plugin Name:       Matter
 * Plugin URI:        https://eighteen73.co.uk
 * Update URI:        https://eighteen73.co.uk
 * Description:       Blocks, sections, menus and site settings for eighteen73 WordPress builds.
 * Version:           1.2.0
 * Requires at least: 7.1
 * Requires PHP:      8.3
 * Requires Plugins:
 * Author:            eighteen73
 * Author URI:        https://eighteen73.co.uk
 * Text Domain:       matter
 * Domain Path:       /languages
 *
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 *
 * @package           Eighteen73\Matter
 */

namespace Eighteen73\Matter;

defined( 'ABSPATH' ) || exit;

// What Matter needs, checked before anything else loads: its code uses PHP 8.3
// and WordPress 7.1 APIs, so older ones would fail with a fatal error.
$matter_requirements = [
	'PHP'       => [ PHP_VERSION, '8.3', PHP_VERSION_ID >= 80300 ],
	'WordPress' => [
		(string) ( $GLOBALS['wp_version'] ?? '0' ),
		'7.1 beta 1',
		// From 7.1 beta 1: the 7.1 APIs Matter uses (the icon registry) are
		// there from the beta, but an alpha build of 7.1 may not have them
		// yet, and a plain `7.1-alpha-123` would otherwise pass as 7.1 once
		// its suffix was stripped. Later versions' alphas (7.2-alpha) are past it.
		version_compare( (string) ( $GLOBALS['wp_version'] ?? '0' ), '7.1-beta1', '>=' ),
	],
];

foreach ( $matter_requirements as $matter_name => [ $matter_have, $matter_need, $matter_ok ] ) {
	if ( $matter_ok ) {
		continue;
	}

	add_action(
		'admin_notices',
		static function () use ( $matter_name, $matter_have, $matter_need ) {
			printf(
				'<div class="notice notice-error"><p><strong>%1$s</strong>: %2$s</p></div>',
				esc_html__( 'Matter', 'matter' ),
				esc_html(
					sprintf(
						/* translators: 1: PHP or WordPress, 2: version needed, 3: version in use. */
						__( 'Matter needs %1$s %2$s or later (this site has %3$s), so it is switched off.', 'matter' ),
						$matter_name,
						$matter_need,
						$matter_have
					)
				)
			);
		}
	);

	return;
}

unset( $matter_requirements, $matter_name, $matter_have, $matter_need, $matter_ok );

// Useful global constants.
define( 'MATTER_VERSION', '1.2.0' );
define( 'MATTER_URL', plugin_dir_url( __FILE__ ) );
define( 'MATTER_PATH', plugin_dir_path( __FILE__ ) );
define( 'MATTER_INC', MATTER_PATH . 'includes/' );

// Require the autoloader.
$autoloader = MATTER_PATH . '/vendor/autoload.php';

if ( file_exists( $autoloader ) ) {
	require_once $autoloader;
} else {
	add_action(
		'admin_notices',
		function () {
			printf(
				'<div class="notice notice-error"><p><strong>%s</strong>: %s</p></div>',
				esc_html__( 'Matter', 'matter' ),
				sprintf(
					/* translators: %s: composer install command */
					esc_html__( 'Composer dependencies not found. Please run %s to install required dependencies.', 'matter' ),
					'composer install'
				)
			);
		}
	);
	return;
}

// Public functions.
require_once MATTER_INC . 'functions.php';

// Initialise the plugin.
Plugin::instance()->setup();
