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

	/**
	 * Menus render outside the loop (as in classic themes), so a filter that
	 * retitles the current page in the loop doesn't retitle a menu item, and
	 * the loop carries on afterwards.
	 *
	 * @return void
	 */
	public function test_menus_render_outside_the_loop(): void {
		global $wp_query;

		$menu = $this->menu();

		$retitle = static fn( $title ) => in_the_loop() ? 'Retitled' : $title;
		add_filter( 'the_title', $retitle );

		$wp_query->in_the_loop = true;
		$html                  = \Eighteen73\Matter\get_menu( [ 'menu' => $menu ] );
		$still_in_the_loop     = $wp_query->in_the_loop;
		$wp_query->in_the_loop = false;

		remove_filter( 'the_title', $retitle );

		$this->assertStringContainsString( 'Services', $html );
		$this->assertStringNotContainsString( 'Retitled', $html );
		$this->assertTrue( $still_in_the_loop );
	}

	/**
	 * The same menu twice on a page (a header and a panel): the menu's own ID,
	 * its submenus' IDs and every item's ID stay unique.
	 *
	 * @return void
	 */
	public function test_a_menu_rendered_twice_has_unique_ids(): void {
		$menu  = $this->menu();
		$first = \Eighteen73\Matter\get_menu( [ 'menu' => $menu ] );
		$other = \Eighteen73\Matter\get_menu( [ 'menu' => $menu ] );

		preg_match_all( '/\sid="([^"]+)"/', $first . $other, $found );

		$this->assertGreaterThan( 4, count( $found[1] ) );
		$this->assertSame( $found[1], array_unique( $found[1] ), 'IDs repeat' );
		$this->assertMatchesRegularExpression( '/<li id="matter-menu-[^"]*-2-item-\d+"/', $other );
		$this->assertMatchesRegularExpression( '/aria-controls="matter-menu-[^"]*-2-submenu-1"/', $other );
	}

	/**
	 * Megamenu panels come from the parent theme and the child's folders, the
	 * child's winning a name they share.
	 *
	 * @return void
	 */
	public function test_megamenu_panels_merge_parent_and_child(): void {
		$base   = trailingslashit( get_temp_dir() ) . 'matter-panels-' . wp_generate_password( 6, false );
		$parent = "{$base}/parent";
		$child  = "{$base}/child";

		foreach ( [ $parent, $child ] as $directory ) {
			wp_mkdir_p( "{$directory}/template-parts/megamenu" );
		}

		file_put_contents( "{$parent}/template-parts/megamenu/shop.php", "<?php\n/**\n * Title: Parent shop\n */\n" );
		file_put_contents( "{$parent}/template-parts/megamenu/about.php", "<?php\n/**\n * Title: About\n */\n" );
		file_put_contents( "{$child}/template-parts/megamenu/shop.php", "<?php\n/**\n * Title: Child shop\n */\n" );
		file_put_contents( "{$child}/template-parts/megamenu/extra.php", "<?php\n" );

		$directory = fn( string $dir ) => fn() => $dir;

		add_filter( 'template_directory', $directory( $parent ) );
		add_filter( 'stylesheet_directory', $directory( $child ) );

		$panels = \Eighteen73\Matter\Navigation\Megamenu::get_panels();

		remove_all_filters( 'template_directory' );
		remove_all_filters( 'stylesheet_directory' );

		$this->assertSame(
			[
				'about' => 'About',
				'extra' => 'extra',
				'shop'  => 'Child shop',
			],
			$panels
		);
	}
}
