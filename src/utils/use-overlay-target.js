/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useDispatch, useSelect } from '@wordpress/data';

import {
	OVERLAY_BLOCK_TYPES,
	OVERLAY_CONTEXT_KEYS,
} from './overlay-targets';
import useOverlayTargets from './use-overlay-targets';

/**
 * @param {Object}   params               Hook params.
 * @param {Object}   params.context       Block context.
 * @param {Object}   params.attributes    Block attributes.
 * @param {string}   params.clientId      Block client ID.
 * @return {Object} Overlay target state and actions.
 */
export default function useOverlayTarget({ context, attributes, clientId }) {
	const contextTarget = OVERLAY_CONTEXT_KEYS.find(
		(component) => context[component.id]
	);
	const contextId = contextTarget ? context[contextTarget.id] : '';
	const contextLabel = contextTarget?.label ?? __('component', 'matter');
	const isNested = !!contextId;
	const effectiveTargetId = contextId || attributes.targetId || '';

	const { options, isResolving, findTargetById } = useOverlayTargets();
	const externalTarget = findTargetById(attributes.targetId);
	const remoteClientId = externalTarget?.clientId;

	const { updateBlockAttributes, __unstableMarkNextChangeAsNotPersistent, selectBlock } =
		useDispatch(blockEditorStore);

	const { parentClientId, parentAttributes, remoteAttributes } = useSelect(
		(select) => {
			const blockEditor = select(blockEditorStore);
			const rootClientId = blockEditor.getBlockRootClientId(clientId);

			return {
				parentClientId: rootClientId,
				parentAttributes: rootClientId
					? blockEditor.getBlockAttributes(rootClientId)
					: {},
				remoteAttributes: remoteClientId
					? blockEditor.getBlockAttributes(remoteClientId)
					: {},
			};
		},
		[clientId, attributes.targetId, remoteClientId]
	);

	const previewClientId = isNested ? parentClientId : remoteClientId;
	const canPreview = !!previewClientId;
	const isOpen = isNested
		? !!parentAttributes?.editorIsOpen
		: !!remoteAttributes?.editorIsOpen;

	const componentLabel = useMemo(() => {
		if (isNested) {
			return contextLabel;
		}

		if (externalTarget?.blockName) {
			const typeLabel =
				OVERLAY_BLOCK_TYPES[externalTarget.blockName]?.label;

			return typeLabel?.toLowerCase() || __('component', 'matter');
		}

		return __('component', 'matter');
	}, [contextLabel, externalTarget?.blockName, isNested]);

	const selectedTargetMissing =
		!isNested &&
		!!attributes.targetId &&
		!isResolving &&
		!findTargetById(attributes.targetId);

	const toggleComponent = () => {
		if (!previewClientId) {
			return;
		}

		const nextIsOpen = !isOpen;

		if (!isNested) {
			selectBlock(nextIsOpen ? previewClientId : clientId);
		}

		__unstableMarkNextChangeAsNotPersistent();
		updateBlockAttributes(previewClientId, {
			editorIsOpen: nextIsOpen,
		});
	};

	const toolbarLabel = useMemo(
		() =>
			isOpen
				? sprintf(
						/* translators: %s: The component type, for example modal, drawer, or collapsible. */
						__('Close %s', 'matter'),
						componentLabel
					)
				: sprintf(
						/* translators: %s: The component type, for example modal, drawer, or collapsible. */
						__('Open %s', 'matter'),
						componentLabel
					),
		[componentLabel, isOpen]
	);

	return {
		isNested,
		effectiveTargetId,
		componentLabel,
		isOpen,
		canPreview,
		toggleComponent,
		toolbarLabel,
		options,
		isResolving,
		selectedTargetMissing,
		hasTargets: options.length > 0,
		showPreviewUnavailableNotice:
			!isNested &&
			!!attributes.targetId &&
			!selectedTargetMissing &&
			!canPreview,
	};
}
