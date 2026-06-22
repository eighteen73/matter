import {
	BlockControls,
	InnerBlocks,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	ToolbarButton,
	ToolbarGroup,
	RangeControl,
	SelectControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useMemo, useState, useEffect, createPortal } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import ColorControl from '../../components/color-control';
import { storeColorValue } from '../../utils/colors';
import { getBlockStyles } from '../../utils/block-styles';
import { getEditorPortalRoot } from '../../utils/get-editor-portal-root';

const TEMPLATE = [['matter/close']];

/**
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Update block attributes.
 * @param {Object}   props.context       Block context.
 * @param {string}   props.clientId      Block client ID.
 * @return {Element} Element to render.
 */
export default function Edit({ context, clientId, attributes, setAttributes }) {
	const {
		backdropColor,
		backdropOpacity,
		backdropBlur,
		position,
		width,
		height,
	} = attributes;
	const isOpen = !!context['matter/modal-is-open'];
	const [portalRoot, setPortalRoot] = useState(getEditorPortalRoot);
	const parentClientId = useSelect(
		(select) => select(blockEditorStore).getBlockRootClientId(clientId),
		[clientId]
	);
	const { updateBlockAttributes, __unstableMarkNextChangeAsNotPersistent } =
		useDispatch(blockEditorStore);

	useEffect(() => {
		setPortalRoot(getEditorPortalRoot());
	}, []);

	const cssVarStyles = useMemo(
		() => getBlockStyles(attributes, 'modal-content'),
		[attributes]
	);
	const blockProps = useBlockProps({
		className: 'wp-block-matter-modal__content',
		open: isOpen,
	});
	const innerBlocksProps = useInnerBlocksProps(
		{
			...blockProps,
			style: {
				...(blockProps.style || {}),
				...cssVarStyles,
			},
		},
		{
			renderAppender: InnerBlocks.ButtonBlockAppender,
			template: TEMPLATE,
			templateLock: false,
		}
	);

	const closeEditorPreview = () => {
		if (!parentClientId) {
			return;
		}

		__unstableMarkNextChangeAsNotPersistent();
		updateBlockAttributes(parentClientId, {
			editorIsOpen: false,
		});
	};

	return (
		<>
			<InspectorControls group="color">
				<ColorControl
					label={__('Backdrop', 'matter')}
					value={backdropColor}
					attributeName="backdropColor"
					onChange={(value, slug) =>
						setAttributes({
							backdropColor: storeColorValue(slug, value),
						})
					}
					panelId={clientId}
				/>

				{backdropColor && (
					<>
						<ToolsPanelItem
							hasValue={() => !!backdropOpacity}
							label={__('Overlay opacity', 'matter')}
							onDeselect={() =>
								setAttributes({ backdropOpacity: 50 })
							}
							resetAllFilter={() => ({
								backdropOpacity: '',
							})}
							isShownByDefault
							panelId={clientId}
						>
							<RangeControl
								label={__('Backdrop opacity')}
								value={backdropOpacity}
								onChange={(value) =>
									setAttributes({ backdropOpacity: value })
								}
								min={0}
								max={100}
								step={10}
								required
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							hasValue={() => !!backdropBlur}
							label={__('Backdrop blur', 'matter')}
							onDeselect={() =>
								setAttributes({ backdropBlur: 0 })
							}
							resetAllFilter={() => ({
								backdropBlur: 0,
							})}
							isShownByDefault
							panelId={clientId}
						>
							<RangeControl
								label={__('Backdrop blur')}
								value={backdropBlur}
								onChange={(value) =>
									setAttributes({ backdropBlur: value })
								}
								min={0}
								max={10}
								step={1}
								required
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					</>
				)}
			</InspectorControls>

			<InspectorControls group="layout">
				<ToolsPanelItem
					hasValue={() => !!width}
					label={__('Width', 'matter')}
					onDeselect={() => setAttributes({ width: '' })}
					resetAllFilter={() => ({ width: '' })}
					isShownByDefault
					panelId={clientId}
				>
					<UnitControl
						label={__('Width', 'matter')}
						value={width}
						onChange={(value) => setAttributes({ width: value })}
						isResetValueOnUnitChange
						min={0}
						max={1000}
						step={10}
					/>
				</ToolsPanelItem>
			</InspectorControls>

			{isOpen && (
				<BlockControls>
					<ToolbarGroup>
						<ToolbarButton onClick={closeEditorPreview}>
							{__('Close modal', 'matter')}
						</ToolbarButton>
					</ToolbarGroup>
				</BlockControls>
			)}
			{portalRoot &&
				createPortal(
					<div className="wp-block-matter-modal-content__editor-preview">
						{isOpen && (
							<div
								className="wp-block-matter-modal-content__editor-backdrop"
								style={cssVarStyles}
								onClick={closeEditorPreview}
								role="presentation"
							/>
						)}
						<dialog {...innerBlocksProps} />
					</div>,
					portalRoot
				)}
		</>
	);
}
