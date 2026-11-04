<?php
/**
 * Shared rendering for overlay blocks (modal, drawer, collapsible).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Overlays;

defined( 'ABSPATH' ) || exit;

/**
 * Shared rendering for overlay blocks.
 */
class Overlay {

	/**
	 * The overlay's element ID: the editor-assigned ID, or a generated fallback.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Fallback prefix.
	 * @return string
	 */
	public static function id( array $attributes, string $prefix ): string {
		$id = sanitize_html_class( (string) ( $attributes['overlayId'] ?? '' ) );

		return '' !== $id ? $id : wp_unique_id( $prefix . '-' );
	}

	/**
	 * Register an overlay's server-side state.
	 *
	 * @param string $id         Overlay ID.
	 * @param array  $attributes Block attributes (automatic opening settings).
	 * @return void
	 */
	public static function register( string $id, array $attributes = [] ): void {
		$url_triggers = array_values(
			array_filter(
				array_map(
					fn( $rule ) => [
						'param' => sanitize_key( (string) ( $rule['param'] ?? '' ) ),
						'value' => sanitize_text_field( (string) ( $rule['value'] ?? '' ) ),
					],
					(array) ( $attributes['urlTriggers'] ?? [] )
				),
				fn( $rule ) => '' !== $rule['param']
			)
		);

		wp_interactivity_state(
			'matter/overlay',
			[
				'items'  => [
					$id => [
						'isOpen'          => false,
						'openOnLoad'      => ! empty( $attributes['openOnLoad'] ),
						'openDelay'       => max( 0, (float) ( $attributes['openDelay'] ?? 0 ) ),
						'openOnScroll'    => ! empty( $attributes['openOnScroll'] ),
						'scrollThreshold' => min( 100, max( 0, (int) ( $attributes['scrollThreshold'] ?? 50 ) ) ),
						'urlTriggers'     => $url_triggers,
						'dismissDays'     => max( 0, (int) ( $attributes['dismissDays'] ?? 0 ) ),
					],
				],
				'isOpen' => function () {
					$context = wp_interactivity_get_context();
					$state   = wp_interactivity_state( 'matter/overlay' );

					return ! empty( $state['items'][ $context['id'] ?? '' ]['isOpen'] );
				},
			]
		);
	}

	/**
	 * Interactivity directives for an overlay's root element.
	 *
	 * @param string $id Overlay ID.
	 * @return string
	 */
	public static function directives( string $id ): string {
		return sprintf(
			'data-wp-interactive="matter/overlay" %s data-wp-init="callbacks.init" data-wp-watch="callbacks.sync"',
			wp_interactivity_data_wp_context( [ 'id' => $id ] )
		);
	}

	/**
	 * Close button for dialogs.
	 *
	 * @param string $block_class Block class, e.g. wp-block-matter-modal.
	 * @return string
	 */
	public static function close_button( string $block_class ): string {
		/**
		 * Filters the overlay close button label.
		 *
		 * @param string $label       Label (visually hidden).
		 * @param string $block_class Block class.
		 */
		$label = (string) apply_filters( 'matter_overlay_close_label', __( 'Close', 'matter' ), $block_class );

		return sprintf(
			'<button type="button" class="%1$s__close" data-wp-on--click="actions.close"><span class="screen-reader-text">%2$s</span></button>',
			esc_attr( $block_class ),
			esc_html( $label )
		);
	}

	/**
	 * Render a modal or drawer dialog.
	 *
	 * @param string $type       modal|drawer.
	 * @param array  $attributes Block attributes.
	 * @param string $content    Rendered inner blocks.
	 * @param array  $extra      Extra wrapper attributes (e.g. classes).
	 * @return string
	 */
	public static function render_dialog( string $type, array $attributes, string $content, array $extra = [] ): string {
		$id          = self::id( $attributes, $type );
		$block_class = 'wp-block-matter-' . $type;
		$label       = trim( (string) ( $attributes['label'] ?? '' ) );

		self::register( $id, $attributes );

		return sprintf(
			'<dialog %1$s %2$s aria-label="%3$s" data-wp-on--close="callbacks.onClose" data-wp-on--click="callbacks.onBackdropClick">%5$s<div class="%4$s__content">%6$s</div></dialog>',
			get_block_wrapper_attributes( array_merge( [ 'id' => $id ], $extra ) ),
			self::directives( $id ),
			esc_attr( '' !== $label ? $label : __( 'Dialog', 'matter' ) ),
			esc_attr( $block_class ),
			self::close_button( $block_class ),
			$content
		);
	}
}
