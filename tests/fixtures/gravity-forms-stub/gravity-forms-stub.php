<?php
/**
 * Plugin Name: Gravity Forms stub (tests)
 * Description: Just enough of Gravity Forms' public API for Matter's integration: GFAPI::get_forms(), gravity_form() and the markup filter.
 *
 * It isn't Gravity Forms. The form it prints has the real wrapper's shape
 * (`gform_wrapper`) and, like Gravity Forms' own markup, native `onsubmit` and
 * `onclick` attributes.
 *
 * @package Eighteen73\Matter
 */

// phpcs:disable WordPress.NamingConventions, Squiz.Commenting, Universal.Files.SeparateFunctionsFromOO

if ( ! class_exists( 'GFAPI' ) ) {
	/**
	 * The forms API.
	 */
	class GFAPI {

		/**
		 * Forms, as Gravity Forms returns them.
		 *
		 * @param bool   $active  Active forms only (ignored).
		 * @param bool   $trash   Trashed forms (ignored).
		 * @param string $sort_by Sort field.
		 * @param string $order   Order.
		 * @return array<int, array<string, mixed>>
		 */
		public static function get_forms( $active = true, $trash = false, $sort_by = 'id', $order = 'ASC' ): array {
			return [
				[
					'id'    => 1,
					'title' => 'Contact',
				],
				[
					'id'    => 2,
					'title' => 'Newsletter',
				],
			];
		}
	}
}

if ( ! function_exists( 'gravity_form' ) ) {
	/**
	 * A form's markup, run through `gform_get_form_filter` as Gravity Forms does.
	 *
	 * @param int    $id                  Form ID.
	 * @param bool   $display_title       Show the title.
	 * @param bool   $display_description Show the description.
	 * @param bool   $display_inactive    Show an inactive form (ignored).
	 * @param array  $field_values        Dynamic population values (ignored).
	 * @param bool   $ajax                Submit with AJAX (ignored).
	 * @param int    $tabindex            Tab index (ignored).
	 * @param bool   $echo                Print instead of returning.
	 * @param string $theme               Theme (ignored).
	 * @return string
	 */
	function gravity_form( $id, $display_title = true, $display_description = true, $display_inactive = false, $field_values = null, $ajax = false, $tabindex = 0, $echo = true, $theme = '' ) {
		$id     = (int) $id;
		$markup = sprintf(
			'<div class="gform_wrapper gravity-theme" id="gform_wrapper_%1$d"><form method="post" id="gform_%1$d" onsubmit="return window.gfStub( %1$d );">%2$s<input type="text" name="input_1" onclick="window.gfStub( %1$d );"><input type="submit" value="Submit"></form></div>',
			$id,
			$display_title ? '<h2 class="gform_title">Form ' . $id . '</h2>' : ''
		);

		$markup = (string) apply_filters( 'gform_get_form_filter', $markup, [ 'id' => $id ] );

		if ( $echo ) {
			echo $markup; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			return '';
		}

		return $markup;
	}
}
