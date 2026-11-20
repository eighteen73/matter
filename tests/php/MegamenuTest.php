<?php
/**
 * Megamenu fields saved from Appearance > Menus.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Navigation\Megamenu;

/**
 * Megamenu::save_fields().
 */
class MegamenuTest extends TestCase {

	/**
	 * A menu item to save fields for.
	 *
	 * @var int
	 */
	private int $item;

	/**
	 * A menu item, an administrator, and no request.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		$menu       = wp_create_nav_menu( 'Megamenu test' );
		$this->item = wp_update_nav_menu_item(
			$menu,
			0,
			[
				'menu-item-title'  => 'Shop',
				'menu-item-url'    => 'https://example.com/shop/',
				'menu-item-status' => 'publish',
			]
		);

		wp_set_current_user( self::factory()->user->create( [ 'role' => 'administrator' ] ) );
		$_POST = [];
	}

	/**
	 * No request is left for the next test.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		$_POST = [];

		parent::tear_down();
	}

	/**
	 * A request from the menu screen, with the fields for the item.
	 *
	 * @param array<string, mixed> $fields Megamenu fields.
	 * @param string|null          $nonce  Nonce, or null for a valid one.
	 * @return void
	 */
	private function request( array $fields, ?string $nonce = null ): void {
		$_POST = [
			'update-nav-menu-nonce' => $nonce ?? wp_create_nonce( 'update-nav_menu' ),
			'matter-megamenu'       => [ $this->item => $fields ],
		];
	}

	/**
	 * Run the save as the menu screen does.
	 *
	 * @return void
	 */
	private function save(): void {
		Megamenu::instance()->save_fields( 0, $this->item );
	}

	/**
	 * A valid save stores the flag, the width and the panel.
	 *
	 * @return void
	 */
	public function test_a_valid_save_stores_the_fields(): void {
		add_filter( 'matter_megamenu_panels', fn() => [ 'shop' => 'Shop' ] );

		$this->request(
			[
				'enabled' => '1',
				'width'   => 'full',
				'panel'   => 'shop',
			]
		);
		$this->save();

		$this->assertSame( '1', get_post_meta( $this->item, Megamenu::META_ENABLED, true ) );
		$this->assertSame( 'full', get_post_meta( $this->item, Megamenu::META_WIDTH, true ) );
		$this->assertSame( 'shop', get_post_meta( $this->item, Megamenu::META_PANEL, true ) );
	}

	/**
	 * Without the menu screen's nonce nothing is saved.
	 *
	 * @return void
	 */
	public function test_a_bad_or_missing_nonce_saves_nothing(): void {
		foreach ( [ 'wrong', wp_create_nonce( 'something-else' ) ] as $nonce ) {
			$this->request( [ 'enabled' => '1', 'width' => 'full' ], $nonce ); // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
			$this->save();
		}

		$this->request( [ 'enabled' => '1', 'width' => 'full' ] ); // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
		unset( $_POST['update-nav-menu-nonce'] );
		$this->save();

		$this->assertSame( '', get_post_meta( $this->item, Megamenu::META_ENABLED, true ) );
		$this->assertSame( '', get_post_meta( $this->item, Megamenu::META_WIDTH, true ) );
	}

	/**
	 * A user who can't edit the theme's menus saves nothing, nonce or not.
	 *
	 * @return void
	 */
	public function test_without_the_capability_nothing_is_saved(): void {
		foreach ( [ 'subscriber', 'contributor', 'author', 'editor' ] as $role ) {
			wp_set_current_user( self::factory()->user->create( [ 'role' => $role ] ) );

			$this->request( [ 'enabled' => '1', 'width' => 'full' ] ); // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
			$this->save();

			$this->assertSame( '', get_post_meta( $this->item, Megamenu::META_ENABLED, true ), $role );
			$this->assertSame( '', get_post_meta( $this->item, Megamenu::META_WIDTH, true ), $role );
		}

		wp_set_current_user( 0 );
		$this->request( [ 'enabled' => '1' ] );
		$this->save();

		$this->assertSame( '', get_post_meta( $this->item, Megamenu::META_ENABLED, true ), 'logged out' );
	}

	/**
	 * Only the widths Matter has are kept: another one leaves the saved width
	 * alone.
	 *
	 * @return void
	 */
	public function test_widths_are_an_allowlist(): void {
		foreach ( Megamenu::WIDTHS as $width ) {
			$this->request( [ 'width' => $width ] );
			$this->save();

			$this->assertSame( $width, get_post_meta( $this->item, Megamenu::META_WIDTH, true ) );
		}

		foreach ( [ 'huge', '', '100vw', '<script>', [ 'full' ] ] as $width ) {
			$this->request( [ 'width' => $width ] );
			$this->save();

			$this->assertSame( 'full', get_post_meta( $this->item, Megamenu::META_WIDTH, true ), 'width ' . wp_json_encode( $width ) );
		}
	}

	/**
	 * A panel must be one the theme has: anything else (a path, a panel of
	 * another theme) removes the panel and stores nothing.
	 *
	 * @return void
	 */
	public function test_panels_are_an_allowlist(): void {
		add_filter( 'matter_megamenu_panels', fn() => [ 'shop' => 'Shop' ] );

		$this->request( [ 'panel' => 'shop' ] );
		$this->save();

		$this->assertSame( 'shop', get_post_meta( $this->item, Megamenu::META_PANEL, true ) );

		foreach ( [ '../../wp-config', 'gone', 'shop/../x', '', 'Shop' ] as $panel ) {
			$this->request( [ 'panel' => 'shop' ] );
			$this->save();
			$this->request( [ 'panel' => $panel ] );
			$this->save();

			$this->assertSame( '', get_post_meta( $this->item, Megamenu::META_PANEL, true ), "panel {$panel}" );
		}
	}

	/**
	 * Unticking the box removes the flag.
	 *
	 * @return void
	 */
	public function test_unticking_removes_the_flag(): void {
		$this->request( [ 'enabled' => '1' ] );
		$this->save();

		$this->assertSame( '1', get_post_meta( $this->item, Megamenu::META_ENABLED, true ) );

		$this->request( [ 'width' => 'wide' ] );
		$this->save();

		$this->assertSame( '', get_post_meta( $this->item, Megamenu::META_ENABLED, true ) );
	}
}
