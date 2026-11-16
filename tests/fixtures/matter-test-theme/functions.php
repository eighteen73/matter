<?php
/**
 * Test theme setup: a menu location, a section block and Matter config.
 *
 * @package MatterTestTheme
 */

add_action(
	'init',
	function () {
		register_nav_menus( [ 'primary' => 'Primary' ] );
		register_block_type( __DIR__ . '/blocks/test-section' );
		register_block_type( __DIR__ . '/blocks/test-feature' );
	}
);

add_filter(
	'matter_variants',
	fn( $variants ) => array_replace_recursive(
		$variants,
		[
			'matter/carousel' => [
				'slides' => [
					'label'    => 'Slides',
					'loop'     => true,
					'autoplay' => 5,
				],
			],
		]
	)
);

// A slide type limited to carousels in the test section, switched on by the
// browser test that checks it (an option, so other tests' carousels keep no
// slide types).
add_action(
	'init',
	fn() => register_setting(
		'general',
		'matter_test_scoped_slides',
		[
			'type'         => 'boolean',
			'default'      => false,
			'show_in_rest' => true,
		]
	)
);

add_filter(
	'matter_carousel_slides',
	fn( $types ) => get_option( 'matter_test_scoped_slides' )
		? $types + [
			'core/paragraph' => [
				'label'  => 'Notes',
				'within' => [ 'matter-test/section' ],
			],
		]
		: $types
);
