/**
 * WordPress dependencies
 */
import { InspectorControls } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import AdvancedControls from './advanced-controls';
import CarouselControls from './carousel-controls';

export default function CarouselInspectorControls({
	baseOptions,
	baseAutoplay,
	baseFade,
	breakpointLayers,
	onChangeBaseOption,
	onChangeBaseAutoplay,
	onChangeBaseFade,
	onChangeLayerOption,
	onChangeLayerAutoplay,
	onChangeLayerFade,
	onResetLayer,
	emblaConfig,
	setAttributes,
	advancedEmblaConfig,
	advancedEmblaConfigMerge,
}) {
	return (
		<InspectorControls group="settings">
			<CarouselControls
				baseOptions={baseOptions}
				baseAutoplay={baseAutoplay}
				baseFade={baseFade}
				breakpointLayers={breakpointLayers}
				onChangeBaseOption={onChangeBaseOption}
				onChangeBaseAutoplay={onChangeBaseAutoplay}
				onChangeBaseFade={onChangeBaseFade}
				onChangeLayerOption={onChangeLayerOption}
				onChangeLayerAutoplay={onChangeLayerAutoplay}
				onChangeLayerFade={onChangeLayerFade}
				onResetLayer={onResetLayer}
				emblaConfig={emblaConfig}
				setAttributes={setAttributes}
			/>

			<AdvancedControls
				advancedEmblaConfig={advancedEmblaConfig}
				advancedEmblaConfigMerge={advancedEmblaConfigMerge}
				setAttributes={setAttributes}
			/>
		</InspectorControls>
	);
}
