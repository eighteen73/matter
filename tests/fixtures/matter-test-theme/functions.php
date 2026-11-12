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
