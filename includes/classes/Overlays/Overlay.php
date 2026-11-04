<?php
/**
 * Shared rendering for overlay blocks (modal, drawer, collapsible).
 *
 * Each overlay block has two slots:
 * - `trigger` (optional): stays on the page. Its first link or button opens the
 *   overlay; with neither, the whole area becomes the button.
 * - `content`: the dialog (modal, drawer) or the revealed area (collapsible).
 *
 * Inside a Query Loop each post gets its own overlay (ID `{id}-{postId}`), and
 * modals from the same block form a group that can be navigated (prev/next).
 * Anything linking to `#id` also opens the overlay.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Overlays;

use Eighteen73\Matter\Blocks\Instances;
use Eighteen73\Matter\Sections\Sections;
use WP_Block;

defined( 'ABSPATH' ) || exit;

/**
 * Shared rendering for overlay blocks.
 */
class Overlay {

	/**
	 * The overlay's base ID: the editor-assigned ID, or a generated fallback.
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
	 * @param string $id     Overlay ID.
	 * @param array  $config Settings: automatic opening, dismissible, group.
	 * @return void
	 */
	public static function register( string $id, array $config = [] ): void {
		$url_triggers = array_values(
			array_filter(
				array_map(
					fn( $rule ) => [
						'param' => sanitize_key( (string) ( $rule['param'] ?? '' ) ),
						'value' => sanitize_text_field( (string) ( $rule['value'] ?? '' ) ),
					],
					(array) ( $config['urlTriggers'] ?? [] )
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
						'dismissible'     => (bool) ( $config['dismissible'] ?? true ),
						'group'           => (string) ( $config['group'] ?? '' ),
						'openOnLoad'      => ! empty( $config['openOnLoad'] ),
						'openDelay'       => max( 0, (float) ( $config['openDelay'] ?? 0 ) ),
						'openOnScroll'    => ! empty( $config['openOnScroll'] ),
						'scrollThreshold' => min( 100, max( 0, (int) ( $config['scrollThreshold'] ?? 50 ) ) ),
						'urlTriggers'     => $url_triggers,
						'dismissDays'     => max( 0, (int) ( $config['dismissDays'] ?? 0 ) ),
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
	 * Render an overlay block.
	 *
	 * @param string   $type       modal|drawer|collapsible.
	 * @param array    $attributes Block attributes.
	 * @param string   $content    Rendered slots.
	 * @param WP_Block $block      Block instance.
	 * @param array    $extra      Extra wrapper attributes for the overlay element.
	 * @return string
	 */
	public static function render( string $type, array $attributes, string $content, WP_Block $block, array $extra = [] ): string {
		$slots   = Sections::slots( $content, [ 'trigger', 'content' ] );
		$base    = self::id( $attributes, $type );
		// Inside a Query Loop each post gets its own overlay.
		$post_id = Instances::in_query_loop() ? (int) ( $block->context['postId'] ?? 0 ) : 0;
		$id      = $post_id ? $base . '-' . $post_id : $base;
		$class   = 'wp-block-matter-' . $type;

		// Modals in a Query Loop form a group automatically; others can share a group name.
		$group = sanitize_html_class( (string) ( $attributes['group'] ?? '' ) );

		if ( '' === $group && $post_id && 'modal' === $type ) {
			$group = $base;
		}

		self::register(
			$id,
			array_merge(
				$attributes,
				[
					'group'       => $group,
					'dismissible' => 'collapsible' === $type || ! isset( $attributes['dismissible'] ) || ! empty( $attributes['dismissible'] ),
				]
			)
		);

		$trigger = '' !== trim( $slots['trigger'] )
			? sprintf( '<div class="%1$s__trigger" data-matter-trigger="%2$s">%3$s</div>', esc_attr( $class ), esc_attr( $id ), $slots['trigger'] )
			: '';

		if ( 'collapsible' === $type ) {
			return sprintf(
				'<div %1$s>%2$s<div id="%3$s" class="%4$s__content" %5$s hidden data-wp-bind--hidden="!state.isOpen">%6$s</div></div>',
				get_block_wrapper_attributes( $extra ),
				$trigger,
				esc_attr( $id ),
				esc_attr( $class ),
				self::directives( $id ),
				$slots['content']
			);
		}

		$dismissible = ! isset( $attributes['dismissible'] ) || ! empty( $attributes['dismissible'] );
		$label       = trim( (string) ( $attributes['label'] ?? '' ) );

		$dialog = sprintf(
			'<dialog %1$s %2$s aria-label="%3$s" data-wp-on--close="callbacks.onClose" data-wp-on--cancel="callbacks.onCancel" data-wp-on--click="callbacks.onBackdropClick">%4$s<div class="%5$s__content">%6$s%7$s</div></dialog>',
			get_block_wrapper_attributes( array_merge( [ 'id' => $id ], $extra ) ),
			self::directives( $id ),
			esc_attr( '' !== $label ? $label : __( 'Dialog', 'matter' ) ),
			$dismissible ? self::close_button( $class ) : '',
			esc_attr( $class ),
			$slots['content'],
			'' !== $group ? self::group_nav( $class ) : ''
		);

		return '' !== $trigger
			? sprintf( '<div class="%1$s-host">%2$s%3$s</div>', esc_attr( $class ), $trigger, $dialog )
			: $dialog;
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
	 * Previous/next navigation for grouped dialogs.
	 *
	 * @param string $block_class Block class.
	 * @return string
	 */
	private static function group_nav( string $block_class ): string {
		return sprintf(
			'<nav class="%1$s__group-nav" aria-label="%2$s"><button type="button" class="%1$s__previous" data-wp-on--click="actions.previous"><span class="screen-reader-text">%3$s</span></button><span class="%1$s__position" data-wp-text="state.groupPosition"></span><button type="button" class="%1$s__next" data-wp-on--click="actions.next"><span class="screen-reader-text">%4$s</span></button></nav>',
			esc_attr( $block_class ),
			esc_attr__( 'More in this group', 'matter' ),
			esc_html__( 'Previous', 'matter' ),
			esc_html__( 'Next', 'matter' )
		);
	}
}
