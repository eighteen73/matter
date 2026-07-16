<?php
/**
 * Accordion heading block render template.
 *
 * @package Eighteen73\Matter
 */

defined( 'ABSPATH' ) || exit;

$block_attributes = isset( $attributes ) && is_array( $attributes ) ? $attributes : [];
$block_instance   = isset( $block ) && $block instanceof WP_Block ? $block : null;

$title     = isset( $block_attributes['title'] ) ? (string) $block_attributes['title'] : '';
$level     = 3;
$show_icon = true;
$icon_pos  = 'right';
$item_id   = '';
$post_id   = 0;
$is_query  = false;

if ( $block_instance instanceof WP_Block ) {
	$level     = (int) ( $block_instance->context['matter/accordion-heading-level'] ?? 3 );
	$show_icon = array_key_exists( 'matter/accordion-show-icon', $block_instance->context )
		? (bool) $block_instance->context['matter/accordion-show-icon']
		: true;
	$icon_pos  = (string) ( $block_instance->context['matter/accordion-icon-position'] ?? 'right' );
	$item_id   = (string) ( $block_instance->context['matter/accordion-item-id'] ?? '' );
	$post_id   = (int) ( $block_instance->context['postId'] ?? 0 );
	$is_query  = ! empty( $block_instance->context['matter/accordion-isQueryMode'] );

	if ( $is_query && $post_id > 0 ) {
		$post = get_post( $post_id );
		if ( $post instanceof WP_Post ) {
			$title = get_the_title( $post );
		}
	}
}

$level = max( 1, min( 6, $level ) );
$tag   = 'h' . $level;

if ( '' === $item_id ) {
	$item_id = wp_unique_id( 'matter-accordion-item-' );
}

$panel_id = $item_id . '-panel';

$heading_classes = [];
if ( $show_icon ) {
	$heading_classes[] = 'has-icon';
	$heading_classes[] = 'left' === $icon_pos ? 'has-icon-left' : 'has-icon-right';
}

$wrapper_attributes = [
	'data-wp-interactive' => 'matter/accordion/private',
];

if ( ! empty( $heading_classes ) ) {
	$wrapper_attributes['class'] = implode( ' ', $heading_classes );
}

$button_attributes = [
	'type'                        => 'button',
	'id'                          => $item_id,
	'aria-controls'               => $panel_id,
	'data-wp-on--click'           => 'actions.toggle',
	'data-wp-on--keydown'         => 'actions.handleKeyDown',
	'data-wp-bind--aria-expanded' => 'state.isOpen',
	'class'                       => 'wp-block-matter-accordion-heading__toggle',
];

?>

<<?php echo tag_escape( $tag ); ?>
	<?php
	echo wp_kses_data( get_block_wrapper_attributes( $wrapper_attributes ) );
	?>
>
	<button
		<?php
		foreach ( $button_attributes as $attr_name => $attr_value ) {
			printf(
				' %1$s="%2$s"',
				esc_attr( $attr_name ),
				esc_attr( (string) $attr_value )
			);
		}
		?>
		aria-expanded="<?php echo $block_instance && ! empty( $block_instance->context['matter/accordion-open-by-default'] ) ? 'true' : 'false'; ?>"
	>
		<?php if ( $show_icon && 'left' === $icon_pos ) : ?>
			<span class="wp-block-matter-accordion-heading__toggle-icon-wrapper" aria-hidden="true"><span class="wp-block-matter-accordion-heading__toggle-icon" aria-hidden="true"></span></span>
		<?php endif; ?>
		<span class="wp-block-matter-accordion-heading__toggle-title">
			<?php echo wp_kses_post( $title ); ?>
		</span>
		<?php if ( $show_icon && 'right' === $icon_pos ) : ?>
			<span class="wp-block-matter-accordion-heading__toggle-icon-wrapper" aria-hidden="true"><span class="wp-block-matter-accordion-heading__toggle-icon" aria-hidden="true"></span></span>
		<?php endif; ?>
	</button>
</<?php echo tag_escape( $tag ); ?>>
