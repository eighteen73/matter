import { __ } from '@wordpress/i18n';
import {
	BlockControls,
	InspectorControls,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	TextControl,
	ToggleControl,
	ToolbarButton,
	ToolbarGroup,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';

import OverlayTargetControl from '../../components/overlay-target-control';
import useOverlayTarget from '../../utils/use-overlay-target';

/**
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Update block attributes.
 * @param {Object}   props.context       Block context.
 * @param {string}   props.clientId      Block client ID.
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes, context, clientId }) {
	const { label, showLabel } = attributes;
	const buttonLabel = label || __('Open menu', 'matter');

	const {
		effectiveTargetId,
		canPreview,
		isOpen,
		toggleComponent,
		toolbarLabel,
		isNested,
		options,
		isResolving,
		selectedTargetMissing,
		hasTargets,
		showPreviewUnavailableNotice,
	} = useOverlayTarget({ context, attributes, clientId });

	const blockProps = useBlockProps({
		'aria-label': buttonLabel,
		'aria-expanded': isOpen,
	});

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'matter')}
					resetAll={() =>
						setAttributes({ label: 'Open menu', showLabel: false })
					}
				>
					{!isNested && (
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
					)}

					<ToolsPanelItem
						label={__('Label', 'matter')}
						hasValue={() => !!label && label !== 'Open menu'}
						onDeselect={() => setAttributes({ label: 'Open menu' })}
						isShownByDefault
					>
						<TextControl
							label={__('Label', 'matter')}
							value={label}
							onChange={(value) =>
								setAttributes({ label: value })
							}
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={__('Show label', 'matter')}
						hasValue={() => !!showLabel}
						onDeselect={() => setAttributes({ showLabel: false })}
						isShownByDefault
					>
						<ToggleControl
							label={__('Show label', 'matter')}
							checked={showLabel}
							onChange={(value) =>
								setAttributes({ showLabel: value })
							}
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			{effectiveTargetId && canPreview && (
				<BlockControls>
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

			<button {...blockProps} type="button">
				<span
					className="wp-block-matter-trigger-hamburger__icon"
					aria-hidden="true"
				/>
				{showLabel && (
					<span className="wp-block-matter-trigger-hamburger__label">
						{buttonLabel}
					</span>
				)}
			</button>
		</>
	);
}
