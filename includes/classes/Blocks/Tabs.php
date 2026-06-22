<?php
/**
 * Tabs block server-side rendering.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Singleton;
use WP_Block;
use WP_HTML_Tag_Processor;

defined( 'ABSPATH' ) || exit;

/**
 * Provides tabs list context and frontend interactivity markup.
 */
class Tabs {
	use Singleton;

	/**
	 * Per-tabs-instance tab panel counters for render order.
	 *
	 * @var array<string, int>
	 */
	private static $tab_panel_counters = [];

	/**
	 * Setup tabs block hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'render_block_context', [ $this, 'provide_context' ], 10, 2 );
	}

	/**
	 * Build tabs list data from tab-panel inner blocks.
	 *
	 * @param array<int, array<string, mixed>> $inner_blocks Parsed inner blocks of the tabs block.
	 * @param string                           $tabs_id      Unique ID for the tabs instance.
	 * @return array<int, array<string, mixed>>
	 */
	public static function generate_tabs_list( array $inner_blocks, string $tabs_id = '' ): array {
		$tabs_list = [];

		foreach ( $inner_blocks as $inner_block ) {
			if ( 'matter/tab-panels' !== ( $inner_block['blockName'] ?? '' ) ) {
				continue;
			}

			$tab_index = 0;

			foreach ( $inner_block['innerBlocks'] ?? [] as $tab_block ) {
				if ( 'matter/tab-panel' !== ( $tab_block['blockName'] ?? '' ) ) {
					continue;
				}

				$attrs     = $tab_block['attrs'] ?? [];
				$tab_label = $attrs['label'] ?? '';

				$tab_id = ! empty( $attrs['anchor'] )
					? $attrs['anchor']
					: ( ! empty( $tabs_id )
						? $tabs_id . '-tab-' . $tab_index
						: 'tab-' . $tab_index );

				$deep_linking_id = ! empty( $attrs['anchor'] )
					? (string) $attrs['anchor']
					: ( ! empty( $tab_label ) ? sanitize_title( $tab_label ) : $tab_id );

				$tabs_list[] = [
					'id'            => esc_attr( (string) $tab_id ),
					'label'         => $tab_label,
					'index'         => $tab_index,
					'deepLinkingId' => esc_attr( (string) $deep_linking_id ),
				];

				++$tab_index;
			}

			break;
		}

		return $tabs_list;
	}

	/**
	 * Provide tabs list context during server-side rendering.
	 *
	 * @param array<string, mixed> $context      Default block context.
	 * @param array<string, mixed> $parsed_block The block being rendered.
	 * @return array<string, mixed>
	 */
	public function provide_context( array $context, array $parsed_block ): array {
		if ( 'matter/tabs' !== ( $parsed_block['blockName'] ?? '' ) ) {
			return $context;
		}

		$tabs_id = $parsed_block['attrs']['anchor'] ?? wp_unique_id( 'tabs_' );

		$context['matter/tabs-list'] = self::generate_tabs_list(
			$parsed_block['innerBlocks'] ?? [],
			(string) $tabs_id
		);
		$context['matter/tabs-id']   = $tabs_id;

		return $context;
	}

	/**
	 * Render the tabs wrapper with interactivity directives.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param string               $content    Saved block content.
	 * @param WP_Block             $block      Block instance.
	 * @return string
	 */
	public static function render_tabs( array $attributes, string $content, WP_Block $block ): string {
		$active_tab_index            = $attributes['activeTabIndex'] ?? 0;
		$tabs_list                   = $block->context['matter/tabs-list'] ?? [];
		$tabs_id                     = $block->context['matter/tabs-id'] ?? null;
		$deep_linking                = $attributes['deepLinking'] ?? false;
		$deep_linking_update_history = $attributes['deepLinkingUpdateHistory'] ?? false;

		if ( empty( $tabs_id ) ) {
			return $content;
		}

		$output = $content;

		if ( false === strpos( $content, 'wp-block-matter-tabs' ) ) {
			$output = sprintf(
				'<div %1$s>%2$s</div>',
				get_block_wrapper_attributes(),
				$content
			);
		}

		$tag_processor = new WP_HTML_Tag_Processor( $output );

		if ( ! $tag_processor->next_tag( [ 'class_name' => 'wp-block-matter-tabs' ] ) ) {
			return $output;
		}

		$tag_processor->set_attribute( 'data-wp-interactive', 'core/tabs/private' );
		$tag_processor->set_attribute(
			'data-wp-context',
			(string) wp_json_encode(
				[
					'tabsId'                   => $tabs_id,
					'activeTabIndex'           => $active_tab_index,
					'deepLinking'              => (bool) $deep_linking,
					'deepLinkingUpdateHistory' => (bool) $deep_linking_update_history,
				]
			)
		);
		$tag_processor->set_attribute( 'data-wp-init', 'callbacks.onTabsInit' );
		$tag_processor->set_attribute( 'data-wp-on--keydown', 'actions.handleTabKeyDown' );
		$tag_processor->set_attribute( 'data-wp-on-window--hashchange', 'actions.onHashChange' );

		wp_interactivity_state(
			'core/tabs/private',
			[
				$tabs_id => $tabs_list,
			]
		);

		return $tag_processor->get_updated_html();
	}

	/**
	 * Enhance saved tab-list buttons with accessibility and interactivity attributes.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param string               $content    Saved block content.
	 * @param WP_Block             $block      Block instance.
	 * @return string
	 */
	public static function render_tab_list( array $attributes, string $content, WP_Block $block ): string {
		$tabs_list = $block->context['matter/tabs-list'] ?? [];

		if ( empty( $tabs_list ) ) {
			return $content;
		}

		$tag_processor = new WP_HTML_Tag_Processor( $content );
		$tab_index     = 0;

		while ( $tag_processor->next_tag( 'button' ) ) {
			$tab = $tabs_list[ $tab_index ] ?? null;

			if ( null === $tab ) {
				break;
			}

			$tab_id = $tab['id'] ?? 'tab-' . $tab_index;

			$tag_processor->set_attribute( 'id', 'tab__' . $tab_id );
			$tag_processor->set_attribute( 'aria-controls', $tab_id );
			$tag_processor->set_attribute( 'data-wp-on--click', 'actions.handleTabClick' );
			$tag_processor->set_attribute( 'data-wp-on--keydown', 'actions.handleTabKeyDown' );
			$tag_processor->set_attribute( 'data-wp-bind--aria-selected', 'state.isActiveTab' );
			$tag_processor->set_attribute( 'data-wp-bind--tabindex', 'state.tabIndexAttribute' );
			$tag_processor->set_attribute(
				'data-wp-context',
				(string) wp_json_encode(
					[
						'tabIndex' => $tab_index,
					]
				)
			);

			++$tab_index;
		}

		return $tag_processor->get_updated_html();
	}

	/**
	 * Render a tab panel with interactivity and accessibility attributes.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param string               $content    Saved block content.
	 * @param WP_Block             $block      Block instance.
	 * @return string
	 */
	public static function render_tab_panel( array $attributes, string $content, WP_Block $block ): string {
		$tabs_id          = $block->context['matter/tabs-id'] ?? '';
		$active_tab_index = (int) ( $block->context['matter/tabs-activeTabIndex'] ?? 0 );

		if ( ! isset( self::$tab_panel_counters[ $tabs_id ] ) ) {
			self::$tab_panel_counters[ $tabs_id ] = 0;
		}

		$tab_index = self::$tab_panel_counters[ $tabs_id ];
		++self::$tab_panel_counters[ $tabs_id ];

		$output = $content;

		if ( false === strpos( $content, 'wp-block-matter-tab-panel' ) ) {
			$output = sprintf(
				'<section %1$s>%2$s</section>',
				get_block_wrapper_attributes( [ 'role' => 'tabpanel' ] ),
				$content
			);
		}

		$tag_processor = new WP_HTML_Tag_Processor( $output );

		if ( ! $tag_processor->next_tag( [ 'class_name' => 'wp-block-matter-tab-panel' ] ) ) {
			return $output;
		}

		$tab_id = (string) $tag_processor->get_attribute( 'id' );

		if ( '' === $tab_id ) {
			$tab_id = ! empty( $tabs_id )
				? $tabs_id . '-tab-' . $tab_index
				: 'tab-' . $tab_index;
			$tag_processor->set_attribute( 'id', $tab_id );
		}

		$tabs_list       = $block->context['matter/tabs-list'] ?? [];
		$deep_linking_id = $tabs_list[ $tab_index ]['deepLinkingId'] ?? $tab_id;

		$tag_processor->set_attribute( 'data-wp-interactive', 'core/tabs/private' );
		$tag_processor->set_attribute(
			'data-wp-context',
			(string) wp_json_encode(
				[
					'tabsId'   => $tabs_id,
					'tabIndex' => $tab_index,
					'tab'      => [
						'id' => $tab_id,
					],
				]
			)
		);
		$tag_processor->set_attribute( 'role', 'tabpanel' );
		$tag_processor->set_attribute( 'aria-labelledby', 'tab__' . $tab_id );
		$tag_processor->set_attribute( 'data-deep-linking-id', $deep_linking_id );
		$tag_processor->set_attribute( 'data-wp-bind--hidden', '!state.isActiveTab' );
		$tag_processor->set_attribute( 'tabindex', '0' );

		if ( $tab_index !== $active_tab_index ) {
			$tag_processor->set_attribute( 'hidden', true );
		}

		return $tag_processor->get_updated_html();
	}
}
