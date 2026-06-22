<?php
/**
 * Tab button block render template.
 *
 * Buttons are rendered by the tab-list parent; this callback is a fallback.
 *
 * @package Eighteen73\Matter
 */

defined( 'ABSPATH' ) || exit;
?>

<div class="wp-block-matter-tab-button">
	<?php echo wp_kses_post( $content ); ?>
</div>
