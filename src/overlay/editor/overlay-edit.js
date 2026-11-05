/**
 * Shared editor for overlay blocks (modal, drawer, collapsible).
 *
 * The canvas shows what the front end shows. A closed modal or drawer shows
 * only its trigger area (if it has one); it opens, as it looks on the front
 * end, while it or anything in its content is selected, and closes when the
 * selection moves on. A collapsible opens in place the same way. Overlays are
 * also listed, with their settings, in the Overlays sidebar.
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
import { createBlock } from '@wordpress/blocks';
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
import { useDispatch, useSelect } from '@wordpress/data';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import GroupNav from './group-nav';
import UrlTriggersControl from './url-triggers-control';
import useDialogPreview from './use-dialog-preview';

// Trigger and content areas: slots configured in each block's block.json.
const TEMPLATE = [
	['matter/slot', { name: 'trigger' }],
	['matter/slot', { name: 'content' }],
];

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
			const ids = getClientIdsWithDescendants();

			return ids.some(
				(id) =>
					id !== clientId &&
					getBlockAttributes(id)?.overlayId === overlayId &&
					// The first block keeps the ID; later copies change.
					ids.indexOf(id) < ids.indexOf(clientId)
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
	className,
}) {
	const {
		overlayId,
		label,
		dismissible,
		group,
		openOnLoad,
		openDelay,
		openOnScroll,
		scrollThreshold,
		urlTriggers,
		dismissDays,
		scheme,
	} = attributes;
	const isDialog = type !== 'collapsible';
	const [copied, setCopied] = useState(false);
	const { clearSelectedBlock, replaceInnerBlocks } =
		useDispatch(blockEditorStore);

	const { isOpen, triggerId, hasTrigger } = useSelect(
		(select) => {
			const {
				getBlocks,
				isBlockSelected,
				hasSelectedInnerBlock,
				getBlockCount,
			} = select(blockEditorStore);
			const slots = getBlocks(clientId);
			const trigger = slots.find(
				(block) => block.attributes.name === 'trigger'
			);
			const content = slots.find(
				(block) => block.attributes.name === 'content'
			);
			const isSelected =
				isBlockSelected(clientId) ||
				// A collapsible opens in place, so editing its trigger can
				// show the content too; a dialog would cover the trigger.
				(isDialog
					? !!content &&
						(isBlockSelected(content.clientId) ||
							hasSelectedInnerBlock(content.clientId, true))
					: hasSelectedInnerBlock(clientId, true));

			return {
				isOpen: isSelected,
				triggerId: trigger?.clientId,
				hasTrigger: !!trigger && getBlockCount(trigger.clientId) > 0,
			};
		},
		[clientId, isDialog]
	);

	const copyRef = useCopyToClipboard(`#${overlayId}`, () => {
		setCopied(true);
		window.setTimeout(() => setCopied(false), 2000);
	});

	useUniqueOverlayId(clientId, overlayId, type, setAttributes);

	const setHasTrigger = (value) => {
		if (!triggerId) {
			return;
		}

		replaceInnerBlocks(
			triggerId,
			value
				? [
						createBlock('core/buttons', {}, [
							createBlock('core/button', {
								text: __('Open', 'matter'),
							}),
						]),
					]
				: [],
			false
		);
	};

	// Closed, a modal or drawer is just its trigger area, as on the front
	// end (which wraps the trigger and the <dialog> in a `-host` element; the
	// editor's default class is `-host` too, see src/editor/index.js).
	// Open, the block becomes the dialog (see use-dialog-preview.js): the
	// front end's classes and `open` attribute let theme styles apply.
	const ref = useRef();
	const close = useCallback(() => clearSelectedBlock(), [clearSelectedBlock]);
	const isShown = useDialogPreview(ref, isOpen, isDialog, close);
	const blockClass = `wp-block-matter-${type}`;
	const blockProps = useBlockProps({
		ref,
		className: [
			'matter-overlay-editor',
			`is-overlay-${type}`,
			(isOpen || isShown) && 'is-editor-open',
			hasTrigger && 'has-trigger',
			isShown && blockClass,
			isShown && scheme && `has-scheme has-scheme-${scheme}`,
			className,
		]
			.filter(Boolean)
			.join(' '),
	});
	const { children: areas, ...innerBlocksProps } = useInnerBlocksProps(
		blockProps,
		{
			allowedBlocks: ['matter/slot'],
			template: TEMPLATE,
			templateLock: 'all',
			renderAppender: false,
		}
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
								'Shown in the Overlays list, and announced by screen readers when it opens.',
								'matter'
							)}
							value={label}
							onChange={(value) =>
								setAttributes({ label: value })
							}
						/>
					)}
					<ToggleControl
						__nextHasNoMarginBottom
						label={__('Trigger on the page', 'matter')}
						help={__(
							'Content in place on the page (e.g. a button) that opens it. Its first link or button is the trigger.',
							'matter'
						)}
						checked={hasTrigger}
						onChange={setHasTrigger}
					/>
					{isDialog && (
						<ToggleControl
							__nextHasNoMarginBottom
							label={__('Can be closed', 'matter')}
							help={
								dismissible
									? __(
											'Close button, Escape and clicking outside close it.',
											'matter'
										)
									: __(
											'No close button, and Escape or clicking outside do nothing (e.g. an age gate). Close it with a button inside that links to its #ID.',
											'matter'
										)
							}
							checked={dismissible}
							onChange={(value) =>
								setAttributes({ dismissible: value })
							}
						/>
					)}
					{type === 'modal' && (
						<TextControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={__('Group', 'matter')}
							help={__(
								'Modals sharing a group get previous/next buttons. Modals in a Query Loop are grouped automatically.',
								'matter'
							)}
							value={group}
							onChange={(value) =>
								setAttributes({
									group: value
										.toLowerCase()
										.replace(/[^a-z0-9-_]/g, '-'),
								})
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
			<div {...innerBlocksProps}>
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
				{areas}
				{isShown && type === 'modal' && group && (
					<GroupNav clientId={clientId} group={group} />
				)}
			</div>
		</>
	);
}
