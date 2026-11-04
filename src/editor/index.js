/**
 * Matter editor integration.
 *
 * - Registers section blocks (blocks declaring `supports.matter.slots`) with a
 *   shared editor, so sections only need block.json and optional render.php.
 * - Adds the colour scheme control to blocks declaring `supports.matter.scheme`.
 *   The `scheme` attribute and front-end classes come from the server-side
 *   block support (Supports\Scheme).
 */

/**
 * WordPress dependencies
 */
import { InspectorControls, InnerBlocks } from '@wordpress/block-editor';
import { getBlockType, registerBlockType } from '@wordpress/blocks';
import { PanelBody } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import SchemeControl from './components/scheme-control';
import SectionEdit from './components/section-edit';
import './extensions/button-icon';
import './extensions/focal-point';
import './index.scss';

const { sections = [] } = window.matterEditor ?? {};

const hasSchemeSupport = (name) =>
	!!getBlockType(name)?.supports?.matter?.scheme;

sections.forEach((name) => {
	if (getBlockType(name)?.edit) {
		return;
	}

	// Title, icon, attributes and supports come from block.json via the
	// server-side definitions.
	registerBlockType(name, {
		edit: SectionEdit,
		save: () => <InnerBlocks.Content />,
	});
});

addFilter(
	'editor.BlockEdit',
	'matter/scheme/control',
	createHigherOrderComponent(
		(BlockEdit) => (props) => {
			if (!hasSchemeSupport(props.name)) {
				return <BlockEdit {...props} />;
			}

			const { attributes, setAttributes } = props;

			return (
				<>
					<BlockEdit {...props} />
					<InspectorControls group="styles">
						<PanelBody title={__('Colour', 'matter')}>
							<SchemeControl
								value={attributes.scheme}
								onChange={(scheme) => setAttributes({ scheme })}
							/>
						</PanelBody>
					</InspectorControls>
				</>
			);
		},
		'withSchemeControl'
	)
);

addFilter(
	'editor.BlockListBlock',
	'matter/scheme/classes',
	createHigherOrderComponent(
		(BlockListBlock) => (props) => {
			const scheme = props.attributes?.scheme;

			if (!scheme || !hasSchemeSupport(props.name)) {
				return <BlockListBlock {...props} />;
			}

			return (
				<BlockListBlock
					{...props}
					className={[
						props.className,
						'has-scheme',
						`has-scheme-${scheme}`,
					]
						.filter(Boolean)
						.join(' ')}
				/>
			);
		},
		'withSchemeClasses'
	)
);
