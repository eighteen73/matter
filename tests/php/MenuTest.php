<?php
/**
 * Menus.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

/**
 * Menus.
 */
class MenuTest extends TestCase {

	/**
	 * A menu with a parent page that has a child.
	 *
	 * @return int Menu ID.
	 */
	private function menu(): int {
		$menu   = wp_create_nav_menu( 'Test ' . wp_generate_password( 6, false ) );
		$parent = wp_update_nav_menu_item(
			$menu,
			0,
			[
				'menu-item-title'  => 'Services',
				'menu-item-url'    => 'https://example.com/services/',
				'menu-item-status' => 'publish',
			]
		);

		wp_update_nav_menu_item(
			$menu,
			0,
			[
				'menu-item-title'     => 'Design',
				'menu-item-url'       => 'https://example.com/services/design/',
				'menu-item-parent-id' => $parent,
				'menu-item-status'    => 'publish',
			]
		);

		return $menu;
	}

	/**
	 * Submenus that open on click always link to their parent page.
	 *
	 * @return void
	 */
	public function test_click_menus_link_parent_pages(): void {
		$menu = $this->menu();
		$link = 'class="matter-menu__view-all" href="https://example.com/services/"';

		$this->assertStringContainsString(
			$link,
			\Eighteen73\Matter\get_menu(
				[
					'menu'     => $menu,
					'opens_on' => 'click',
					'view_all' => false,
				]
			)
		);

		$this->assertStringNotContainsString(
			$link,
			\Eighteen73\Matter\get_menu(
				[
					'menu'     => $menu,
					'view_all' => false,
				]
			)
		);
	}
}
