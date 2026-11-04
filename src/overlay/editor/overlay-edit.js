/**
 * Shared editor for overlay blocks (modal, drawer, collapsible).
 *
 * Content is edited inline in a labelled box rather than in a live dialog,
 * which keeps editing simple. The overlay opens from any link or button that
 * points at `#id`, so the ID is shown (and copyable) in the inspector.
 */

/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	store as blockEditorStore,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	Button,
	Flex,
	FlexBlock,
	PanelBody,
	RangeControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { useCopyToClipboard } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import UrlTriggersControl from './url-triggers-control';

const TEMPLATE = [
	['core/heading', { level: 2, placeholder: __('Heading', 'matter') }],
	['core/paragraph', { placeholder: __('Content…', 'matter') }],
];

const LABELS = {
	modal: __('Modal', 'matter'),
	drawer: __('Drawer', 'matter'),
	collapsible: __('Collapsible', 'matter'),
};

const randomSuffix = () => Math.random().toString(36).slice(2, 7);

/**
 * Give the block a unique overlay ID: one on insert, and a new one when the
 * block is duplicated (duplicates copy attributes).
 *
 * @param {string}   clientId      Block client ID.
 * @param {string}   overlayId     Current ID.
 * @param {string}   type          Overlay type.
 * @param {Function} setAttributes Attribute setter.
 */
const useUniqueOverlayId = (clientId, overlayId, type, setAttributes) => {
	const isDuplicate = useSelect(
		(select) => {
			if (!overlayId) {
				return false;
			}

			const { getClientIdsWithDescendants, getBlockAttributes } =
				select(blockEditorStore);

			return getClientIdsWithDescendants().some(
				(id) =>
					id !== clientId &&
					getBlockAttributes(id)?.overlayId === overlayId &&
					// The first block keeps the ID; later copies change.
					getClientIdsWithDescendants().indexOf(id) <
						getClientIdsWithDescendants().indexOf(clientId)
			);
		},
		[clientId, overlayId]
	);

	useEffect(() => {
		if (!overlayId || isDuplicate) {
			setAttributes({ overlayId: `${type}-${randomSuffix()}` });
		}
	}, [overlayId, isDuplicate, type, setAttributes]);
};

export default function OverlayEdit({
	type,
	attributes,
	setAttributes,
	clientId,
	children,
}) {
	const {
		overlayId,
		label,
		openOnLoad,
		openDelay,
		openOnScroll,
		scrollThreshold,
		urlTriggers,
		dismissDays,
	} = attributes;
	const isDialog = type !== 'collapsible';
	const [copied, setCopied] = useState(false);
	const copyRef = useCopyToClipboard(`#${overlayId}`, () => {
		setCopied(true);
		window.setTimeout(() => setCopied(false), 2000);
	});

	useUniqueOverlayId(clientId, overlayId, type, setAttributes);

	const blockProps = useBlockProps({ className: 'matter-overlay-editor' });
	const innerBlocksProps = useInnerBlocksProps(
		{ className: `wp-block-matter-${type}__content` },
		{ template: TEMPLATE }
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'matter')}>
					<Flex align="flex-end">
						<FlexBlock>
							<TextControl
								__nextHasNoMarginBottom
								__next40pxDefaultSize
								label={__('ID', 'matter')}
								value={overlayId}
								onChange={(value) =>
									setAttributes({
										overlayId: value
											.toLowerCase()
											.replace(/[^a-z0-9-_]/g, '-'),
									})
								}
							/>
						</FlexBlock>
						<Button
							variant="secondary"
							ref={copyRef}
							__next40pxDefaultSize
						>
							{copied
								? __('Copied', 'matter')
								: __('Copy link', 'matter')}
						</Button>
					</Flex>
					<p className="components-base-control__help">
						{sprintf(
							/* translators: %s: overlay link, e.g. #modal-abc */
							__(
								'Link any button or link to %s to open this.',
								'matter'
							),
							`#${overlayId}`
						)}
					</p>
					{isDialog && (
						<TextControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={__('Name', 'matter')}
							help={__(
								'Announced by screen readers when it opens.',
								'matter'
							)}
							value={label}
							onChange={(value) =>
								setAttributes({ label: value })
							}
						/>
					)}
					{children}
				</PanelBody>
				{isDialog && (
					<PanelBody
						title={__('Open automatically', 'matter')}
						initialOpen={false}
					>
						<ToggleControl
							__nextHasNoMarginBottom
							label={__('When the page loads', 'matter')}
							checked={openOnLoad}
							onChange={(value) =>
								setAttributes({ openOnLoad: value })
							}
						/>
						<RangeControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={__('Delay (seconds)', 'matter')}
							help={__(
								'Applies to page load and URL parameters.',
								'matter'
							)}
							value={openDelay}
							onChange={(value) =>
								setAttributes({ openDelay: value ?? 0 })
							}
							min={0}
							max={60}
						/>
						<ToggleControl
							__nextHasNoMarginBottom
							label={__('After scrolling', 'matter')}
							checked={openOnScroll}
							onChange={(value) =>
								setAttributes({ openOnScroll: value })
							}
						/>
						{openOnScroll && (
							<RangeControl
								__nextHasNoMarginBottom
								__next40pxDefaultSize
								label={__('Scrolled (% of page)', 'matter')}
								value={scrollThreshold}
								onChange={(value) =>
									setAttributes({
										scrollThreshold: value ?? 50,
									})
								}
								min={0}
								max={100}
							/>
						)}
						<UrlTriggersControl
							value={urlTriggers}
							onChange={(value) =>
								setAttributes({ urlTriggers: value })
							}
						/>
						<RangeControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={__('Stay closed for (days)', 'matter')}
							help={__(
								'After someone closes an automatically opened overlay. 0 shows it again on every visit.',
								'matter'
							)}
							value={dismissDays}
							onChange={(value) =>
								setAttributes({ dismissDays: value ?? 0 })
							}
							min={0}
							max={365}
						/>
					</PanelBody>
				)}
			</InspectorControls>
			<div {...blockProps}>
				<div className="matter-overlay-editor__label">
					{LABELS[type]} · #{overlayId}
				</div>
				<div {...innerBlocksProps} />
			</div>
		</>
	);
}
