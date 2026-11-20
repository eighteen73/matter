<?php
/**
 * Main plugin class.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter;

use Eighteen73\Matter\Archives\Archives;
use Eighteen73\Matter\Blocks\Instances;
use Eighteen73\Matter\Blocks\LoopItem;
use Eighteen73\Matter\Blocks\QueryDisplay;
use Eighteen73\Matter\Blocks\Registry;
use Eighteen73\Matter\Blocks\TemplatePart;
use Eighteen73\Matter\Extensions\ButtonIcon;
use Eighteen73\Matter\Extensions\FocalPoint;
use Eighteen73\Matter\Extensions\ImageSizes;
use Eighteen73\Matter\Filters\Filters;
use Eighteen73\Matter\Integrations\Integrations;
use Eighteen73\Matter\Navigation\Megamenu;
use Eighteen73\Matter\Live\Live;
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

		// IDs are unique within a page: say when a page starts.
		Ids::setup();

		// Blocks.
		Registry::instance()->setup();
		Instances::instance()->setup();
		QueryDisplay::instance()->setup();
		LoopItem::instance()->setup();
		Variants::instance()->setup();
		AllowedBlocks::instance()->setup();
		TemplatePart::instance()->setup();
		Icons::instance()->setup();

		// Sections, block supports and core block extensions.
		Sections::instance()->setup();
		Scheme::instance()->setup();
		Link::instance()->setup();
		ButtonIcon::instance()->setup();
		FocalPoint::instance()->setup();
		ImageSizes::instance()->setup();
		Editor::instance()->setup();

		// Menus, panels and other PHP-rendered components.
		Assets::instance()->setup();
		Megamenu::instance()->setup();

		// Site settings.
		Settings::instance()->setup();

		// Editable content around archive lists.
		Archives::instance()->setup();

		// Filters for a listing (replacing FacetWP).
		Filters::instance()->setup();

		// Blocks whose output depends on who is looking (a price), as
		// placeholders the browser fills.
		Live::instance()->setup();

		// What Matter does with other plugins (WooCommerce, Gravity Forms),
		// booted once they've loaded and only when they're active.
		Integrations::instance()->setup();
	}

	/**
	 * Load plugin textdomain.
	 *
	 * @return void
	 */
	public function load_textdomain(): void {
		// Matter is a must-use plugin, so its path is relative to the mu-plugins folder.
		load_muplugin_textdomain( 'matter', basename( MATTER_PATH ) . '/languages' );
	}
}
