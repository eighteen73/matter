<?php
/**
 * Header for the test theme.
 *
 * Title: Test header
 *
 * @package MatterTestTheme
 */

// Padded so the page's top-left corner isn't a menu link: headless Chromium
// on Linux (CI) starts the pointer there, which would hover the first
// dropdown open before a test begins.
?>
<header class="test-header" style="padding: 24px;">
	<?php
	Eighteen73\Matter\panel_toggle( 'test-nav', [ 'collapse_below' => 'lg' ] );
	Eighteen73\Matter\panel(
		'test-nav',
		function () {
			Eighteen73\Matter\menu(
				[
					'location' => 'primary',
					'type'     => [ 'drill-down', 'lg' => 'dropdown' ],
					'opens_on' => 'click',
				]
			);
		},
		[ 'collapse_below' => 'lg' ]
	);

	// A second menu that opens on hover, for hover behaviour.
	Eighteen73\Matter\menu(
		[
			'location' => 'primary',
			'id'       => 'hover-menu',
			'type'     => 'dropdown',
		]
	);
	?>
</header>
