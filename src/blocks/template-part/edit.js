/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	Disabled,
	Placeholder,
	SelectControl,
	__experimentalToolsPanel as ToolsPanel, // eslint-disable-line @wordpress/no-unsafe-wp-apis -- What core uses for block controls; experimental in name only.
	__experimentalToolsPanelItem as ToolsPanelItem, // eslint-disable-line @wordpress/no-unsafe-wp-apis
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';

/**
 * The theme's parts (TemplatePart::all()), passed in by Matter's editor
 * script.
 *
 * @return {Array<{slug: string, title: string}>} Parts.
 */
const templateParts = () => window.matterEditor?.templateParts ?? [];

/**
 * A theme template part: the PHP file rendered by the server, inert, with the
 * part chosen in the block's settings. Developers place these in block
 * templates; it isn't in the inserter.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes      Block attributes.
 * @param {string}   props.attributes.slug Part slug.
 * @param {Function} props.setAttributes   Attribute setter.
 * @return {Element} Template part preview.
 */
export default function Edit({ attributes: { slug }, setAttributes }) {
	const blockProps = useBlockProps();

	return (
		<div {...blockProps}>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'matter')}
					resetAll={() => setAttributes({ slug: undefined })}
				>
					<ToolsPanelItem
						label={__('Template part', 'matter')}
						hasValue={() => !!slug}
						onDeselect={() => setAttributes({ slug: undefined })}
						isShownByDefault
					>
						<SelectControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={__('Template part', 'matter')}
							value={slug ?? ''}
							options={[
								{
									label: __(
										'Choose a template part',
										'matter'
									),
									value: '',
								},
								...templateParts().map((part) => ({
									label: part.title,
									value: part.slug,
								})),
							]}
							onChange={(value) =>
								setAttributes({ slug: value || undefined })
							}
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>
			{slug ? (
				<Disabled>
					<ServerSideRender
						block="matter/template-part"
						attributes={{ slug }}
					/>
				</Disabled>
			) : (
				<Placeholder
					label={__('Theme template part', 'matter')}
					instructions={__(
						"Choose a file from the theme's template-parts folder in the block settings.",
						'matter'
					)}
				/>
			)}
		</div>
	);
}
