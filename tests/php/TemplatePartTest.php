<?php
/**
 * The template part block: only the parts the theme lists render.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Blocks\TemplatePart;
use ReflectionProperty;
use WP_REST_Request;

/**
 * Template parts.
 */
class TemplatePartTest extends TestCase {

	/**
	 * Parts are found afresh for each test.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		( new ReflectionProperty( TemplatePart::class, 'listed' ) )->setValue( null, [] );
	}

	/**
	 * A part with a title renders.
	 *
	 * @return void
	 */
	public function test_a_listed_part_renders(): void {
		$this->assertContains( 'note', array_column( TemplatePart::all(), 'slug' ) );
		$this->assertStringContainsString( 'Listed part', TemplatePart::render( 'note' ) );
		$this->assertStringContainsString( 'Listed part', $this->render( '<!-- wp:matter/template-part {"slug":"note"} /-->' ) );
	}

	/**
	 * A file without a `Title:` header isn't a part, so it doesn't render.
	 *
	 * @return void
	 */
	public function test_an_unlisted_file_does_not_render(): void {
		$this->assertNotContains( 'unlisted', array_column( TemplatePart::all(), 'slug' ) );
		$this->assertSame( '', TemplatePart::render( 'unlisted' ) );
		$this->assertStringNotContainsString( 'Not a part', $this->render( '<!-- wp:matter/template-part {"slug":"unlisted"} /-->' ) );
	}

	/**
	 * Megamenu panels have titles but aren't parts of this block, and neither
	 * is a part named by anything that isn't in the list.
	 *
	 * @return void
	 */
	public function test_megamenu_panels_and_missing_parts_do_not_render(): void {
		$this->assertNotContains( 'megamenu/x', array_column( TemplatePart::all(), 'slug' ) );
		$this->assertSame( '', TemplatePart::render( 'megamenu/x' ) );
		$this->assertSame( '', TemplatePart::render( 'nothing-here' ) );
		$this->assertSame( '', TemplatePart::render( '../functions' ) );

		// Even a filter that lists one can't offer a megamenu panel.
		add_filter( 'matter_template_parts', fn( $parts ) => $parts + [ 'megamenu/x' => 'Panel' ] );
		( new ReflectionProperty( TemplatePart::class, 'listed' ) )->setValue( null, [] );

		$this->assertSame( '', TemplatePart::render( 'megamenu/x' ) );
	}

	/**
	 * The list is found once per request, for the active stylesheet.
	 *
	 * @return void
	 */
	public function test_the_list_is_found_once_per_stylesheet(): void {
		$calls = 0;

		add_filter(
			'matter_template_parts',
			function ( $parts ) use ( &$calls ) {
				++$calls;

				return $parts;
			}
		);

		TemplatePart::all();
		TemplatePart::render( 'note' );
		TemplatePart::render( 'header' );

		$this->assertSame( 1, $calls );

		$cache = new ReflectionProperty( TemplatePart::class, 'listed' );

		$this->assertSame( [ get_stylesheet() ], array_keys( $cache->getValue() ) );
	}

	/**
	 * The editor's preview refuses a slug that isn't listed, so it shows its
	 * "couldn't be shown" placeholder instead of an empty block.
	 *
	 * @return void
	 */
	public function test_the_editor_preview_refuses_an_unlisted_part(): void {
		wp_set_current_user( self::factory()->user->create( [ 'role' => 'editor' ] ) );
		do_action( 'rest_api_init' );

		foreach ( [ 'megamenu/x' => 400, 'unlisted' => 400, 'note' => 200 ] as $slug => $status ) { // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
			$request = new WP_REST_Request( 'GET', '/matter/v1/template-part' );
			$request->set_param( 'slug', $slug );

			$this->assertSame( $status, rest_get_server()->dispatch( $request )->get_status(), $slug );
		}
	}
}
