import {
	Button,
	RangeControl,
	TabPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOptionIcon as ToggleGroupControlOptionIcon,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { settings, arrowDown, arrowRight } from '@wordpress/icons';

import breakpoints from '../../../constants/breakpoints';
import { DEFAULT_EMBLA_CONFIG } from '../../../utils/embla-block-config';

const BASE_TAB = 'base';

const buildTabs = () => [
	{
		name: BASE_TAB,
		title: __('Default', 'eighteen73-blocks'),
		icon: settings,
	},
	...Object.entries(breakpoints).map(([name, bp]) => ({
		name,
		title: bp.label,
		icon: bp.icon,
	})),
];

/**
 * The full set of carousel option/autoplay fields. Used both for the Default
 * tab (writing directly to `emblaConfig.options` / `emblaConfig.plugins.autoplay`)
 * and for each per-breakpoint tab (writing to a layer partial). The parent
 * decides which setter to wire in via `onChangeOption` / `onChangeAutoplay`.
 * @param {Object}   options                  - The options.
 * @param {Object}   options.options          - The options.
 * @param {Object}   options.autoplay         - The autoplay.
 * @param {Function} options.onChangeOption   - The onChangeOption function.
 * @param {Function} options.onChangeAutoplay - The onChangeAutoplay function.
 */
function CarouselFields({
	options,
	autoplay,
	onChangeOption,
	onChangeAutoplay,
}) {
	return (
		<div style={{ marginTop: '16px' }}>
			<RangeControl
				label={__('Slides to scroll', 'eighteen73-blocks')}
				value={options.slidesToScroll}
				onChange={(value) =>
					onChangeOption(
						'slidesToScroll',
						value === undefined
							? DEFAULT_EMBLA_CONFIG.options.slidesToScroll
							: value
					)
				}
				min={1}
				max={10}
				step={1}
			/>

			<ToggleGroupControl
				label={__('Enable Looping', 'eighteen73-blocks')}
				value={!!options.loop}
				onChange={(value) => onChangeOption('loop', value)}
				isBlock
			>
				<ToggleGroupControlOption
					value={false}
					label={__('No', 'eighteen73-blocks')}
				/>
				<ToggleGroupControlOption
					value={true}
					label={__('Yes', 'eighteen73-blocks')}
				/>
			</ToggleGroupControl>

			<ToggleGroupControl
				label={__('Axis', 'eighteen73-blocks')}
				value={options.axis}
				onChange={(value) => onChangeOption('axis', value)}
				isBlock
			>
				<ToggleGroupControlOptionIcon
					value="x"
					label={__('Horizontal', 'eighteen73-blocks')}
					icon={arrowRight}
				/>
				<ToggleGroupControlOptionIcon
					value="y"
					label={__('Vertical', 'eighteen73-blocks')}
					icon={arrowDown}
				/>
			</ToggleGroupControl>

			<ToggleGroupControl
				label={__('Autoplay', 'eighteen73-blocks')}
				value={!!autoplay.active}
				onChange={(value) => onChangeAutoplay('active', value)}
				isBlock
			>
				<ToggleGroupControlOption
					value={false}
					label={__('No', 'eighteen73-blocks')}
				/>
				<ToggleGroupControlOption
					value={true}
					label={__('Yes', 'eighteen73-blocks')}
				/>
			</ToggleGroupControl>

			{autoplay.active && (
				<ToggleGroupControl
					label={__('Autoplay Type', 'eighteen73-blocks')}
					value={autoplay.type}
					onChange={(value) => onChangeAutoplay('type', value)}
					isBlock
				>
					<ToggleGroupControlOption
						value="slide"
						label={__('Slide', 'eighteen73-blocks')}
					/>
					<ToggleGroupControlOption
						value="scroll"
						label={__('Scroll', 'eighteen73-blocks')}
					/>
				</ToggleGroupControl>
			)}

			<ToggleGroupControl
				label={__('Disable Carousel', 'eighteen73-blocks')}
				value={!!options.active}
				onChange={(value) => onChangeOption('active', value)}
				isBlock
			>
				<ToggleGroupControlOption
					value={true}
					label={__('No', 'eighteen73-blocks')}
				/>
				<ToggleGroupControlOption
					value={false}
					label={__('Yes', 'eighteen73-blocks')}
				/>
			</ToggleGroupControl>
		</div>
	);
}

/**
 * Render the carousel settings inside a TabPanel: a Default tab that edits
 * the base config, followed by one tab per breakpoint that edits a partial
 * override layer.
 *
 * Per-breakpoint fields show the effective value (layer override falling
 * back to base) but writes go to the layer so only changed keys persist.
 * @param {Object}   baseOptions                       - The base options.
 * @param {Object}   baseOptions.baseOptions           - The base options.
 * @param {Object}   baseOptions.baseAutoplay          - The base autoplay.
 * @param {Object}   baseOptions.breakpointLayers      - The breakpoint layers.
 * @param {Function} baseOptions.onChangeBaseOption    - The onChangeBaseOption function.
 * @param {Function} baseOptions.onChangeBaseAutoplay  - The onChangeBaseAutoplay function.
 * @param {Function} baseOptions.onChangeLayerOption   - The onChangeLayerOption function.
 * @param {Function} baseOptions.onChangeLayerAutoplay - The onChangeLayerAutoplay function.
 * @param {Function} baseOptions.onResetLayer          - The onResetLayer function.
 */
export default function CarouselControls({
	baseOptions,
	baseAutoplay,
	breakpointLayers,
	onChangeBaseOption,
	onChangeBaseAutoplay,
	onChangeLayerOption,
	onChangeLayerAutoplay,
	onResetLayer,
}) {
	const tabs = useMemo(() => buildTabs(), []);

	return (
		<TabPanel
			className="eighteen73-blocks-carousel__settings-tabs"
			initialTabName={BASE_TAB}
			tabs={tabs}
		>
			{(tab) => {
				const layer = breakpointLayers?.[tab.name] || {};
				const layerOptions = layer.options || {};
				const layerAutoplay = layer.plugins?.autoplay || {};
				const hasLayer = !!breakpointLayers?.[tab.name];

				const effectiveOptions = {
					loop: layerOptions.loop ?? baseOptions.loop,
					axis: layerOptions.axis ?? baseOptions.axis,
					slidesToScroll:
						layerOptions.slidesToScroll ??
						baseOptions.slidesToScroll,
					active: layerOptions.active ?? baseOptions.active,
				};
				const effectiveAutoplay = {
					active: layerAutoplay.active ?? baseAutoplay.active,
					type: layerAutoplay.type ?? baseAutoplay.type,
				};

				if (tab.name === BASE_TAB) {
					return (
						<CarouselFields
							options={baseOptions}
							autoplay={baseAutoplay}
							onChangeOption={onChangeBaseOption}
							onChangeAutoplay={onChangeBaseAutoplay}
						/>
					);
				}

				return (
					<>
						<CarouselFields
							options={effectiveOptions}
							autoplay={effectiveAutoplay}
							onChangeOption={(key, value) =>
								onChangeLayerOption(tab.name, key, value)
							}
							onChangeAutoplay={(key, value) =>
								onChangeLayerAutoplay(tab.name, key, value)
							}
						/>

						<Button
							variant="secondary"
							isDestructive
							disabled={!hasLayer}
							onClick={() => onResetLayer(tab.name)}
						>
							{__('Reset breakpoint', 'eighteen73-blocks')}
						</Button>
					</>
				);
			}}
		</TabPanel>
	);
}
