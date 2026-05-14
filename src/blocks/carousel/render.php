<?php
/**
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @package Eighteen73Blocks\\Carousel
 */

$default_embla_config = [
	'options' => [
		'loop'           => false,
		'axis'           => 'x',
		'slidesToScroll' => 1,
	],
	'plugins' => [
		'autoplay' => [
			'active' => false,
			'type'   => 'normal',
			'speed'  => 1,
		],
	],
];

/**
 * Determine whether the given array is an associative map (rather than a
 * sequential list). Used by the deep merge below to keep list values atomic
 * while merging maps recursively.
 *
 * @param array $arr
 * @return bool
 */
$is_assoc_array = static function ( array $arr ) {
	if ( empty( $arr ) ) {
		return true;
	}
	return array_keys( $arr ) !== range( 0, count( $arr ) - 1 );
};

/**
 * Deep-merge two associative arrays. Scalar/list values from $override replace
 * those in $base; nested associative arrays are merged recursively.
 *
 * @param array $base
 * @param array $override
 * @return array
 */
$deep_merge = static function ( array $base, array $override ) use ( &$deep_merge, $is_assoc_array ) {
	foreach ( $override as $key => $value ) {
		if (
			isset( $base[ $key ] )
			&& is_array( $base[ $key ] )
			&& is_array( $value )
			&& $is_assoc_array( $base[ $key ] )
			&& $is_assoc_array( $value )
		) {
			$base[ $key ] = $deep_merge( $base[ $key ], $value );
		} else {
			$base[ $key ] = $value;
		}
	}
	return $base;
};

$raw_embla_config = isset( $attributes['emblaConfig'] ) && is_array( $attributes['emblaConfig'] )
	? $attributes['emblaConfig']
	: [];

$embla_config = $deep_merge( $default_embla_config, $raw_embla_config );

// Sanitize the core option keys we expose via UI; anything else passes through
// untouched so advanced JSON can introduce additional Embla options.
$options = $embla_config['options'];
if ( isset( $options['axis'] ) && ! in_array( $options['axis'], [ 'x', 'y' ], true ) ) {
	$options['axis'] = 'x';
}
if ( isset( $options['slidesToScroll'] ) ) {
	$options['slidesToScroll'] = max( 1, (int) $options['slidesToScroll'] );
}
if ( isset( $options['loop'] ) ) {
	$options['loop'] = (bool) $options['loop'];
}
$embla_config['options'] = $options;

$advanced_carousel_config = isset( $attributes['advancedCarouselConfig'] ) && is_array( $attributes['advancedCarouselConfig'] )
	? $attributes['advancedCarouselConfig']
	: [];

$advanced_carousel_config_merge = isset( $attributes['advancedCarouselConfigMerge'] )
	? (bool) $attributes['advancedCarouselConfigMerge']
	: false;

$carousel_context = [
	'emblaConfig'                 => $embla_config,
	'advancedCarouselConfig'      => $advanced_carousel_config,
	'advancedCarouselConfigMerge' => $advanced_carousel_config_merge,
];
?>

<div
	<?php
	echo wp_kses_data(
		get_block_wrapper_attributes(
			[
				'data-wp-interactive' => 'eighteen73-blocks/carousel',
				'data-wp-init'        => 'callbacks.loadEmblaCarousel',
			]
		)
		. ' '
		. wp_interactivity_data_wp_context( $carousel_context )
	);
	?>
>
	<div
		class="embla"
	>
		<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	</div>
</div>
