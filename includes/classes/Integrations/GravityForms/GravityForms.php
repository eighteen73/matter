<?php
/**
 * Gravity Forms integration.
 *
 * Boots when Gravity Forms is active. It registers Matter's Gravity Form
 * block (`matter/gravity-form`), which replaces Gravity Forms' own Form block
 * in the inserter, gives the block's editor script the list of forms, and
 * keeps forms out of Interactivity API hydration.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Integrations\GravityForms;

use Eighteen73\Matter\Integrations\Integration;

defined( 'ABSPATH' ) || exit;

/**
 * Gravity Forms integration.
 */
final class GravityForms implements Integration {

	/**
	 * Editor script handle registered from block.json.
	 *
	 * @var string
	 */
	private const EDITOR_SCRIPT_HANDLE = 'matter-gravity-form-editor-script';

	/**
	 * Whether Gravity Forms is active.
	 *
	 * @return bool
	 */
	public function can_boot(): bool {
		return class_exists( 'GFAPI' );
	}

	/**
	 * Turn on Matter's Gravity Form block, which is off without this plugin.
	 *
	 * @param mixed  $register Whether the block registers (an earlier filter may return anything).
	 * @param string $name     Block name.
	 * @return bool
	 */
	public function register_form_block( $register, string $name ): bool {
		return 'matter/gravity-form' === $name ? true : (bool) $register;
	}

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function boot(): void {
		add_filter( 'matter_register_block', [ $this, 'register_form_block' ], 10, 2 );
		add_filter( 'matter_hidden_blocks', [ $this, 'hide_form_block' ] );
		add_action( 'enqueue_block_editor_assets', [ $this, 'localize_editor_script' ] );
		add_filter( 'gform_get_form_filter', [ $this, 'isolate_from_interactivity_api' ], 10, 2 );
	}

	/**
	 * Hide Gravity Forms' own Form block, which Matter's replaces.
	 *
	 * @param string[] $blocks Block names.
	 * @return string[]
	 */
	public function hide_form_block( array $blocks ): array {
		$blocks[] = 'gravityforms/form';

		return $blocks;
	}

	/**
	 * Pass the active forms list to the block editor script.
	 *
	 * @return void
	 */
	public function localize_editor_script(): void {
		if ( ! wp_script_is( self::EDITOR_SCRIPT_HANDLE, 'registered' ) ) {
			return;
		}

		wp_localize_script(
			self::EDITOR_SCRIPT_HANDLE,
			'matterGravityForm',
			[
				'forms'    => $this->get_forms(),
				'adminUrl' => admin_url( 'admin.php' ),
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

	/**
	 * Keep Gravity Forms markup out of Interactivity API hydration.
	 *
	 * Overlay/accordion/tabs islands hydrate descendants with Preact. Gravity
	 * Forms still uses native HTML event attributes (`onclick`, `onsubmit`).
	 * Preact then throws: Component's "onclick" property should be a function,
	 * but got [string] instead.
	 *
	 * `data-wp-ignore` skips that subtree so the native handlers keep working.
	 * It is deprecated, but still the runtime mechanism for this case.
	 *
	 * @param string $form_string Form HTML.
	 * @param array  $form        Form object.
	 * @return string
	 */
	public function isolate_from_interactivity_api( string $form_string, $form ): string { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
		if ( '' === $form_string ) {
			return $form_string;
		}

		$processor = new \WP_HTML_Tag_Processor( $form_string );

		while ( $processor->next_tag() ) {
			$id      = (string) $processor->get_attribute( 'id' );
			$classes = preg_split( '/\s+/', (string) $processor->get_attribute( 'class' ), -1, PREG_SPLIT_NO_EMPTY );

			$is_wrapper = str_starts_with( $id, 'gform_wrapper_' )
				|| ( is_array( $classes ) && in_array( 'gform_wrapper', $classes, true ) );

			if ( ! $is_wrapper ) {
				continue;
			}

			$processor->set_attribute( 'data-wp-ignore', '' );

			return $processor->get_updated_html();
		}

		return $form_string;
	}
}
