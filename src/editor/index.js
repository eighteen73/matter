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
import { createHigherOrderComponent } from '@wordpress/compose';
import { addFilter } from '@wordpress/hooks';

/**
 * Internal dependencies
 */
import SchemeControl from './components/scheme-control';
import SectionEdit from './components/section-edit';
import './archives/bindings';
import './archives/shows-on';
import './extensions/block-link';
import './extensions/button-icon';
import './extensions/focal-point';
import './extensions/parent-toolbar';
import './overlays/link-suggestions';
import './overlays/sidebar';
import './overlays/toolbar';
import '../overlay/editor/dialog-preview';
import '../components/icon-picker/editor.scss';
import './index.scss';

const { sections = [] } = window.matterEditor ?? {};

const DIALOGS = ['matter/modal', 'matter/drawer'];

// In the editor a closed modal or drawer is only its trigger area, as on the
// front end, where the trigger and <dialog> share a `-host` wrapper. The
// block takes the dialog's class while open (see overlay-edit.js).
addFilter(
	'blocks.getBlockDefaultClassName',
	'matter/overlays/host-class',
	(className, name) =>
		DIALOGS.includes(name) ? `${className}-host` : className
);

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
						<div className="matter-scheme-panel">
							<SchemeControl
								value={attributes.scheme}
								onChange={(scheme) => setAttributes({ scheme })}
							/>
						</div>
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

			// Modals and drawers add theirs to the open dialog only.
			if (
				!scheme ||
				!hasSchemeSupport(props.name) ||
				DIALOGS.includes(props.name)
			) {
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
