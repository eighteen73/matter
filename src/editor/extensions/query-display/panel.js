/**
 * WordPress dependencies
 */
import { InspectorControls } from '@wordpress/block-editor';
import { store as blocksStore } from '@wordpress/blocks';
import {
	Button,
	TextControl,
	__experimentalToolsPanel as ToolsPanel, // eslint-disable-line @wordpress/no-unsafe-wp-apis -- What core uses for block controls; experimental in name only.
	__experimentalToolsPanelItem as ToolsPanelItem, // eslint-disable-line @wordpress/no-unsafe-wp-apis
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	ACCORDION_SETTINGS,
	AccordionSettings,
} from '../../../blocks/accordion/settings';
import { TABS_SETTINGS, TabsSettings } from '../../../blocks/tabs/settings';
import { DISPLAY_BLOCKS } from '../../../query-display/templates';
import SchemeControl from '../../components/scheme-control';

const TITLES = {
	carousel: __('Carousel', 'matter'),
	accordion: __('Accordion', 'matter'),
	tabs: __('Tabs', 'matter'),
};

// Each type's own settings, beyond style and colour scheme.
const SETTINGS = {
	carousel: ['label'],
	accordion: ACCORDION_SETTINGS,
	tabs: TABS_SETTINGS,
};

/**
 * The block's styles (its registered block styles), as buttons.
 *
 * @param {Object}   props
 * @param {string}   props.block    Block name.
 * @param {string}   props.value    Selected style name.
 * @param {Function} props.onChange Receives a style name.
 * @return {Element} Style buttons.
 */
function StylePicker({ block, value, onChange }) {
	const styles = useSelect(
		(select) => select(blocksStore).getBlockStyles(block) ?? [],
		[block]
	);
	const active =
		value || styles.find(({ isDefault }) => isDefault)?.name || '';

	return (
		<div className="matter-display-styles">
			{styles.map(({ name, label }) => (
				<Button
					key={name}
					__next40pxDefaultSize
					variant={name === active ? 'primary' : 'secondary'}
					aria-pressed={name === active}
					onClick={() => onChange(name)}
				>
					{label}
				</Button>
			))}
		</div>
	);
}

/**
 * The carousel's name.
 *
 * @param {Object}   props
 * @param {Object}   props.values Settings.
 * @param {Function} props.set    Receives changed settings.
 * @return {Element} Panel item.
 */
function CarouselSettings({ values, set }) {
	return (
		<ToolsPanelItem
			label={__('Name', 'matter')}
			hasValue={() => !!values.label}
			onDeselect={() => set({ label: undefined })}
			isShownByDefault
		>
			<TextControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={__('Name', 'matter')}
				help={__(
					'Describes the carousel to screen readers, e.g. "Latest news".',
					'matter'
				)}
				value={values.label ?? ''}
				onChange={(label) => set({ label })}
			/>
		</ToolsPanelItem>
	);
}

const TYPE_SETTINGS = {
	carousel: CarouselSettings,
	accordion: AccordionSettings,
	tabs: TabsSettings,
};

/**
 * The block's settings, above the query's own controls: its style, colour
 * scheme and own settings, the same controls as the block itself has.
 *
 * @param {Object}   props
 * @param {Object}   props.display The `matterDisplay` attribute.
 * @param {Function} props.set     Updates it.
 * @return {Element} Inspector panel.
 */
export default function DisplayPanel({ display, set }) {
	const { type } = display;
	const Settings = TYPE_SETTINGS[type];
	const hasStyles = useSelect(
		(select) =>
			!!select(blocksStore).getBlockStyles(DISPLAY_BLOCKS[type])?.length,
		[type]
	);

	return (
		<InspectorControls>
			<ToolsPanel
				className={[
					'matter-query-display-panel',
					`matter-${type}-query-panel`,
				].join(' ')}
				label={TITLES[type]}
				resetAll={() =>
					set(
						Object.fromEntries(
							['style', 'scheme', ...SETTINGS[type]].map(
								(key) => [key, undefined]
							)
						)
					)
				}
			>
				{hasStyles && (
					<ToolsPanelItem
						label={__('Style', 'matter')}
						hasValue={() => !!display.style}
						onDeselect={() => set({ style: undefined })}
						isShownByDefault
					>
						<StylePicker
							block={DISPLAY_BLOCKS[type]}
							value={display.style}
							onChange={(style) => set({ style })}
						/>
					</ToolsPanelItem>
				)}
				<ToolsPanelItem
					label={__('Colour scheme', 'matter')}
					hasValue={() => !!display.scheme}
					onDeselect={() => set({ scheme: undefined })}
					isShownByDefault
				>
					<SchemeControl
						value={display.scheme}
						onChange={(scheme) => set({ scheme })}
					/>
				</ToolsPanelItem>
				<Settings values={display} set={set} />
			</ToolsPanel>
		</InspectorControls>
	);
}
