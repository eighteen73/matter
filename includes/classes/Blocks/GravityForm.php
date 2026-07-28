<?php
/**
 * Gravity Form block helpers.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Gravity Form block.
 */
class GravityForm {

	use Singleton;

	/**
	 * Editor script handle registered from block.json.
	 *
	 * @var string
	 */
	private const EDITOR_SCRIPT_HANDLE = 'matter-gravity-form-editor-script';

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'matter_register_gravity-form', [ $this, 'should_register' ] );
		add_action( 'enqueue_block_editor_assets', [ $this, 'localize_editor_script' ] );
	}

	/**
	 * Only register the block when Gravity Forms is available.
	 *
	 * @param bool $should_register Whether the block should register.
	 * @return bool
	 */
	public function should_register( bool $should_register ): bool {
		if ( ! class_exists( 'GFAPI' ) ) {
			return false;
		}

		return $should_register;
	}

	/**
	 * Pass the active forms list to the block editor script.
	 *
	 * @return void
	 */
	public function localize_editor_script(): void {
		if ( ! class_exists( 'GFAPI' ) ) {
			return;
		}

		if ( ! wp_script_is( self::EDITOR_SCRIPT_HANDLE, 'registered' ) ) {
			return;
		}

		wp_localize_script(
			self::EDITOR_SCRIPT_HANDLE,
			'matterGravityForm',
			[
				'forms' => $this->get_forms(),
			]
		);
	}

	/**
	 * Get active forms for the block selector.
	 *
	 * Mirrors Gravity Forms' own block form list so the
	 * `gform_block_form_forms` filter stays consistent.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	private function get_forms(): array {
		$forms        = [];
		$form_objects = \GFAPI::get_forms( true, false, 'title', 'ASC' );

		foreach ( $form_objects as $form ) {
			$forms[] = [
				'id'    => $form['id'],
				'title' => $form['title'],
			];
		}

		/**
		 * Filters the list of forms available in the Form block.
		 *
		 * @param array<int, array<string, mixed>> $forms Active forms.
		 */
		return apply_filters( 'gform_block_form_forms', $forms );
	}
}
