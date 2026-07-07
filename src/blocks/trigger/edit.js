/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	BlockControls,
	InspectorControls,
	store as blockEditorStore,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { createBlocksFromInnerBlocksTemplate } from '@wordpress/blocks';
import {
	TextControl,
	ToolbarButton,
	ToolbarGroup,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';

import OverlayTargetControl from '../../components/overlay-target-control';
import useOverlayTarget from '../../utils/use-overlay-target';

const BUTTON_TEMPLATE = [
	[
		'core/buttons',
		{},
		[
			[
				'core/button',
				{
					text: __('Open', 'matter'),
					tagName: 'button',
				},
			],
		],
	],
];

const CONTENT_TEMPLATE = [['core/group', {}, []]];

const CONTENT_TRIGGER_TYPE = 'content';

/**
 * @param {Array} innerBlocks Trigger inner blocks.
 * @return {string|undefined} First inner block name.
 */
function getFirstInnerBlockName(innerBlocks) {
	return innerBlocks?.[0]?.name;
}

/**
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Update block attributes.
 * @param {Object}   props.context       Block context.
 * @param {string}   props.clientId      Block client ID.
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes, context, clientId }) {
	const {
		effectiveTargetId,
		canPreview,
		toggleComponent,
		toolbarLabel,
		isNested,
		options,
		isResolving,
		selectedTargetMissing,
		hasTargets,
		showPreviewUnavailableNotice,
	} = useOverlayTarget({ context, attributes, clientId });

	const { replaceInnerBlocks } = useDispatch(blockEditorStore);
	const innerBlocks = useSelect(
		(select) =>
			select(blockEditorStore).getBlock(clientId)?.innerBlocks ?? [],
		[clientId]
	);

	const isContentTrigger = attributes.triggerType === CONTENT_TRIGGER_TYPE;
	const template = isContentTrigger ? CONTENT_TEMPLATE : BUTTON_TEMPLATE;
	const templateLock = isContentTrigger ? false : 'insert';
	const allowedBlocks = isContentTrigger ? ['core/group'] : ['core/buttons'];

	useEffect(() => {
		const firstInnerBlockName = getFirstInnerBlockName(innerBlocks);
		const expectedInnerBlockName = isContentTrigger
			? 'core/group'
			: 'core/buttons';

		if (
			!firstInnerBlockName ||
			firstInnerBlockName === expectedInnerBlockName
		) {
			return;
		}

		replaceInnerBlocks(
			clientId,
			createBlocksFromInnerBlocksTemplate(template),
			false
		);
	}, [clientId, innerBlocks, isContentTrigger, replaceInnerBlocks, template]);

	const blockProps = useBlockProps();

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		allowedBlocks,
		template,
		templateLock,
		renderAppender: isContentTrigger ? false : undefined,
		__experimentalCaptureToolbars: true,
	});

	return (
		<>
			{effectiveTargetId && canPreview && (
				<BlockControls __experimentalShareWithChildBlocks>
					<ToolbarGroup>
						<ToolbarButton
							label={toolbarLabel}
							aria-controls={effectiveTargetId}
							onClick={toggleComponent}
						>
							{toolbarLabel}
						</ToolbarButton>
					</ToolbarGroup>
				</BlockControls>
			)}

			<InspectorControls>
				{!isNested && (
					<ToolsPanel
						label={__('Target', 'matter')}
						resetAll={() => setAttributes({ targetId: '' })}
					>
						<ToolsPanelItem
							label={__('Target', 'matter')}
							hasValue={() => !!attributes.targetId}
							onDeselect={() => setAttributes({ targetId: '' })}
							resetAllFilter={() => ({ targetId: '' })}
							isShownByDefault
							panelId={clientId}
						>
							<OverlayTargetControl
								value={attributes.targetId}
								onChange={(targetId) =>
									setAttributes({ targetId })
								}
								options={options}
								isResolving={isResolving}
								hasTargets={hasTargets}
								selectedMissing={selectedTargetMissing}
								showPreviewUnavailableNotice={
									showPreviewUnavailableNotice
								}
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				)}

				{isContentTrigger && (
					<ToolsPanel
						label={__('Accessibility', 'matter')}
						resetAll={() => setAttributes({ accessibleLabel: '' })}
					>
						<ToolsPanelItem
							label={__('Accessible label', 'matter')}
							hasValue={() => !!attributes.accessibleLabel}
							onDeselect={() =>
								setAttributes({ accessibleLabel: '' })
							}
							resetAllFilter={() => ({
								accessibleLabel: '',
							})}
							isShownByDefault
							panelId={`${clientId}-accessible-label`}
						>
							<TextControl
								label={__('Accessible label', 'matter')}
								help={__(
									'Used when the wrapped content does not provide a clear accessible name, such as a decorative image.',
									'matter'
								)}
								value={attributes.accessibleLabel}
								onChange={(accessibleLabel) =>
									setAttributes({ accessibleLabel })
								}
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				)}
			</InspectorControls>

			<div {...innerBlocksProps} />
		</>
	);
}
