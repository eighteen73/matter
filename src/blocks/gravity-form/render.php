<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Matter\\GravityForm
 */

$form_id = isset( $attributes['formId'] ) ? absint( $attributes['formId'] ) : 0;

if ( ! $form_id || ! function_exists( 'gravity_form' ) ) {
	return;
}

// Capture incidental output (e.g. scripts) during editor SSR / REST previews.
$is_rest_preview = defined( 'REST_REQUEST' ) && REST_REQUEST;

if ( $is_rest_preview ) {
	ob_start();
}

$form_markup = gravity_form( $form_id, false, false, false, null, false, 0, false );

$incidental_output = '';
if ( $is_rest_preview ) {
	$incidental_output = ob_get_clean();
}

$wrapper_attributes = get_block_wrapper_attributes();
?>
<div <?php echo wp_kses_data( $wrapper_attributes ); ?>>
	<?php
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- gravity_form() returns escaped markup.
	echo $incidental_output . $form_markup;
	?>
</div>
