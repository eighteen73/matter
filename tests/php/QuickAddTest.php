<?php
/**
 * Quick add: the theme's pattern, the block turned on with WooCommerce, and
 * the modal its buttons open. (PHPUnit runs without WooCommerce, so buttons
 * and content, which need products, are tested in the browser.)
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Integrations\WooCommerce\QuickAdd;

/**
 * Quick add tests.
 */
class QuickAddTest extends TestCase {

	/**
	 * Remove the patterns a test registered.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		foreach ( [ 'matter-test-theme/quick-add', 'matter-test-theme/quick-add-product' ] as $slug ) {
			if ( \WP_Block_Patterns_Registry::get_instance()->is_registered( $slug ) ) {
				unregister_block_pattern( $slug );
			}
		}

		parent::tear_down();
	}

	/**
	 * Registers a pattern in the fixture theme's namespace.
	 *
	 * @param string $name Pattern name.
	 * @return void
	 */
	private function pattern( string $name ): void {
		register_block_pattern(
			"matter-test-theme/{$name}",
			[
				'title'   => $name,
				'content' => '<!-- wp:post-title /-->',
			]
		);
	}

	/**
	 * The post type's pattern, then the general one, then none (Matter's
	 * default); a filter can choose another.
	 *
	 * @return void
	 */
	public function test_pattern(): void {
		$this->assertNull( QuickAdd::pattern( 'product' ) );

		$this->pattern( 'quick-add' );
		$this->assertSame( 'matter-test-theme/quick-add', QuickAdd::pattern( 'product' ) );

		$this->pattern( 'quick-add-product' );
		$this->assertSame( 'matter-test-theme/quick-add-product', QuickAdd::pattern( 'product' ) );

		$other = fn() => 'matter-test-theme/quick-add';

		add_filter( 'matter_quick_add_pattern', $other );
		$this->assertSame( 'matter-test-theme/quick-add', QuickAdd::pattern( 'product' ) );
		remove_filter( 'matter_quick_add_pattern', $other );

		$missing = fn() => 'matter-test-theme/nothing';

		add_filter( 'matter_quick_add_pattern', $missing );
		$this->assertNull( QuickAdd::pattern( 'product' ), 'A pattern that isn\'t registered is none.' );
		remove_filter( 'matter_quick_add_pattern', $missing );
	}

	/**
	 * The block registers only when the WooCommerce integration turns it on.
	 *
	 * @return void
	 */
	public function test_block_needs_woocommerce(): void {
		$this->assertFalse( \WP_Block_Type_Registry::get_instance()->is_registered( QuickAdd::BLOCK ) );
		$this->assertTrue( ( new QuickAdd() )->register_block( false, QuickAdd::BLOCK ) );
		$this->assertFalse( ( new QuickAdd() )->register_block( false, 'matter/other' ), 'Other blocks are left as they were.' );
	}

	/**
	 * The modal: Matter's Modal block with its own ID (not a post's, though
	 * it's asked for inside a loop), named, a loading status, and the empty
	 * router region the content renders into; the script's settings.
	 *
	 * @return void
	 */
	public function test_modal(): void {
		$html = QuickAdd::modal_html();

		$this->assertMatchesRegularExpression( '#<dialog [^>]*class="wp-block-matter-quick-add__modal wp-block-matter-modal"[^>]*id="matter-quick-add"#', $html );
		$this->assertStringContainsString( 'aria-label="Quick add"', $html );
		$this->assertMatchesRegularExpression( '#<p class="wp-block-matter-quick-add__status" role="status"[^>]*hidden>#', $html );
		$this->assertMatchesRegularExpression( '#<div class="wp-block-matter-quick-add__content" data-wp-interactive="matter/quick-add" data-wp-router-region="matter/quick-add"></div>#', $html );
		$this->assertStringNotContainsString( 'group-nav', $html, 'One modal, not a group.' );

		$this->assertSame(
			[
				'modal' => 'matter-quick-add',
				'param' => 'matter-quick-add',
			],
			wp_interactivity_config( 'matter/quick-add' )
		);
	}
}
