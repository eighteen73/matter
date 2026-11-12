<?php
/**
 * Header for the test theme.
 *
 * Title: Test header
 *
 * @package MatterTestTheme
 */

?>
<header class="test-header">
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
	?>
</header>
