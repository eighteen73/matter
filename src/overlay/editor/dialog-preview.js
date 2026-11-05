/**
 * The editor dialog for a modal's or drawer's content, matching the front
 * end's markup: the block is the `-host` (its trigger area stays in the page)
 * and the content sits in a dialog element with the close button and group
 * navigation. It's open while the overlay or anything in its content is
 * selected (see use-dialog-preview.js for how it shows).
 *
 * Added around the content slot with `editor.BlockListBlock`, so the slot
 * itself stays an ordinary block.
 */

/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useDispatch, useSelect } from '@wordpress/data';
import { useCallback, useRef } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import GroupNav from './group-nav';
import useDialogPreview from './use-dialog-preview';

const DIALOGS = ['matter/modal', 'matter/drawer'];

function Dialog({ BlockListBlock, blockProps, overlayId, overlayName }) {
	const ref = useRef();
	const { attributes, isOpen } = useSelect(
		(select) => {
			const {
				getBlockAttributes,
				isBlockSelected,
				hasSelectedInnerBlock,
			} = select(blockEditorStore);

			return {
				attributes: getBlockAttributes(overlayId) ?? {},
				isOpen:
					isBlockSelected(overlayId) ||
					isBlockSelected(blockProps.clientId) ||
					hasSelectedInnerBlock(blockProps.clientId, true),
			};
		},
		[overlayId, blockProps.clientId]
	);
	const { clearSelectedBlock } = useDispatch(blockEditorStore);
	const close = useCallback(() => clearSelectedBlock(), [clearSelectedBlock]);
	const isShown = useDialogPreview(ref, isOpen, close);

	const type = overlayName.split('/')[1];
	const blockClass = `wp-block-matter-${type}`;
	const { scheme, dismissible = true, group, position } = attributes;

	return (
		<div
			ref={ref}
			popover="manual"
			className={[
				blockClass,
				'matter-overlay-editor__dialog',
				isShown && 'is-shown',
				type === 'drawer' &&
					`is-position-${position === 'left' ? 'left' : 'right'}`,
				scheme && `has-scheme has-scheme-${scheme}`,
			]
				.filter(Boolean)
				.join(' ')}
		>
			{isShown && dismissible && (
				<button
					type="button"
					className={`${blockClass}__close`}
					onClick={close}
				>
					<span className="screen-reader-text">
						{__('Close', 'matter')}
					</span>
				</button>
			)}
			<BlockListBlock {...blockProps} />
			{isShown && type === 'modal' && group && (
				<GroupNav clientId={overlayId} group={group} />
			)}
		</div>
	);
}

function ContentSlot({ BlockListBlock, ...props }) {
	const { overlayId, overlayName } = useSelect(
		(select) => {
			const { getBlockRootClientId, getBlockName } =
				select(blockEditorStore);
			const rootId = getBlockRootClientId(props.clientId);

			return { overlayId: rootId, overlayName: getBlockName(rootId) };
		},
		[props.clientId]
	);

	if (!DIALOGS.includes(overlayName)) {
		return <BlockListBlock {...props} />;
	}

	return (
		<Dialog
			BlockListBlock={BlockListBlock}
			blockProps={props}
			overlayId={overlayId}
			overlayName={overlayName}
		/>
	);
}

addFilter(
	'editor.BlockListBlock',
	'matter/overlays/dialog',
	createHigherOrderComponent(
		(BlockListBlock) => (props) =>
			props.name === 'matter/slot' &&
			props.attributes?.name === 'content' ? (
				<ContentSlot BlockListBlock={BlockListBlock} {...props} />
			) : (
				<BlockListBlock {...props} />
			),
		'withOverlayDialog'
	)
);
