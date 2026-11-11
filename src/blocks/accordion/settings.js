/**
 * WordPress dependencies
 */
import {
	SelectControl,
	ToggleControl,
	__experimentalToolsPanelItem as ToolsPanelItem, // eslint-disable-line @wordpress/no-unsafe-wp-apis -- What core uses for block controls; experimental in name only.
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const DEFAULT_LEVEL = 3;

/**
 * The accordion's settings, as ToolsPanel items: used by the accordion block
 * and by an accordion of posts (a query shown as an accordion).
 *
 * @param {Object}   props
 * @param {Object}   props.values Current settings (the block's attributes).
 * @param {Function} props.set    Receives changed settings.
 * @return {Element} Panel items.
 */
export function AccordionSettings({ values, set }) {
	const level = values.headingLevel ?? DEFAULT_LEVEL;

	return (
		<>
			<ToolsPanelItem
				label={__('Item heading level', 'matter')}
				hasValue={() => level !== DEFAULT_LEVEL}
				onDeselect={() => set({ headingLevel: undefined })}
				isShownByDefault
			>
				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={__('Item heading level', 'matter')}
					value={String(level)}
					options={[2, 3, 4, 5, 6].map((option) => ({
						value: String(option),
						label: `H${option}`,
					}))}
					onChange={(value) => set({ headingLevel: Number(value) })}
				/>
			</ToolsPanelItem>
			<ToolsPanelItem
				label={__('Only one item open at a time', 'matter')}
				hasValue={() => !!values.autoclose}
				onDeselect={() => set({ autoclose: undefined })}
				isShownByDefault
			>
				<ToggleControl
					__nextHasNoMarginBottom
					label={__('Only one item open at a time', 'matter')}
					checked={!!values.autoclose}
					onChange={(autoclose) => set({ autoclose })}
				/>
			</ToolsPanelItem>
			<ToolsPanelItem
				label={__('Open the first item', 'matter')}
				hasValue={() => !!values.openFirst}
				onDeselect={() => set({ openFirst: undefined })}
				isShownByDefault
			>
				<ToggleControl
					__nextHasNoMarginBottom
					label={__('Open the first item', 'matter')}
					checked={!!values.openFirst}
					onChange={(openFirst) => set({ openFirst })}
				/>
			</ToolsPanelItem>
			<ToolsPanelItem
				label={__('FAQ schema', 'matter')}
				hasValue={() => !!values.faqSchema}
				onDeselect={() => set({ faqSchema: undefined })}
				isShownByDefault
			>
				<ToggleControl
					__nextHasNoMarginBottom
					label={__('FAQ schema', 'matter')}
					help={__(
						'Describe these items to search engines as questions and answers.',
						'matter'
					)}
					checked={!!values.faqSchema}
					onChange={(faqSchema) => set({ faqSchema })}
				/>
			</ToolsPanelItem>
		</>
	);
}

// What resetting the panel clears.
export const ACCORDION_SETTINGS = [
	'headingLevel',
	'autoclose',
	'openFirst',
	'faqSchema',
];
