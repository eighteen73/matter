/**
 * The filters in the editor: a list of filter blocks, inline as on a wide
 * screen. In a bar (the variant's `layout`), a row of buttons, each filter's
 * options opening below its button while it's selected; the front end's
 * classes, so the bar's styles are the front end's (filters/bar.scss, here
 * unscoped: the editor's width is no guide to the site's). The drawer is the
 * front end's.
 */

/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ToolsPanel, ToolsPanelItem } from '../../components/compat';
import { filtersLayout } from './layout';

export default function Edit({
	attributes: { label, className },
	setAttributes,
}) {
	const layout = filtersLayout(className);
	const blockProps = useBlockProps({
		className: [
			`is-layout-${layout}`,
			layout === 'bar' ? 'is-expanded' : '',
		]
			.filter(Boolean)
			.join(' '),
	});
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-matter-filters__form' },
		{
			allowedBlocks: ['matter/filter'],
			template: [['matter/filter']],
			orientation: layout === 'bar' ? 'horizontal' : 'vertical',
			renderAppender: undefined,
		}
	);

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'matter')}
					resetAll={() => setAttributes({ label: '' })}
				>
					<ToolsPanelItem
						label={__('Name', 'matter')}
						hasValue={() => !!label}
						onDeselect={() => setAttributes({ label: '' })}
						isShownByDefault
					>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={__('Name', 'matter')}
							help={__(
								'Names the drawer on small screens, and the Filters button.',
								'matter'
							)}
							value={label}
							placeholder={__('Filters', 'matter')}
							onChange={(value) =>
								setAttributes({ label: value })
							}
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>
			<div {...blockProps}>
				<div {...innerBlocksProps} />
			</div>
		</>
	);
}
