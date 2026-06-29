<?php
/**
 * Plugin Name:       Matter
 * Plugin URI:        https://eighteen73.co.uk
 * Update URI:        https://eighteen73.co.uk
 * Description:       A collections of expertly crafted blocks for WordPress.
 * Version:           0.1.2
 * Requires at least: 6.8
 * Requires PHP:      7.4
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

// Useful global constants.
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

// Initialise the plugin.
Plugin::instance()->setup();

// Register activation and deactivation hooks.
register_activation_hook( __FILE__, [ Plugin::class, 'activation' ] );
register_deactivation_hook( __FILE__, [ Plugin::class, 'deactivation' ] );
