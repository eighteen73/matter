import {
	Button,
	RangeControl,
	SelectControl,
	TabPanel,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import breakpoints from '../../../constants/breakpoints';
import { DEFAULT_EMBLA_CONFIG } from '../../../utils/embla-block-config';

const BASE_TAB = 'base';

const TABS = [
	{ name: BASE_TAB, title: __('Default', 'eighteen73-blocks') },
	...Object.entries(breakpoints).map(([name, bp]) => ({
		name,
		title: bp.label,
	})),
];

/**
 * The full set of carousel option/autoplay fields. Used both for the Default
 * tab (writing directly to `emblaConfig.options` / `emblaConfig.plugins.autoplay`)
 * and for each per-breakpoint tab (writing to a layer partial). The parent
 * decides which setter to wire in via `onChangeOption` / `onChangeAutoplay`.
 */
function CarouselFields({
	options,
	autoplay,
	onChangeOption,
	onChangeAutoplay,
}) {
	return (
		<>
			<ToggleControl
				label={__('Loop', 'eighteen73-blocks')}
				checked={!!options.loop}
				onChange={(value) => onChangeOption('loop', value)}
			/>

			<SelectControl
				label={__('Axis', 'eighteen73-blocks')}
				value={options.axis}
				options={[
					{
						label: __('Horizontal', 'eighteen73-blocks'),
						value: 'x',
					},
					{
						label: __('Vertical', 'eighteen73-blocks'),
						value: 'y',
					},
				]}
				onChange={(value) => onChangeOption('axis', value)}
			/>

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

			<ToggleControl
				label={__('Autoplay', 'eighteen73-blocks')}
				checked={!!autoplay.active}
				onChange={(value) => onChangeAutoplay('active', value)}
			/>

			{autoplay.active && (
				<SelectControl
					label={__('Autoplay Type', 'eighteen73-blocks')}
					value={autoplay.type}
					options={[
						{
							label: __('Normal', 'eighteen73-blocks'),
							value: 'normal',
						},
						{
							label: __('Scroll', 'eighteen73-blocks'),
							value: 'scroll',
						},
					]}
					onChange={(value) => onChangeAutoplay('type', value)}
				/>
			)}
		</>
	);
}

/**
 * Render the carousel settings inside a TabPanel: a Default tab that edits
 * the base config, followed by one tab per breakpoint that edits a partial
 * override layer.
 *
 * Per-breakpoint fields show the effective value (layer override falling
 * back to base) but writes go to the layer so only changed keys persist.
 */
export default function BreakpointControls({
	baseOptions,
	baseAutoplay,
	breakpointLayers,
	onChangeBaseOption,
	onChangeBaseAutoplay,
	onChangeLayerOption,
	onChangeLayerAutoplay,
	onResetLayer,
}) {
	return (
		<TabPanel
			className="eighteen73-blocks-carousel__settings-tabs"
			tabs={TABS}
		>
			{(tab) => {
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
				};
				const effectiveAutoplay = {
					active: layerAutoplay.active ?? baseAutoplay.active,
					type: layerAutoplay.type ?? baseAutoplay.type,
				};

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
							{__(
								'Reset breakpoint',
								'eighteen73-blocks'
							)}
						</Button>
					</>
				);
			}}
		</TabPanel>
	);
}
