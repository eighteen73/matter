<?php
/**
 * Shared trigger helpers for overlay open controls.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Trigger block helpers.
 */
class Trigger {

	/**
	 * Context keys that provide overlay target IDs.
	 *
	 * @var array<int, string>
	 */
	public const TARGET_CONTEXT_KEYS = [
		'matter/modal-id',
		'matter/drawer-id',
		'matter/collapsible-id',
	];

	/**
	 * Resolve the overlay target ID from block context.
	 *
	 * @param \WP_Block $block Block instance.
	 * @return string
	 */
	public static function resolve_target_id_from_context( $block ): string {
		$context = isset( $block->context ) && is_array( $block->context ) ? $block->context : [];

		foreach ( self::TARGET_CONTEXT_KEYS as $context_key ) {
			if ( empty( $context[ $context_key ] ) ) {
				continue;
			}

			return (string) $context[ $context_key ];
		}

		return '';
	}

	/**
	 * Resolve the overlay target ID from context or block attributes.
	 *
	 * @param \WP_Block $block Block instance.
	 * @return string
	 */
	public static function resolve_target_id( $block ): string {
		$from_context = self::resolve_target_id_from_context( $block );

		if ( '' !== $from_context ) {
			return $from_context;
		}

		$attributes = isset( $block->attributes ) && is_array( $block->attributes ) ? $block->attributes : [];

		if ( empty( $attributes['targetId'] ) ) {
			return '';
		}

		return (string) $attributes['targetId'];
	}

	/**
	 * Whether the trigger resolves its target from parent block context.
	 *
	 * @param \WP_Block $block Block instance.
	 * @return bool
	 */
	public static function uses_context_target( $block ): bool {
		return '' !== self::resolve_target_id_from_context( $block );
	}

	/**
	 * Return interactivity attributes for overlay toggle controls.
	 *
	 * @param string $target_id  Overlay target element ID.
	 * @param bool   $standalone Whether the trigger sits outside the overlay parent.
	 * @param string $control    Control type: native (button/a) or custom (group/div).
	 * @param array  $overlay_context Overlay context to pass to the target overlay.
	 * @return array<string, string>
	 */
	public static function get_toggle_attributes( string $target_id, bool $standalone = false, string $control = 'native', array $overlay_context = [] ): array {
		if ( '' === $target_id ) {
			return [];
		}

		$attributes = [
			'aria-controls'               => $target_id,
			'aria-expanded'               => 'false',
			'data-wp-bind--aria-expanded' => 'state.item.isOpen',
			'data-wp-on--click'           => 'actions.toggle',
		];

		if ( 'custom' === $control ) {
			$attributes['role']                = 'button';
			$attributes['tabindex']            = '0';
			$attributes['data-wp-on--keydown'] = 'actions.onKeydownToggle';
		}

		if ( $standalone ) {
			$attributes['data-wp-interactive'] = 'matter/overlay';
		}

		$context = [];

		if ( $standalone ) {
			$context['id'] = $target_id;
		}

		if ( ! empty( $overlay_context ) ) {
			$context['overlayContext'] = $overlay_context;
		}

		if ( ! empty( $context ) ) {
			$attributes['data-wp-context'] = wp_json_encode( $context );
		}

		return $attributes;
	}

	/**
	 * Sanitize trigger overlay context.
	 *
	 * Context is intentionally limited to flat scalar key/value pairs so it can
	 * be safely serialized into the Interactivity API context.
	 *
	 * @param mixed $context Raw overlay context.
	 * @return array<string, string|int|float|bool|null>
	 */
	public static function sanitize_overlay_context( mixed $context ): array {
		if ( ! is_array( $context ) ) {
			return [];
		}

		$sanitized = [];

		foreach ( $context as $key => $value ) {
			if ( ! is_string( $key ) && ! is_int( $key ) ) {
				continue;
			}

			$key = sanitize_key( (string) $key );

			if ( '' === $key ) {
				continue;
			}

			if ( is_string( $value ) ) {
				$sanitized[ $key ] = sanitize_text_field( $value );
				continue;
			}

			if ( is_int( $value ) || is_float( $value ) || is_bool( $value ) || null === $value ) {
				$sanitized[ $key ] = $value;
			}
		}

		return $sanitized;
	}

	/**
	 * Whether a class attribute contains the group block class.
	 *
	 * @param string|null $class_attribute Class attribute value.
	 * @return bool
	 */
	public static function has_group_class( ?string $class_attribute ): bool {
		if ( empty( $class_attribute ) ) {
			return false;
		}

		$classes = preg_split( '/\s+/', trim( $class_attribute ) );

		if ( ! is_array( $classes ) ) {
			return false;
		}

		return in_array( 'wp-block-group', $classes, true );
	}

	/**
	 * Apply trigger toggle attributes to rendered inner block markup.
	 *
	 * @param string $tag_markup        Rendered inner block HTML.
	 * @param string $target_id         Overlay target element ID.
	 * @param bool   $standalone        Whether the trigger sits outside the overlay parent.
	 * @param string $accessible_label  Optional accessible label for custom controls.
	 * @param array  $overlay_context   Overlay context to pass to the target overlay.
	 * @return string
	 */
	public static function apply_toggle_attributes_to_markup( string $tag_markup, string $target_id, bool $standalone = false, string $accessible_label = '', array $overlay_context = [] ): string {
		if ( '' === trim( $tag_markup ) || ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
			return $tag_markup;
		}

		$tag_processor = new \WP_HTML_Tag_Processor( $tag_markup );
		$control_type  = null;

		while ( $tag_processor->next_tag() ) {
			$tag_name = strtolower( $tag_processor->get_tag() );

			if ( in_array( $tag_name, [ 'button', 'a' ], true ) ) {
				$control_type = 'native';
				break;
			}

			if ( 'div' === $tag_name && self::has_group_class( $tag_processor->get_attribute( 'class' ) ) ) {
				$control_type = 'custom';
				break;
			}
		}

		if ( null === $control_type ) {
			return $tag_markup;
		}

		$tag_processor = new \WP_HTML_Tag_Processor( $tag_markup );

		while ( $tag_processor->next_tag() ) {
			$tag_name = strtolower( $tag_processor->get_tag() );

			if ( 'native' === $control_type && in_array( $tag_name, [ 'button', 'a' ], true ) ) {
				self::apply_control_attributes( $tag_processor, $target_id, $standalone, 'native', '', $overlay_context );

				if ( 'button' === $tag_name && ! $tag_processor->get_attribute( 'type' ) ) {
					$tag_processor->set_attribute( 'type', 'button' );
				}

				break;
			}

			if ( 'custom' === $control_type && 'div' === $tag_name && self::has_group_class( $tag_processor->get_attribute( 'class' ) ) ) {
				self::apply_control_attributes( $tag_processor, $target_id, $standalone, 'custom', $accessible_label, $overlay_context );
				break;
			}
		}

		return $tag_processor->get_updated_html();
	}

	/**
	 * Apply shared trigger control attributes to the current tag.
	 *
	 * @param \WP_HTML_Tag_Processor $tag_processor     Tag processor positioned on control tag.
	 * @param string                 $target_id         Overlay target element ID.
	 * @param bool                   $standalone        Whether the trigger sits outside the overlay parent.
	 * @param string                 $control           Control type.
	 * @param string                 $accessible_label  Optional accessible label for custom controls.
	 * @param array                  $overlay_context   Overlay context to pass to the target overlay.
	 * @return void
	 */
	private static function apply_control_attributes( \WP_HTML_Tag_Processor $tag_processor, string $target_id, bool $standalone, string $control, string $accessible_label = '', array $overlay_context = [] ): void {
		$tag_processor->add_class( 'wp-block-matter-trigger' );
		$tag_processor->add_class( 'wp-block-matter-trigger__control' );

		foreach ( self::get_toggle_attributes( $target_id, $standalone, $control, $overlay_context ) as $attribute => $value ) {
			$tag_processor->set_attribute( $attribute, $value );
		}

		if ( 'custom' === $control && '' !== $accessible_label ) {
			$tag_processor->set_attribute( 'aria-label', $accessible_label );
		}
	}
}
