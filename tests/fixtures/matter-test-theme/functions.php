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
		register_block_type( __DIR__ . '/blocks/test-list' );
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

// A theme list of allowed blocks, switched on by the browser test that checks
// slot-only blocks (`core/verse` is only in the test section's content slot).
add_action(
	'init',
	fn() => register_setting(
		'general',
		'matter_test_allowed_blocks',
		[
			'type'         => 'boolean',
			'default'      => false,
			'show_in_rest' => true,
		]
	)
);

add_filter(
	'matter_allowed_blocks',
	fn( $blocks ) => get_option( 'matter_test_allowed_blocks' )
		? [ ...$blocks, 'core/heading', 'core/paragraph', 'core/image', 'matter/*', 'matter-test/*' ]
		: $blocks
);

// Site details, for the settings page's browser test.
add_filter(
	'matter_settings_fields',
	fn( $sections ) => $sections + [
		'social' => [
			'title'  => 'Social media',
			'fields' => [
				'instagram' => [
					'type'  => 'url',
					'label' => 'Instagram',
				],
				'seats'     => [
					'type'  => 'number',
					'label' => 'Seats',
				],
			],
		],
	]
);

// A menu whose type is set from a breakpoint above the smallest screens only,
// for the browser test of a map with no base entry.
add_shortcode(
	'matter_menu_lg_only',
	function ( $atts ) {
		$atts = shortcode_atts( [ 'then' => '' ], $atts );
		$type = [ 'lg' => 'dropdown' ] + ( $atts['then'] ? [ 'xl' => $atts['then'] ] : [] );

		ob_start();
		Eighteen73\Matter\menu(
			[
				'location' => 'primary',
				'id'       => 'lg-only-menu',
				'type'     => $type,
				'opens_on' => 'click',
			]
		);

		return (string) ob_get_clean();
	}
);

// The test section's locked media slot with another block type as its
// template (a theme changing it after content was saved), switched on by the
// browser test that checks saved blocks survive.
add_action(
	'init',
	fn() => register_setting(
		'general',
		'matter_test_media_video',
		[
			'type'         => 'boolean',
			'default'      => false,
			'show_in_rest' => true,
		]
	)
);

// And one whose template gains a block (saved content has one image).
add_action(
	'init',
	fn() => register_setting(
		'general',
		'matter_test_media_gain',
		[
			'type'         => 'boolean',
			'default'      => false,
			'show_in_rest' => true,
		]
	)
);

add_filter(
	'register_block_type_args',
	function ( $args, $name ) {
		if ( 'matter-test/section' === $name && get_option( 'matter_test_media_gain' ) ) {
			$args['supports']['matter']['slots']['media']['template'] = [ [ 'core/image' ], [ 'core/image' ] ];
		}

		if ( 'matter-test/section' === $name && get_option( 'matter_test_media_video' ) ) {
			$args['supports']['matter']['slots']['media']['allowedBlocks'] = [ 'core/video' ];
			$args['supports']['matter']['slots']['media']['template']      = [ [ 'core/video' ] ];
		}

		return $args;
	},
	10,
	2
);
