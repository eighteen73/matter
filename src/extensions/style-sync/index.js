/**
 * Style sync: toolbar attribute on Groups and Columns, plus editor plugin.
 */

import { store as blockEditorStore } from '@wordpress/block-editor';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { useEffect, useRef } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { store as noticesStore } from '@wordpress/notices';
import { registerPlugin } from '@wordpress/plugins';

import { registerBlockExtension } from '../../utils/register-block-extension';

import {
	STYLE_SYNC_ATTRIBUTE,
	StyleSyncToolbar,
} from '../../components/style-sync';
import {
	getStyleSnapshot,
	hasStyleSnapshotChanged,
} from '../../components/style-sync/attributes';
import {
	applyStyleSyncToPeers,
	disableStyleSyncOnActiveSet,
	enableStyleSyncFromContainer,
	enableStyleSyncOnBlocks,
	isStyleSyncApplying,
} from '../../components/style-sync/apply';
import {
	NOTICE_ID_OFFER,
	NOTICE_ID_SYNCED,
} from '../../components/style-sync/constants';
import {
	isPeerInSyncSet,
	resolveSyncContext,
} from '../../components/style-sync/matching';

const additionalAttributes = {
	[STYLE_SYNC_ATTRIBUTE]: {
		type: 'boolean',
	},
};

/**
 * @param {Object} props
 * @param {string} props.clientId
 * @param {Object} props.attributes
 * @return {Element} The component.
 */
function BlockEdit({ clientId, attributes }) {
	return <StyleSyncToolbar clientId={clientId} attributes={attributes} />;
}

registerBlockExtension(['core/group', 'core/column'], {
	extensionName: 'matter/style-sync',
	attributes: additionalAttributes,
	classNameGenerator: () => null,
	Edit: BlockEdit,
	order: 'after',
});

/**
 * Watches selection and style attribute changes to offer / apply style sync.
 *
 * @return {null} Renderless plugin.
 */
function StyleSyncManager() {
	const registry = useRegistry();
	const { createSuccessNotice, removeNotice } = useDispatch(noticesStore);

	const { selectedClientId, selectedAttributes } = useSelect((select) => {
		const { getSelectedBlockClientId, getBlockAttributes } =
			select(blockEditorStore);
		const clientId = getSelectedBlockClientId();

		return {
			selectedClientId: clientId,
			selectedAttributes: clientId ? getBlockAttributes(clientId) : null,
		};
	}, []);

	const previousClientIdRef = useRef(null);
	const previousSnapshotRef = useRef(null);

	useEffect(() => {
		if (isStyleSyncApplying()) {
			return;
		}

		if (!selectedClientId) {
			previousClientIdRef.current = null;
			previousSnapshotRef.current = null;
			return;
		}

		const snapshot = getStyleSnapshot(selectedAttributes || {});
		const selectionChanged =
			previousClientIdRef.current !== selectedClientId;

		if (selectionChanged) {
			previousClientIdRef.current = selectedClientId;
			previousSnapshotRef.current = snapshot;
			removeNotice(NOTICE_ID_OFFER);
			return;
		}

		if (!hasStyleSnapshotChanged(previousSnapshotRef.current, snapshot)) {
			return;
		}

		previousSnapshotRef.current = snapshot;

		const context = resolveSyncContext(registry.select, selectedClientId);

		if (context?.mode === 'sync') {
			const unstampedPeers = (context.peers || []).filter(
				(block) => !isPeerInSyncSet(block)
			);

			if (unstampedPeers.length) {
				enableStyleSyncOnBlocks(registry, context.peers);
			}
		}

		if (context?.mode === 'offer') {
			const similarCount = Math.max(context.similar?.length || 0, 1);

			createSuccessNotice(
				sprintf(
					/* translators: %d: total number of similar blocks in the sync set */
					_n(
						'Sync %d similar block?',
						'Sync %d similar blocks?',
						similarCount,
						'matter'
					),
					similarCount
				),
				{
					type: 'snackbar',
					id: NOTICE_ID_OFFER,
					isDismissible: true,
					actions: [
						{
							label: __('Sync', 'matter'),
							onClick: () => {
								enableStyleSyncFromContainer(
									registry,
									context.container.clientId
								);
								removeNotice(NOTICE_ID_OFFER);
							},
						},
					],
				}
			);
			return;
		}

		if (context?.mode !== 'sync') {
			return;
		}

		const updatedCount = applyStyleSyncToPeers(
			registry,
			selectedClientId,
			context.container.clientId,
			context.peers
		);

		if (updatedCount < 1) {
			return;
		}

		const syncedCount = updatedCount + 1;

		removeNotice(NOTICE_ID_OFFER);
		createSuccessNotice(
			sprintf(
				/* translators: %d: total blocks in the sync set, including the source */
				_n(
					'Synced %d block',
					'Synced %d blocks',
					syncedCount,
					'matter'
				),
				syncedCount
			),
			{
				type: 'snackbar',
				id: NOTICE_ID_SYNCED,
				isDismissible: true,
				actions: [
					{
						label: __('Unsync', 'matter'),
						onClick: () => {
							disableStyleSyncOnActiveSet(
								registry,
								context.container.clientId,
								context.activeAncestor?.clientId
							);
							removeNotice(NOTICE_ID_SYNCED);
						},
					},
				],
			}
		);
	}, [
		selectedClientId,
		selectedAttributes,
		registry,
		createSuccessNotice,
		removeNotice,
	]);

	return null;
}

registerPlugin('matter-style-sync', {
	render: StyleSyncManager,
});
