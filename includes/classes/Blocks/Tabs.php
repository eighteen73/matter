<?php
/**
 * Tabs block server-side rendering.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Config;
use Eighteen73\Matter\Singleton;
use Eighteen73\Matter\Styling\Color;
use WP_Block;

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
	 * Build tabs list data from tab-list and tab-panels inner blocks.
	 *
	 * @param array<int, array<string, mixed>> $inner_blocks Parsed inner blocks of the tabs block.
	 * @param string                           $tabs_id      Unique ID for the tabs instance.
	 * @return array<int, array<string, mixed>>
	 */
	public static function generate_tabs_list( array $inner_blocks, string $tabs_id = '' ): array {
		$tab_list_inner   = [];
		$tab_panels_inner = [];

		foreach ( $inner_blocks as $inner_block ) {
			$block_name = $inner_block['blockName'] ?? '';

			if ( 'matter/tab-list' === $block_name ) {
				$tab_list_inner = $inner_block['innerBlocks'] ?? [];
			}

			if ( 'matter/tab-panels' === $block_name ) {
				$tab_panels_inner = $inner_block['innerBlocks'] ?? [];
			}
		}

		$tabs_list = [];
		$tab_index = 0;

		foreach ( $tab_list_inner as $button_block ) {
			if ( 'matter/tab-button' !== ( $button_block['blockName'] ?? '' ) ) {
				continue;
			}

			$button_attrs = $button_block['attrs'] ?? [];
			$panel_block  = $tab_panels_inner[ $tab_index ] ?? null;
			$panel_attrs  = is_array( $panel_block ) ? ( $panel_block['attrs'] ?? [] ) : [];

			$tab_label = $button_attrs['label'] ?? $panel_attrs['label'] ?? '';

			$tab_id = ! empty( $panel_attrs['anchor'] )
				? $panel_attrs['anchor']
				: ( ! empty( $tabs_id )
					? $tabs_id . '-tab-' . $tab_index
					: 'tab-' . $tab_index );

			$deep_linking_id = ! empty( $panel_attrs['anchor'] )
				? (string) $panel_attrs['anchor']
				: ( ! empty( $tab_label ) ? sanitize_title( $tab_label ) : $tab_id );

			$tabs_list[] = [
				'id'            => esc_attr( (string) $tab_id ),
				'label'         => $tab_label,
				'index'         => $tab_index,
				'deepLinkingId' => esc_attr( (string) $deep_linking_id ),
				'mediaId'       => $button_attrs['mediaId'] ?? null,
				'mediaType'     => $button_attrs['mediaType'] ?? null,
				'posterId'      => $button_attrs['posterId'] ?? null,
				'focalPoint'    => $button_attrs['focalPoint'] ?? null,
			];

			++$tab_index;
		}

		if ( ! empty( $tabs_list ) ) {
			return $tabs_list;
		}

		// Legacy fallback: derive tabs list from tab-panel labels when tab-buttons are absent.
		foreach ( $tab_panels_inner as $tab_block ) {
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
	 * Enhance saved tab-list buttons with accessibility and interactivity attributes.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param WP_Block             $block      Block instance.
	 * @return string
	 */
	public static function render_tab_list( array $attributes, WP_Block $block ): string {
		$tabs_list    = $block->context['matter/tabs-list'] ?? [];
		$tabs_id      = $block->context['matter/tabs-id'] ?? null;
		$collapses    = ! empty( $block->context['matter/tabs-collapses'] );
		$collapses_on = sanitize_key( (string) ( $block->context['matter/tabs-collapsesOn'] ?? 'lg' ) );

		if ( empty( $tabs_list ) ) {
			return '';
		}

		$allowed_breakpoints = array_keys( Config::file( 'breakpoints' ) );
		if ( ! in_array( $collapses_on, $allowed_breakpoints, true ) ) {
			$collapses_on = 'lg';
		}

		$wrapper_classes = [];
		if ( $collapses ) {
			$wrapper_classes[] = 'is-collapsible';
			$wrapper_classes[] = 'is-collapsible-until-' . $collapses_on;
		}

		$wrapper_attributes = [];

		if ( ! empty( $wrapper_classes ) ) {
			$wrapper_attributes['class'] = implode( ' ', $wrapper_classes );
		}

		if ( $collapses ) {
			$wrapper_attributes['data-collapses']    = 'true';
			$wrapper_attributes['data-collapses-on'] = $collapses_on;
		}

		$wrapper_attributes['style'] = Color::get_styles( $attributes, Config::get( 'colors', 'tabList' ) );

		$buttons_markup = '';
		$button_index   = 0;

		foreach ( $block->inner_blocks as $inner_block ) {
			if ( 'matter/tab-button' !== $inner_block->name ) {
				continue;
			}

			$tab = $tabs_list[ $button_index ] ?? [];
			if ( ! empty( $inner_block->attributes['label'] ) ) {
				$tab['label'] = $inner_block->attributes['label'];
			}

			$tab['mediaId']    = $inner_block->attributes['mediaId'] ?? null;
			$tab['mediaType']  = $inner_block->attributes['mediaType'] ?? null;
			$tab['posterId']   = $inner_block->attributes['posterId'] ?? null;
			$tab['focalPoint'] = $inner_block->attributes['focalPoint'] ?? null;

			$buttons_markup .= self::render_tab_button( $tab, $button_index );
			++$button_index;
		}

		if ( '' === $buttons_markup ) {
			foreach ( $tabs_list as $tab_index => $tab ) {
				$buttons_markup .= self::render_tab_button( $tab, (int) $tab_index );
			}
		}

		$select_markup = $collapses ? self::render_tab_select( $tabs_list, $tabs_id ) : '';

		return sprintf(
			'<div %1$s><div class="wp-block-matter-tab-list__list" role="tablist">%2$s</div>%3$s</div>',
			get_block_wrapper_attributes( $wrapper_attributes ),
			$buttons_markup,
			$select_markup
		);
	}

	/**
	 * Render a single tab button.
	 *
	 * @param array<string, mixed> $tab       Tab data.
	 * @param int                  $tab_index Tab index.
	 * @return string
	 */
	private static function render_tab_button( array $tab, int $tab_index ): string {
		$tab_id      = $tab['id'] ?? 'tab-' . $tab_index;
		$label       = $tab['label'] ?? '';
		$media_id    = isset( $tab['mediaId'] ) ? (int) $tab['mediaId'] : 0;
		$media_type  = $tab['mediaType'] ?? null;
		$poster_id   = isset( $tab['posterId'] ) ? (int) $tab['posterId'] : 0;
		$focal_point = is_array( $tab['focalPoint'] ?? null ) ? $tab['focalPoint'] : null;

		$button_content  = self::render_tab_button_media( $media_id, $media_type, $poster_id, $focal_point );
		$button_content .= sprintf(
			'<span class="wp-block-matter-tab-button__label">%s</span>',
			esc_html( (string) $label )
		);

		return sprintf(
			'<button type="button" class="wp-block-matter-tab-button" role="tab" id="%1$s" aria-controls="%2$s" data-wp-on--click="actions.handleTabClick" data-wp-on--keydown="actions.handleTabKeyDown" data-wp-bind--aria-selected="state.isActiveTab" data-wp-class--is-active="state.isActiveTab" data-wp-bind--tabindex="state.tabIndexAttribute" data-wp-context="%3$s">%4$s</button>',
			esc_attr( 'tab__' . $tab_id ),
			esc_attr( (string) $tab_id ),
			esc_attr(
				(string) wp_json_encode(
					[
						'tabIndex' => $tab_index,
					]
				)
			),
			$button_content
		);
	}

	/**
	 * Build object-position value from a focal point attribute.
	 *
	 * @param array<string, mixed>|null $focal_point Focal point attribute.
	 * @return string
	 */
	private static function get_media_object_position( ?array $focal_point ): string {
		if ( empty( $focal_point ) || ! isset( $focal_point['x'], $focal_point['y'] ) ) {
			return '50% 50%';
		}

		return sprintf(
			'%s%% %s%%',
			(float) $focal_point['x'] * 100,
			(float) $focal_point['y'] * 100
		);
	}

	/**
	 * Render tab button media markup.
	 *
	 * @param int                       $media_id    Attachment ID for the media item.
	 * @param string|null               $media_type  Media type (image or video).
	 * @param int                       $poster_id   Video poster attachment ID.
	 * @param array<string, mixed>|null $focal_point Focal point attribute.
	 * @return string
	 */
	private static function render_tab_button_media( int $media_id, ?string $media_type, int $poster_id, ?array $focal_point ): string {
		if ( $media_id <= 0 ) {
			return '';
		}

		$object_position = self::get_media_object_position( $focal_point );
		$is_video        = 'video' === $media_type;
		$poster_url      = $poster_id > 0 ? wp_get_attachment_url( $poster_id ) : '';
		$poster_url      = is_string( $poster_url ) ? $poster_url : '';
		$media_url       = wp_get_attachment_url( $media_id );
		$media_url       = is_string( $media_url ) ? $media_url : '';

		if ( '' === $media_url ) {
			return '';
		}

		ob_start();

		?>
		<span class="wp-block-matter-tab-button__media">
			<?php if ( $is_video ) : ?>
				<?php if ( '' !== $poster_url ) : ?>
					<link rel="preload" href="<?php echo esc_url( $poster_url ); ?>" as="image" fetchpriority="high">
				<?php endif; ?>

				<video
					class="wp-block-matter-tab-button__video"
					style="object-position: <?php echo esc_attr( $object_position ); ?>"
					preload="none"
					autoplay
					loop
					muted
					playsinline
					<?php if ( '' !== $poster_url ) : ?>
						poster="<?php echo esc_url( $poster_url ); ?>"
					<?php endif; ?>
				>
					<source src="<?php echo esc_url( $media_url ); ?>" type="<?php echo esc_attr( (string) ( get_post_mime_type( $media_id ) ?: 'video/mp4' ) ); ?>">
				</video>
			<?php else : ?>
				<?php
				echo wp_get_attachment_image(
					$media_id,
					'medium',
					false,
					[
						'class'   => 'wp-block-matter-tab-button__image',
						'style'   => 'object-position: ' . esc_attr( $object_position ),
						'loading' => 'eager',
					]
				);
				?>
			<?php endif; ?>
		</span>
		<?php

		return (string) ob_get_clean();
	}

	/**
	 * Render the collapsible tab select control.
	 *
	 * @param array<int, array<string, mixed>> $tabs_list Tabs list data.
	 * @param string                           $tabs_id   Tabs ID.
	 * @return string
	 */
	private static function render_tab_select( array $tabs_list, string $tabs_id ): string {
		$options_markup = '';

		foreach ( $tabs_list as $tab_index => $tab ) {
			$options_markup .= sprintf(
				'<option value="%1$s">%2$s</option>',
				esc_attr( (string) $tab_index ),
				esc_html( (string) ( $tab['label'] ?? '' ) )
			);
		}

		return sprintf(
			'<select class="wp-block-matter-tab-list__select" id="wp-block-matter-tab-list__select__%1$s" aria-label="%2$s" data-wp-on--change="actions.handleSelectChange" data-wp-bind--value="state.selectValue">%3$s</select>',
			esc_attr( (string) $tabs_id ),
			esc_attr__( 'Select tab', 'matter' ),
			$options_markup
		);
	}

	/**
	 * Get the next tab panel index for a tabs instance during render.
	 *
	 * @param string $tabs_id Unique ID for the tabs instance.
	 * @return int
	 */
	public static function get_tab_panel_index( string $tabs_id ): int {
		if ( ! isset( self::$tab_panel_counters[ $tabs_id ] ) ) {
			self::$tab_panel_counters[ $tabs_id ] = 0;
		}

		$tab_index = self::$tab_panel_counters[ $tabs_id ];
		++self::$tab_panel_counters[ $tabs_id ];

		return $tab_index;
	}
}
