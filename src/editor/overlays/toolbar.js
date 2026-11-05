/**
 * "Edit modal" (or drawer) on the toolbar of anything that opens one: a
 * button or link block pointing to its #ID, or a block in its trigger area.
 * Collapsibles open in place when their trigger is selected, so need none.
 */

/**
 * WordPress dependencies
 */
import {
	BlockControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useDispatch, useSelect } from '@wordpress/data';
import { addFilter } from '@wordpress/hooks';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { getOverlayIds, TYPE_LABELS } from './utils';

const DIALOGS = ['matter/modal', 'matter/drawer'];

/**
 * The modal or drawer a block opens.
 *
 * @param {Function} select   Registry select.
 * @param {string}   clientId Block client ID.
 * @return {string|null} Overlay client ID.
 */
const openedBy = (select, clientId) => {
	const { getBlockAttributes, getBlockName, getBlockParents } =
		select(blockEditorStore);
	const url = getBlockAttributes(clientId)?.url;

	// A link to its #ID.
	if (typeof url === 'string' && url.startsWith('#') && url.length > 1) {
		const match = getOverlayIds(select).find(
			(id) =>
				DIALOGS.includes(getBlockName(id)) &&
				getBlockAttributes(id)?.overlayId === url.slice(1)
		);

		if (match) {
			return match;
		}
	}

	// Inside its trigger area (nearest overlay only).
	const parents = getBlockParents(clientId, true);

	for (let index = 0; index < parents.length - 1; index++) {
		const name = getBlockName(parents[index + 1]);

		if (TYPE_LABELS[name]) {
			return DIALOGS.includes(name) &&
				getBlockAttributes(parents[index])?.name === 'trigger'
				? parents[index + 1]
				: null;
		}
	}

	return null;
};

function EditOverlayButton({ clientId }) {
	const { overlayId, name } = useSelect(
		(select) => {
			const id = openedBy(select, clientId);

			return {
				overlayId: id,
				name: id ? select(blockEditorStore).getBlockName(id) : null,
			};
		},
		[clientId]
	);
	const { selectBlock } = useDispatch(blockEditorStore);

	if (!overlayId) {
		return null;
	}

	return (
		<BlockControls group="other">
			<ToolbarGroup className="matter-parent-toolbar">
				<ToolbarButton onClick={() => selectBlock(overlayId)}>
					{sprintf(
						/* translators: %s: overlay type, e.g. modal */
						__('Edit %s', 'matter'),
						TYPE_LABELS[name].toLowerCase()
					)}
				</ToolbarButton>
			</ToolbarGroup>
		</BlockControls>
	);
}

addFilter(
	'editor.BlockEdit',
	'matter/overlays/toolbar',
	createHigherOrderComponent(
		(BlockEdit) => (props) => (
			<>
				<BlockEdit {...props} />
				{props.isSelected && !TYPE_LABELS[props.name] && (
					<EditOverlayButton clientId={props.clientId} />
				)}
			</>
		),
		'withEditOverlayButton'
	)
);
