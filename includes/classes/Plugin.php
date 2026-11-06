<?php
/**
 * Main plugin class.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter;

use Eighteen73\Matter\Archives\Archives;
use Eighteen73\Matter\Blocks\GravityForm;
use Eighteen73\Matter\Blocks\Instances;
use Eighteen73\Matter\Blocks\Registry;
use Eighteen73\Matter\Extensions\ButtonIcon;
use Eighteen73\Matter\Extensions\FocalPoint;
use Eighteen73\Matter\Navigation\Megamenu;
use Eighteen73\Matter\Sections\Sections;
use Eighteen73\Matter\Settings\Settings;
use Eighteen73\Matter\Supports\Link;
use Eighteen73\Matter\Supports\Scheme;

defined( 'ABSPATH' ) || exit;

/**
 * Main Plugin class.
 */
class Plugin {

	use Singleton;

	/**
	 * Setup the plugin.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'init', [ $this, 'load_textdomain' ] );

		// Blocks.
		Registry::instance()->setup();
		Instances::instance()->setup();
		GravityForm::instance()->setup();
		Variants::instance()->setup();

		// Sections, block supports and core block extensions.
		Sections::instance()->setup();
		Scheme::instance()->setup();
		Link::instance()->setup();
		ButtonIcon::instance()->setup();
		FocalPoint::instance()->setup();
		Editor::instance()->setup();

		// Menus, panels and other PHP-rendered components.
		Assets::instance()->setup();
		Megamenu::instance()->setup();

		// Site settings.
		Settings::instance()->setup();

		// Editable content around archive lists.
		Archives::instance()->setup();
	}

	/**
	 * Load plugin textdomain.
	 *
	 * @return void
	 */
	public function load_textdomain(): void {
		load_plugin_textdomain( 'matter', false, dirname( plugin_basename( MATTER_PATH . 'matter.php' ) ) . '/languages' );
	}
}
