<?php
/**
 * Modal block.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Modal block helpers.
 */
class Modal {

	/**
	 * Resolve the modal ID from block attributes and context.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param array<string, mixed> $context    Block context.
	 * @return string
	 */
	public static function resolve_id( array $attributes, array $context = [] ): string {
		return Overlay::resolve_id( $attributes, $context, 'matter-modal-' );
	}

	/**
	 * Sanitize URL trigger rules for interactivity state.
	 *
	 * @param mixed $url_triggers Raw urlTriggers attribute.
	 * @return array<int, array{param: string, value: string, match: string}>
	 */
	public static function sanitize_url_triggers( $url_triggers ): array {
		if ( ! is_array( $url_triggers ) ) {
			return [];
		}

		$sanitized = [];

		foreach ( $url_triggers as $rule ) {
			if ( ! is_array( $rule ) ) {
				continue;
			}

			$param = isset( $rule['param'] ) ? sanitize_key( $rule['param'] ) : '';

			if ( '' === $param ) {
				continue;
			}

			$value = isset( $rule['value'] ) ? sanitize_text_field( (string) $rule['value'] ) : '';
			$match = isset( $rule['match'] ) && 'regex' === $rule['match'] ? 'regex' : 'exact';

			$sanitized[] = [
				'param' => $param,
				'value' => $value,
				'match' => $match,
			];
		}

		return $sanitized;
	}
}
