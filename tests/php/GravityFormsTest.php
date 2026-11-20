<?php
/**
 * The Gravity Forms integration, against a stub of Gravity Forms' public API
 * (tests/fixtures/gravity-forms-stub). Not run without it (`test:php:nowc`).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Blocks\Registry;
use Eighteen73\Matter\Integrations\GravityForms\GravityForms;
use Eighteen73\Matter\Integrations\Integrations;
use WP_Block_Type_Registry;

/**
 * Gravity Forms integration tests.
 *
 * @group gravity-forms
 */
class GravityFormsTest extends TestCase {

	/**
	 * The stub is loaded by the bootstrap.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		$this->assertTrue( class_exists( 'GFAPI' ), 'The Gravity Forms stub is missing: run with npm run test:php.' );
	}

	/**
	 * The integration boots with the plugin and turns the block on.
	 *
	 * @return void
	 */
	public function test_the_integration_boots_and_registers_the_block(): void {
		$this->assertTrue( Integrations::active( GravityForms::class ) );
		$this->assertTrue( WP_Block_Type_Registry::get_instance()->is_registered( 'matter/gravity-form' ) );
		$this->assertContains( 'gravityforms/form', Registry::hidden_blocks() );
	}

	/**
	 * The block prints the form, with Interactivity API isolation on the form's
	 * wrapper only, and the native handlers left alone.
	 *
	 * @return void
	 */
	public function test_the_block_renders_a_form_isolated_from_interactivity(): void {
		$html = $this->render( '<!-- wp:matter/gravity-form {"formId":"2","displayTitle":true} /-->' );

		$this->assertStringContainsString( 'wp-block-matter-gravity-form', $html );
		$this->assertMatchesRegularExpression( '/<div data-wp-ignore="" class="gform_wrapper[^"]*" id="gform_wrapper_2"/', $html );
		$this->assertSame( 1, substr_count( $html, 'data-wp-ignore' ) );
		$this->assertStringContainsString( 'onsubmit="return window.gfStub( 2 );"', $html );
		$this->assertStringContainsString( 'Form 2', $html );
	}

	/**
	 * Isolation survives inside an island (a modal's content), whose
	 * descendants the Interactivity API would otherwise hydrate.
	 *
	 * @return void
	 */
	public function test_the_form_inside_a_modal_is_ignored_by_hydration(): void {
		$html = $this->render( '<!-- wp:matter/modal {"overlayId":"join"} --><!-- wp:matter/slot {"name":"content"} --><!-- wp:matter/gravity-form {"formId":"1"} /--><!-- /wp:matter/slot --><!-- /wp:matter/modal -->' );

		$this->assertStringContainsString( '<div data-wp-ignore="" class="gform_wrapper gravity-theme" id="gform_wrapper_1"', $html );
	}

	/**
	 * Without a form there is nothing to print.
	 *
	 * @return void
	 */
	public function test_a_block_without_a_form_renders_nothing(): void {
		$this->assertSame( '', trim( $this->render( '<!-- wp:matter/gravity-form /-->' ) ) );
	}

	/**
	 * The isolation filter touches only a form's wrapper.
	 *
	 * @return void
	 */
	public function test_the_isolation_filter_marks_only_the_wrapper(): void {
		$integration = new GravityForms();

		$this->assertSame( '', $integration->isolate_from_interactivity_api( '', [] ) );
		$this->assertSame( '<p>Thanks</p>', $integration->isolate_from_interactivity_api( '<p>Thanks</p>', [] ) );
		$this->assertSame(
			'<div data-wp-ignore="" class="x gform_wrapper"><form></form></div>',
			$integration->isolate_from_interactivity_api( '<div class="x gform_wrapper"><form></form></div>', [] )
		);
		$this->assertSame(
			'<section><div data-wp-ignore="" id="gform_wrapper_5"></div></section>',
			$integration->isolate_from_interactivity_api( '<section><div id="gform_wrapper_5"></div></section>', [] )
		);
	}

	/**
	 * The editor script gets the forms to choose from.
	 *
	 * @return void
	 */
	public function test_the_editor_script_gets_the_forms(): void {
		wp_register_script( 'matter-gravity-form-editor-script', '', [], MATTER_VERSION, true );

		( new GravityForms() )->localize_editor_script();

		$data = (string) wp_scripts()->get_data( 'matter-gravity-form-editor-script', 'data' );

		$this->assertStringContainsString( 'matterGravityForm', $data );
		$this->assertStringContainsString( 'Newsletter', $data );

		wp_deregister_script( 'matter-gravity-form-editor-script' );
	}
}
