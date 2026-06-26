/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	BlockControls,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	ToolbarButton,
	ToolbarGroup,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';

import OverlayTargetControl from '../../components/overlay-target-control';
import useOverlayTarget from '../../utils/use-overlay-target';

const TEMPLATE = [
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

	const blockProps = useBlockProps();

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		template: TEMPLATE,
		templateLock: 'insert',
		__experimentalCaptureToolbars: true,
	});

	return (
		<>
			{!isNested && (
				<InspectorControls>
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
				</InspectorControls>
			)}

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

			<div {...innerBlocksProps} />
		</>
	);
}
