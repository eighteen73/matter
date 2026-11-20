<?php
/**
 * The menu walker's item kinds.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Navigation\Megamenu;
use Eighteen73\Matter\Navigation\Walker;

/**
 * Walker.
 */
class WalkerTest extends TestCase {

	/**
	 * Build a menu from nested items and render it.
	 *
	 * Each entry is `[ title, url, children, menu item fields, meta ]`, the
	 * last three optional.
	 *
	 * @param array<int, array> $items Items.
	 * @param array             $args  Menu arguments.
	 * @return string
	 */
	private function menu( array $items, array $args = [] ): string {
		$menu = wp_create_nav_menu( 'Walker ' . wp_generate_password( 6, false ) );

		$add = function ( array $entries, int $parent ) use ( &$add, $menu ): void {
			foreach ( $entries as $entry ) {
				$id = wp_update_nav_menu_item(
					$menu,
					0,
					array_merge(
						[
							'menu-item-title'     => $entry[0],
							'menu-item-url'       => $entry[1],
							'menu-item-parent-id' => $parent,
							'menu-item-status'    => 'publish',
						],
						$entry[3] ?? []
					)
				);

				foreach ( $entry[4] ?? [] as $key => $value ) {
					update_post_meta( $id, $key, $value );
				}

				$add( $entry[2] ?? [], $id );
			}
		};

		$add( $items, 0 );

		return \Eighteen73\Matter\get_menu( array_merge( [ 'menu' => $menu ], $args ) );
	}

	/**
	 * A link is a leaf: a link and nothing else.
	 *
	 * @return void
	 */
	public function test_a_leaf_is_a_link(): void {
		$html = $this->menu( [ [ 'Contact', 'https://example.com/contact/' ] ] );

		$this->assertStringContainsString( '<a class="matter-menu__link" href="https://example.com/contact/">Contact</a>', $html );
		$this->assertStringNotContainsString( 'has-submenu', $html );
		$this->assertStringNotContainsString( 'matter-menu__toggle', $html );
		$this->assertStringNotContainsString( 'matter-menu__submenu"', $html );
	}

	/**
	 * A parent with children gets a toggle that controls its submenu, a header
	 * with a back button, and a "view all" link to its page.
	 *
	 * @return void
	 */
	public function test_a_submenu(): void {
		$html = $this->menu( [ [ 'Services', 'https://example.com/services/', [ [ 'Design', 'https://example.com/design/' ] ] ] ] );

		$this->assertStringContainsString( 'has-submenu', $html );
		$this->assertMatchesRegularExpression( '/<button type="button" class="matter-menu__toggle" aria-expanded="false" aria-controls="(matter-menu-[^"]+-submenu-1)"/', $html );
		$this->assertMatchesRegularExpression( '/<div id="matter-menu-[^"]+-submenu-1" class="matter-menu__submenu" tabindex="-1" data-wp-bind--inert="state.isSubmenuInert">/', $html );
		$this->assertStringContainsString( 'class="matter-menu__back"', $html );
		$this->assertStringContainsString( 'aria-label="Back from Services"', $html );
		$this->assertStringContainsString( '<a class="matter-menu__view-all" href="https://example.com/services/" aria-label="View all Services">View all</a>', $html );
		$this->assertStringContainsString( '<ul class="matter-menu__submenu-items">', $html );
		$this->assertStringNotContainsString( 'is-megamenu', $html );
	}

	/**
	 * A top-level item flagged as a megamenu lays its children out as
	 * columns: second-level items are headings, third-level items their links,
	 * and a panel from the theme goes after them.
	 *
	 * @return void
	 */
	public function test_a_megamenu_has_columns(): void {
		add_filter( 'matter_megamenu_panels', fn() => [ 'x' => 'X' ] );

		$html = $this->menu(
			[
				[
					'Shop',
					'https://example.com/shop/',
					[
						[
							'Men',
							'https://example.com/men/',
							[ [ 'Shirts', 'https://example.com/shirts/' ] ],
						],
					],
					[],
					[
						Megamenu::META_ENABLED => 1,
						Megamenu::META_WIDTH   => 'full',
						Megamenu::META_PANEL   => 'x',
					],
				],
			]
		);

		$this->assertStringContainsString( 'has-submenu is-megamenu is-megamenu-full', $html );
		$this->assertStringContainsString( '<ul class="matter-menu__submenu-items matter-menu__columns">', $html );
		$this->assertMatchesRegularExpression( '/class="[^"]*\bis-column\b[^"]*"[^>]*>\s*<a class="matter-menu__link" href="https:\/\/example.com\/men\/">Men<\/a>/', $html );
		$this->assertStringContainsString( '<ul class="matter-menu__column-items">', $html );
		$this->assertStringContainsString( '>Shirts</a>', $html );
		// A column's own children are always shown: no toggle, and one submenu.
		$this->assertSame( 1, substr_count( $html, 'class="matter-menu__toggle"' ) );
		$this->assertSame( 1, substr_count( $html, 'class="matter-menu__submenu"' ) );
		$this->assertStringContainsString( '<div class="matter-menu__panel">', $html );
	}

	/**
	 * A megamenu flag only counts at the top level.
	 *
	 * @return void
	 */
	public function test_a_nested_megamenu_flag_is_ignored(): void {
		$html = $this->menu(
			[
				[
					'Top',
					'https://example.com/top/',
					[
						[
							'Nested',
							'https://example.com/nested/',
							[ [ 'Leaf', 'https://example.com/leaf/' ] ],
							[],
							[ Megamenu::META_ENABLED => 1 ],
						],
					],
				],
			]
		);

		$this->assertStringNotContainsString( 'is-megamenu', $html );
		$this->assertSame( 2, substr_count( $html, 'class="matter-menu__toggle"' ) );
	}

	/**
	 * An item with no address (`#` or empty) is a label, not a link, and has
	 * no "view all"; below the top level, with children, it is a column.
	 *
	 * @return void
	 */
	public function test_label_only_items(): void {
		$html = $this->menu(
			[
				[
					'Group',
					'#',
					[
						[
							'Heading',
							'#',
							[ [ 'Child', 'https://example.com/child/' ] ],
						],
					],
				],
			]
		);

		$this->assertStringContainsString( '<span class="matter-menu__link is-label">Group</span>', $html );
		$this->assertStringContainsString( '<span class="matter-menu__link is-label">Heading</span>', $html );
		$this->assertStringNotContainsString( 'matter-menu__view-all', $html );
		$this->assertStringContainsString( 'is-column', $html );
		$this->assertStringContainsString( '<ul class="matter-menu__column-items">', $html );
		$this->assertTrue( Walker::is_label_only( '#' ) );
		$this->assertTrue( Walker::is_label_only( '' ) );
		$this->assertTrue( Walker::is_label_only( 'https://example.com/page/#' ) );
		$this->assertFalse( Walker::is_label_only( 'https://example.com/page/#top' ) );
	}

	/**
	 * Titles, descriptions, link attributes and the filters' text are escaped.
	 *
	 * @return void
	 */
	public function test_output_is_escaped(): void {
		add_filter( 'matter_menu_back_text', fn() => 'Back <b>x</b>' );
		add_filter( 'matter_menu_view_all_text', fn() => 'All <i>y</i>' );

		$html = $this->menu(
			[
				[
					'Fish "n" <em>Chips</em>',
					'https://example.com/a?b=1&c=2',
					[
						[
							'Child',
							'javascript:alert(1)',
							[],
							[
								'menu-item-description' => '<script>alert(2)</script>',
								'menu-item-attr-title'  => '"><script>alert(3)</script>',
							],
						],
					],
					[ 'menu-item-attr-title' => 'A "title"' ],
				],
			]
		);

		$this->assertStringNotContainsString( '<script', $html );
		$this->assertStringNotContainsString( 'javascript:', $html );
		$this->assertStringContainsString( 'title="A &#8220;title&#8221;"', $html );
		$this->assertStringContainsString( 'href="https://example.com/a?b=1&#038;c=2"', $html );
		$this->assertStringContainsString( 'Back &lt;b&gt;x&lt;/b&gt;', $html );
		$this->assertStringContainsString( 'All &lt;i&gt;y&lt;/i&gt;', $html );
		$this->assertStringNotContainsString( '<b>x</b>', $html );
	}

	/**
	 * A link opened in a new tab is made safe, and a blank title still names
	 * the link.
	 *
	 * @return void
	 */
	public function test_new_tabs_and_untitled_items(): void {
		$html = $this->menu(
			[
				[ 'Out', 'https://example.org/', [], [ 'menu-item-target' => '_blank' ] ],
				[ ' ', 'https://example.com/blank/' ],
			]
		);

		$this->assertStringContainsString( 'target="_blank" rel="noopener"', $html );
		$this->assertStringContainsString( '>Untitled</a>', $html );
	}

	/**
	 * The view-all links are left out when asked, unless submenus open on
	 * click (they are then the only way to reach the parent's page).
	 *
	 * @return void
	 */
	public function test_view_all_can_be_turned_off(): void {
		$items = [ [ 'Services', 'https://example.com/services/', [ [ 'Design', 'https://example.com/design/' ] ] ] ];

		$this->assertStringNotContainsString( 'matter-menu__view-all', $this->menu( $items, [ 'view_all' => false ] ) );
		$this->assertStringContainsString(
			'matter-menu__view-all',
			$this->menu(
				$items,
				[
					'view_all' => false,
					'opens_on' => 'click',
				]
			)
		);
		$this->assertStringContainsString( 'matter-menu__view-all', $this->menu( $items ) );
	}

	/**
	 * A depth limit stops submenus at that depth.
	 *
	 * @return void
	 */
	public function test_depth_limits_submenus(): void {
		$items = [ [ 'Top', 'https://example.com/', [ [ 'Child', 'https://example.com/child/' ] ] ] ];
		$html  = $this->menu( $items, [ 'depth' => 1 ] );

		$this->assertStringContainsString( '>Top</a>', $html );
		$this->assertStringNotContainsString( 'Child', $html );
		$this->assertStringNotContainsString( 'matter-menu__toggle', $html );
	}
}
