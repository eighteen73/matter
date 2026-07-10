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
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { settings, arrowDown, arrowRight } from '@wordpress/icons';

import breakpoints from '../../../constants/breakpoints';
import SpacingControl from '../../../components/spacing-control';
import { DEFAULT_EMBLA_CONFIG } from '../utils/embla-block-config';

const BASE_TAB = 'base';

const buildTabs = () => [
	{
		name: BASE_TAB,
		title: __('Default', 'matter'),
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
 * @param {Object}   root0                  - The root object.
 * @param {Object}   root0.options          - The options.
 * @param {Object}   root0.autoplay         - The autoplay.
 * @param {Object}   root0.fade             - The fade.
 * @param {Function} root0.onChangeOption   - The onChangeOption function.
 * @param {Function} root0.onChangeAutoplay - The onChangeAutoplay function.
 * @param {Function} root0.onChangeFade     - The onChangeFade function.
 */
function CarouselFields({
	options,
	autoplay,
	fade,
	onChangeOption,
	onChangeAutoplay,
	onChangeFade,
}) {
	return (
		<VStack spacing={4} style={{ marginTop: '16px' }}>
			<RangeControl
				label={__('Slides to show', 'matter')}
				value={fade.active ? 1 : options.slidesToShow}
				onChange={(value) =>
					onChangeOption(
						'slidesToShow',
						value === undefined
							? DEFAULT_EMBLA_CONFIG.options.slidesToShow
							: value
					)
				}
				min={1}
				max={10}
				step={1}
				disabled={!!fade.active}
			/>

			<RangeControl
				label={__('Slides to scroll', 'matter')}
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

			<SpacingControl
				label={__('Slide gap', 'matter')}
				value={options.slideGap}
				onChange={(value) =>
					onChangeOption(
						'slideGap',
						value === undefined
							? DEFAULT_EMBLA_CONFIG.options.slideGap
							: value
					)
				}
			/>

			<ToggleGroupControl
				label={__('Looping', 'matter')}
				value={!!options.loop}
				onChange={(value) => onChangeOption('loop', value)}
				isBlock
			>
				<ToggleGroupControlOption
					value={false}
					label={__('No', 'matter')}
				/>
				<ToggleGroupControlOption
					value={true}
					label={__('Yes', 'matter')}
				/>
			</ToggleGroupControl>

			<ToggleGroupControl
				label={__('Axis', 'matter')}
				value={options.axis}
				onChange={(value) => onChangeOption('axis', value)}
				isBlock
			>
				<ToggleGroupControlOptionIcon
					value="x"
					label={__('Horizontal', 'matter')}
					icon={arrowRight}
				/>
				<ToggleGroupControlOptionIcon
					value="y"
					label={__('Vertical', 'matter')}
					icon={arrowDown}
				/>
			</ToggleGroupControl>

			<ToggleGroupControl
				label={__('Autoplay', 'matter')}
				value={!!autoplay.active}
				onChange={(value) => onChangeAutoplay('active', value)}
				isBlock
			>
				<ToggleGroupControlOption
					value={false}
					label={__('No', 'matter')}
				/>
				<ToggleGroupControlOption
					value={true}
					label={__('Yes', 'matter')}
				/>
			</ToggleGroupControl>

			<ToggleGroupControl
				label={__('Transition', 'matter')}
				value={!!fade.active}
				onChange={(value) => onChangeFade('active', value)}
				isBlock
			>
				<ToggleGroupControlOption
					value={false}
					label={__('Slide', 'matter')}
				/>
				<ToggleGroupControlOption
					value={true}
					label={__('Fade', 'matter')}
				/>
			</ToggleGroupControl>

			{autoplay.active && (
				<ToggleGroupControl
					label={__('Autoplay Type', 'matter')}
					value={autoplay.type}
					onChange={(value) => onChangeAutoplay('type', value)}
					isBlock
				>
					<ToggleGroupControlOption
						value="slide"
						label={__('Slide', 'matter')}
					/>
					<ToggleGroupControlOption
						value="scroll"
						label={__('Scroll', 'matter')}
					/>
				</ToggleGroupControl>
			)}

			<ToggleGroupControl
				label={__('Disabled', 'matter')}
				value={!!options.active}
				onChange={(value) => onChangeOption('active', value)}
				isBlock
			>
				<ToggleGroupControlOption
					value={true}
					label={__('No', 'matter')}
				/>
				<ToggleGroupControlOption
					value={false}
					label={__('Yes', 'matter')}
				/>
			</ToggleGroupControl>
		</VStack>
	);
}

/**
 * Render the carousel settings inside a TabPanel: a Default tab that edits
 * the base config, followed by one tab per breakpoint that edits a partial
 * override layer.
 *
 * Per-breakpoint fields show the effective value (layer override falling
 * back to base) but writes go to the layer so only changed keys persist.
 * @param {Object}   root0                       - The root object.
 * @param {Object}   root0.baseOptions           - The base options.
 * @param {Object}   root0.baseAutoplay          - The base autoplay.
 * @param {Object}   root0.baseFade              - The base fade.
 * @param {Object}   root0.breakpointLayers      - The breakpoint layers.
 * @param {Function} root0.onChangeBaseOption    - The onChangeBaseOption function.
 * @param {Function} root0.onChangeBaseAutoplay  - The onChangeBaseAutoplay function.
 * @param {Function} root0.onChangeBaseFade      - The onChangeBaseFade function.
 * @param {Function} root0.onChangeLayerOption   - The onChangeLayerOption function.
 * @param {Function} root0.onChangeLayerAutoplay - The onChangeLayerAutoplay function.
 * @param {Function} root0.onChangeLayerFade     - The onChangeLayerFade function.
 * @param {Function} root0.onResetLayer          - The onResetLayer function.
 * @param {Object}   root0.emblaConfig           - The embla config.
 * @param {Function} root0.setAttributes         - The setAttributes function.
 */
export default function CarouselControls({
	baseOptions,
	baseAutoplay,
	baseFade,
	breakpointLayers,
	onChangeBaseOption,
	onChangeBaseAutoplay,
	onChangeLayerOption,
	onChangeLayerAutoplay,
	onChangeBaseFade,
	onChangeLayerFade,
	onResetLayer,
	emblaConfig,
	setAttributes,
}) {
	const tabs = useMemo(() => buildTabs(), []);

	return (
		<ToolsPanel label={__('Settings', 'matter')}>
			<ToolsPanelItem
				label={__('Settings', 'matter')}
				hasValue={() => Object.keys(emblaConfig ?? {}).length > 0}
				isShownByDefault
				onDeselect={() =>
					setAttributes({
						emblaConfig: {
							options: {
								loop: false,
								axis: 'x',
								slidesToScroll: 1,
								active: true,
								slidesToShow: 1,
								slideGap: '',
							},
							plugins: {
								autoplay: {
									active: false,
									type: 'slide',
									speed: 1,
								},
								fade: {
									active: false,
								},
							},
							breakpointLayers: {},
						},
					})
				}
			>
				<TabPanel
					className="matter-carousel__settings-tabs"
					initialTabName={BASE_TAB}
					tabs={tabs}
				>
					{(tab) => {
						const layer = breakpointLayers?.[tab.name] || {};
						const layerOptions = layer.options || {};
						const layerAutoplay = layer.plugins?.autoplay || {};
						const layerFade = layer.plugins?.fade || {};
						const hasLayer = !!breakpointLayers?.[tab.name];

						const effectiveOptions = {
							loop: layerOptions.loop ?? baseOptions.loop,
							axis: layerOptions.axis ?? baseOptions.axis,
							slidesToScroll:
								layerOptions.slidesToScroll ??
								baseOptions.slidesToScroll,
							slidesToShow:
								layerOptions.slidesToShow ??
								baseOptions.slidesToShow,
							slideGap:
								layerOptions.slideGap ?? baseOptions.slideGap,
							active: layerOptions.active ?? baseOptions.active,
						};
						const effectiveAutoplay = {
							active: layerAutoplay.active ?? baseAutoplay.active,
							type: layerAutoplay.type ?? baseAutoplay.type,
						};

						const effectiveFade = {
							active: layerFade.active ?? baseFade.active,
						};

						if (tab.name === BASE_TAB) {
							return (
								<CarouselFields
									options={baseOptions}
									autoplay={baseAutoplay}
									fade={baseFade}
									onChangeOption={onChangeBaseOption}
									onChangeAutoplay={onChangeBaseAutoplay}
									onChangeFade={onChangeBaseFade}
								/>
							);
						}

						return (
							<>
								<CarouselFields
									options={effectiveOptions}
									autoplay={effectiveAutoplay}
									fade={effectiveFade}
									onChangeOption={(key, value) =>
										onChangeLayerOption(
											tab.name,
											key,
											value
										)
									}
									onChangeAutoplay={(key, value) =>
										onChangeLayerAutoplay(
											tab.name,
											key,
											value
										)
									}
									onChangeFade={(key, value) =>
										onChangeLayerFade(tab.name, key, value)
									}
								/>

								{hasLayer && (
									<Button
										variant="secondary"
										isDestructive
										onClick={() => onResetLayer(tab.name)}
										style={{ marginTop: '16px' }}
									>
										{__('Reset breakpoint', 'matter')}
									</Button>
								)}
							</>
						);
					}}
				</TabPanel>
			</ToolsPanelItem>
		</ToolsPanel>
	);
}
