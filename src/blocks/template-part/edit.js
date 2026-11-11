/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	Placeholder,
	SelectControl,
	Spinner,
	__experimentalToolsPanel as ToolsPanel, // eslint-disable-line @wordpress/no-unsafe-wp-apis -- What core uses for block controls; experimental in name only.
	__experimentalToolsPanelItem as ToolsPanelItem, // eslint-disable-line @wordpress/no-unsafe-wp-apis
} from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

// Previews by slug, for the editor session (a template shows the same
// header as the next).
const previews = new Map();

/**
 * A part's preview: its HTML plus the stylesheets its render enqueued (menu
 * and panel CSS, with their breakpoint rules), from Matter's endpoint.
 *
 * @param {string} slug Part slug.
 * @return {{markup?: string, error?: boolean}} Preview state.
 */
function usePreview(slug) {
	const [state, setState] = useState(() =>
		previews.has(slug) ? { markup: previews.get(slug) } : {}
	);

	useEffect(() => {
		if (!slug) {
			return;
		}

		if (previews.has(slug)) {
			setState({ markup: previews.get(slug) });
			return;
		}

		let current = true;
		setState({});

		apiFetch({ path: addQueryArgs('/matter/v1/template-part', { slug }) })
			.then(({ html, styles }) => {
				previews.set(slug, styles + html);

				if (current) {
					setState({ markup: styles + html });
				}
			})
			.catch(() => current && setState({ error: true }));

		return () => {
			current = false;
		};
	}, [slug]);

	return state;
}

/**
 * The theme's parts (TemplatePart::all()), passed in by Matter's editor
 * script.
 *
 * @return {Array<{slug: string, title: string}>} Parts.
 */
const templateParts = () => window.matterEditor?.templateParts ?? [];

/**
 * A theme template part: the PHP file rendered by the server with its styles,
 * inert, and the part chosen in the block's settings. Developers place these in block
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
	const preview = usePreview(slug);

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
			{slug && preview.markup !== undefined && (
				<div
					inert=""
					dangerouslySetInnerHTML={{ __html: preview.markup }}
				/>
			)}
			{slug && preview.markup === undefined && !preview.error && (
				<Spinner />
			)}
			{(!slug || preview.error) && (
				<Placeholder
					label={__('Theme template part', 'matter')}
					instructions={
						preview.error
							? __(
									"This template part couldn't be shown.",
									'matter'
								)
							: __(
									"Choose a file from the theme's template-parts folder in the block settings.",
									'matter'
								)
					}
				/>
			)}
		</div>
	);
}
