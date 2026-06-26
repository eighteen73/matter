<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Matter\Icon
 */

defined( 'ABSPATH' ) || exit;

use Eighteen73\Matter\Icons\Resolver;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];

if ( empty( $block_attributes['icon'] ) ) {
	return;
}

$icon = Resolver::instance()->get_registered_icon( (string) $block_attributes['icon'] );

if ( null === $icon || empty( $icon['content'] ) ) {
	return;
}

// Text color and background color.
$color_styles = [];

$preset_text_color    = array_key_exists( 'textColor', $block_attributes ) ? "var:preset|color|{$block_attributes['textColor']}" : null;
$custom_text_color    = $block_attributes['style']['color']['text'] ?? null;
$color_styles['text'] = $preset_text_color ? $preset_text_color : $custom_text_color;

$preset_background_color    = array_key_exists( 'backgroundColor', $block_attributes ) ? "var:preset|color|{$block_attributes['backgroundColor']}" : null;
$custom_background_color    = $block_attributes['style']['color']['background'] ?? null;
$color_styles['background'] = $preset_background_color ? $preset_background_color : $custom_background_color;

// Border.
$border_styles = [];
$sides         = [ 'top', 'right', 'bottom', 'left' ];

if ( isset( $block_attributes['style']['border']['radius'] ) ) {
	$border_styles['radius'] = $block_attributes['style']['border']['radius'];
}
if ( isset( $block_attributes['style']['border']['style'] ) ) {
	$border_styles['style'] = $block_attributes['style']['border']['style'];
}
if ( isset( $block_attributes['style']['border']['width'] ) ) {
	$border_styles['width'] = $block_attributes['style']['border']['width'];
}

$preset_color           = array_key_exists( 'borderColor', $block_attributes ) ? "var:preset|color|{$block_attributes['borderColor']}" : null;
$custom_color           = $block_attributes['style']['border']['color'] ?? null;
$border_styles['color'] = $preset_color ? $preset_color : $custom_color;

foreach ( $sides as $side ) {
	$border                 = $block_attributes['style']['border'][ $side ] ?? null;
	$border_styles[ $side ] = [
		'color' => $border['color'] ?? null,
		'style' => $border['style'] ?? null,
		'width' => $border['width'] ?? null,
	];
}

// Spacing (padding).
$spacing_styles = [];
if ( isset( $block_attributes['style']['spacing']['padding'] ) ) {
	$spacing_styles['padding'] = $block_attributes['style']['spacing']['padding'];
}

// Dimensions (width).
$dimensions_styles = [];
if ( isset( $block_attributes['style']['dimensions']['width'] ) ) {
	$dimensions_styles['width'] = $block_attributes['style']['dimensions']['width'];
}

$styles = wp_style_engine_get_styles(
	[
		'color'      => $color_styles,
		'border'     => $border_styles,
		'spacing'    => $spacing_styles,
		'dimensions' => $dimensions_styles,
	]
);

$processor = new WP_HTML_Tag_Processor( $icon['content'] );
$processor->next_tag( 'svg' );

if ( ! empty( $styles['css'] ) ) {
	$processor->set_attribute( 'style', $styles['css'] );
}
if ( ! empty( $styles['classnames'] ) ) {
	$processor->add_class( $styles['classnames'] );
}

$flip_horizontal = $block_attributes['flipHorizontal'] ?? false;
$flip_vertical   = $block_attributes['flipVertical'] ?? false;

if ( $flip_horizontal ) {
	$processor->add_class( 'is-flip-horizontal' );
}
if ( $flip_vertical ) {
	$processor->add_class( 'is-flip-vertical' );
}

$rotation = isset( $block_attributes['rotation'] ) ? (int) $block_attributes['rotation'] : 0;

if ( $rotation ) {
	$current_style = $processor->get_attribute( 'style' ) ?? '';
	$rotation_css  = 'rotate: ' . $rotation . 'deg;';
	if ( $current_style ) {
		$processor->set_attribute( 'style', $current_style . ' ' . $rotation_css );
	} else {
		$processor->set_attribute( 'style', $rotation_css );
	}
}

$aria_label = ! empty( $block_attributes['ariaLabel'] ) ? $block_attributes['ariaLabel'] : '';

if ( ! $aria_label ) {
	$processor->set_attribute( 'aria-hidden', 'true' );
	$processor->set_attribute( 'focusable', 'false' );
} else {
	$processor->set_attribute( 'role', 'img' );
	$processor->set_attribute( 'aria-label', $aria_label );
}

$svg     = $processor->get_updated_html();
$wrapper = get_block_wrapper_attributes();
?>
<div <?php echo wp_kses_data( $wrapper ); ?>>
	<?php
	// SVG content is sanitized when registered in the icon registry.
	echo $svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>
</div>
