<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Matter\\GravityForm
 */

use Eighteen73\Matter\Blocks\BlockId;

$form_id             = isset( $attributes['formId'] ) ? absint( $attributes['formId'] ) : 0;
$display_title       = isset( $attributes['displayTitle'] ) ? (bool) $attributes['displayTitle'] : false;
$display_description = isset( $attributes['displayDescription'] ) ? (bool) $attributes['displayDescription'] : false;
$ajax_submission     = isset( $attributes['ajaxSubmission'] ) ? (bool) $attributes['ajaxSubmission'] : false;
$tabindex            = isset( $attributes['tabindex'] ) ? (int) $attributes['tabindex'] : 0;

$field_values = null;
if ( ! empty( $attributes['fieldValues'] ) && is_array( $attributes['fieldValues'] ) ) {
	$sanitized = [];
	foreach ( $attributes['fieldValues'] as $key => $value ) {
		if ( ! is_string( $key ) && ! is_numeric( $key ) ) {
			continue;
		}
		$sanitized[ sanitize_key( (string) $key ) ] = sanitize_text_field( (string) $value );
	}
	$field_values = ! empty( $sanitized ) ? $sanitized : null;
}

if ( ! $form_id || ! function_exists( 'gravity_form' ) ) {
	return;
}

// Capture incidental output (e.g. scripts) during editor SSR / REST previews.
$is_rest_preview = defined( 'REST_REQUEST' ) && REST_REQUEST;

if ( $is_rest_preview ) {
	ob_start();
}

$form_markup = gravity_form(
	$form_id,
	$display_title,
	$display_description,
	false,
	$field_values,
	$ajax_submission,
	$tabindex,
	false
);

$incidental_output = '';
if ( $is_rest_preview ) {
	$incidental_output = ob_get_clean();
}

$block_context = ( isset( $block ) && $block instanceof WP_Block )
	? $block->context
	: [];

$block_id = BlockId::resolve_id(
	$attributes ?? [],
	$block_context,
	'matter-gravity-form-'
);

$wrapper_attributes = get_block_wrapper_attributes(
	[
		'id' => $block_id,
	]
);
?>
<div <?php echo wp_kses_data( $wrapper_attributes ); ?>>
	<?php
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- gravity_form() returns escaped markup.
	echo $incidental_output . $form_markup;
	?>
</div>
