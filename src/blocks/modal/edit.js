import {
	BlockControls,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	Button,
	Notice,
	TextControl,
	ToggleControl,
	ToolbarButton,
	ToolbarGroup,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalUnitControl as UnitControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalGrid as Grid,
	BaseControl,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useCopyToClipboard } from '@wordpress/compose';
import { copySmall } from '@wordpress/icons';

import {
	generateBlockId,
	hasDuplicateAttributeValue,
} from '../../utils/block-ids';

import './editor.scss';

const TEMPLATE = [
	['matter/trigger'],
	['matter/modal-content', { lock: { remove: true } }],
];

const DEFAULT_URL_TRIGGER = {
	param: '',
	value: '',
	match: 'exact',
};

const DISMISSED_DURATION_UNITS = [
	{
		value: 'days',
		label: 'd',
		default: '',
		a11yLabel: __('Days', 'matter'),
		step: 1,
	},
	{
		value: 'hrs',
		label: 'h',
		default: '',
		a11yLabel: __('Hours', 'matter'),
		step: 1,
	},
	{
		value: 'mins',
		label: 'min',
		default: '',
		a11yLabel: __('Minutes', 'matter'),
		step: 1,
	},
];

const TRIGGER_DELAY_UNITS = [
	{
		value: 'ms',
		label: 'ms',
		default: '',
		a11yLabel: __('Milliseconds (ms)', 'matter'),
		step: 100,
	},
];

const SCROLL_THRESHOLD_UNITS = [
	{
		value: '%',
		label: '%',
		default: 10,
		a11yLabel: __('Percentage', 'matter'),
		step: 10,
	},
];

/**
 * @param {string} pattern Regex pattern to validate.
 * @return {boolean} Whether the pattern is valid.
 */
const isValidRegex = (pattern) => {
	if (!pattern) {
		return true;
	}

	try {
		// eslint-disable-next-line no-new
		new RegExp(pattern);
		return true;
	} catch {
		return false;
	}
};

/**
 * @param {Object}   props               Component props.
 * @param {Array}    props.urlTriggers   URL trigger rules.
 * @param {Function} props.setAttributes Update block attributes.
 * @return {Element} Element to render.
 */
function UrlTriggersControl({ urlTriggers, setAttributes }) {
	const triggers = Array.isArray(urlTriggers) ? urlTriggers : [];

	const updateTrigger = (index, updates) => {
		const nextTriggers = triggers.map((trigger, triggerIndex) =>
			triggerIndex === index ? { ...trigger, ...updates } : trigger
		);

		setAttributes({ urlTriggers: nextTriggers });
	};

	const removeTrigger = (index) => {
		setAttributes({
			urlTriggers: triggers.filter(
				(_trigger, triggerIndex) => triggerIndex !== index
			),
		});
	};

	const addTrigger = () => {
		setAttributes({
			urlTriggers: [...triggers, { ...DEFAULT_URL_TRIGGER }],
		});
	};

	return (
		<div className="wp-block-matter-modal__url-triggers">
			{triggers.map((trigger, index) => {
				const hasInvalidRegex =
					trigger.match === 'regex' &&
					trigger.value &&
					!isValidRegex(trigger.value);

				return (
					<div
						key={index}
						className="wp-block-matter-modal__url-trigger"
					>
						<TextControl
							label={__('Parameter', 'matter')}
							value={trigger.param || ''}
							onChange={(value) =>
								updateTrigger(index, { param: value })
							}
							placeholder="utm_campaign"
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={__('Value', 'matter')}
							value={trigger.value || ''}
							onChange={(value) =>
								updateTrigger(index, { value })
							}
							placeholder="3freeswatches"
							help={
								trigger.match === 'regex'
									? __(
											'Tested as a regular expression against the parameter value.',
											'matter'
										)
									: __(
											'Leave empty to match when the parameter is present with any value.',
											'matter'
										)
							}
							__nextHasNoMarginBottom
						/>
						<ToggleGroupControl
							label={__('Match type', 'matter')}
							value={trigger.match || 'exact'}
							onChange={(value) =>
								updateTrigger(index, { match: value })
							}
							isBlock
							__nextHasNoMarginBottom
						>
							<ToggleGroupControlOption
								value="exact"
								label={__('Exact', 'matter')}
							/>
							<ToggleGroupControlOption
								value="regex"
								label={__('Regex', 'matter')}
							/>
						</ToggleGroupControl>
						{hasInvalidRegex && (
							<Notice status="warning" isDismissible={false}>
								{__(
									'Invalid regular expression pattern.',
									'matter'
								)}
							</Notice>
						)}
						<Button
							variant="secondary"
							isDestructive
							onClick={() => removeTrigger(index)}
							__next40pxDefaultSize
						>
							{__('Remove rule', 'matter')}
						</Button>
					</div>
				);
			})}
			<Button
				variant="secondary"
				onClick={addTrigger}
				className="wp-block-matter-modal__url-triggers-add"
			>
				{__('Add rule', 'matter')}
			</Button>
		</div>
	);
}

/**
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Update block attributes.
 * @param {string}   props.clientId      Block client ID.
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes, clientId }) {
	const {
		anchor,
		dismissedDuration,
		editorIsOpen,
		generatedId,
		scrollSelector,
		scrollThreshold,
		targetId,
		triggerDelay,
		triggerOnLoad,
		triggerOnScroll,
		urlTriggers,
	} = attributes;
	const { updateBlockAttributes, __unstableMarkNextChangeAsNotPersistent } =
		useDispatch(blockEditorStore);

	const { blocks, hasSelection } = useSelect(
		(select) => {
			const blockEditor = select(blockEditorStore);

			return {
				blocks: blockEditor.getBlocks(),
				hasSelection:
					blockEditor.isBlockSelected(clientId) ||
					blockEditor.hasSelectedInnerBlock(clientId, true),
			};
		},
		[clientId]
	);

	const duplicateGeneratedId = hasDuplicateAttributeValue(
		blocks,
		clientId,
		'matter/modal',
		'generatedId',
		generatedId
	);

	const duplicateAnchor = hasDuplicateAttributeValue(
		blocks,
		clientId,
		'matter/modal',
		'anchor',
		anchor
	);

	useEffect(() => {
		if (!generatedId || (!anchor && duplicateGeneratedId)) {
			const nextGeneratedId = generateBlockId('matter-modal');

			setAttributes({
				generatedId: nextGeneratedId,
				targetId: anchor || nextGeneratedId,
			});
			return;
		}

		const nextTargetId = anchor || generatedId;

		if (targetId !== nextTargetId) {
			setAttributes({ targetId: nextTargetId });
		}
	}, [anchor, duplicateGeneratedId, generatedId, setAttributes, targetId]);

	useEffect(() => {
		if (hasSelection || !editorIsOpen) {
			return;
		}

		__unstableMarkNextChangeAsNotPersistent();
		updateBlockAttributes(clientId, {
			editorIsOpen: false,
		});
	}, [
		__unstableMarkNextChangeAsNotPersistent,
		clientId,
		editorIsOpen,
		hasSelection,
		updateBlockAttributes,
	]);

	const blockProps = useBlockProps({
		className: editorIsOpen ? 'is-open' : undefined,
	});

	const { children, ...innerBlocksProps } = useInnerBlocksProps(blockProps, {
		template: TEMPLATE,
	});

	const toggleEditorPreview = () => {
		__unstableMarkNextChangeAsNotPersistent();
		updateBlockAttributes(clientId, {
			editorIsOpen: !editorIsOpen,
		});
	};

	const resetDismissal = () => {
		setAttributes({ dismissedDuration: undefined });
	};

	const resetUrlActivation = () => {
		setAttributes({ urlTriggers: [] });
	};

	const resetAllSettings = () => {
		setAttributes({
			dismissedDuration: undefined,
			triggerOnLoad: false,
			triggerDelay: undefined,
			triggerOnScroll: false,
			scrollSelector: undefined,
			scrollThreshold: '10',
			urlTriggers: [],
		});
	};

	const [hasCopied, setHasCopied] = useState(false);
	const copyRef = useCopyToClipboard(
		() => (targetId ? `#${targetId}` : ''),
		() => setHasCopied(true)
	);

	useEffect(() => {
		if (!hasCopied) {
			return undefined;
		}

		const timeout = window.setTimeout(() => setHasCopied(false), 3000);

		return () => window.clearTimeout(timeout);
	}, [hasCopied]);

	return (
		<>
			<BlockControls>
				<ToolbarGroup>
					<ToolbarButton onClick={toggleEditorPreview}>
						{editorIsOpen
							? __('Close modal', 'matter')
							: __('Open modal', 'matter')}
					</ToolbarButton>
				</ToolbarGroup>
			</BlockControls>

			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'matter')}
					resetAll={resetAllSettings}
				>
					<ToolsPanelItem
						hasValue={() => !!dismissedDuration}
						label={__('Dismissed duration', 'matter')}
						onDeselect={resetDismissal}
						isShownByDefault
					>
						<UnitControl
							label={__('Dismissed duration', 'matter')}
							labelPosition="edge"
							__unstableInputWidth="80px"
							value={dismissedDuration || ''}
							onChange={(value) =>
								setAttributes({ dismissedDuration: value })
							}
							units={DISMISSED_DURATION_UNITS}
							help={__(
								'Duration before this modal will appear again via auto-triggers or hash links after being closed. Manual triggers are unaffected.',
								'matter'
							)}
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						hasValue={() => triggerOnLoad}
						label={__('Open on load', 'matter')}
						onDeselect={() =>
							setAttributes({ triggerOnLoad: false })
						}
						isShownByDefault
					>
						<Grid columns={1} gap={4}>
							<ToggleControl
								label={__('Open on load', 'matter')}
								checked={triggerOnLoad || false}
								onChange={(value) =>
									setAttributes({ triggerOnLoad: value })
								}
								help={__(
									'Automatically open this modal after the page loads.',
									'matter'
								)}
							/>

							{triggerOnLoad && (
								<UnitControl
									label={__('Delay', 'matter')}
									labelPosition="edge"
									__unstableInputWidth="80px"
									value={triggerDelay || ''}
									onChange={(value) =>
										setAttributes({ triggerDelay: value })
									}
									units={TRIGGER_DELAY_UNITS}
									placeholder="0"
								/>
							)}
						</Grid>
					</ToolsPanelItem>

					<ToolsPanelItem
						hasValue={() => triggerOnScroll}
						label={__('Open on scroll', 'matter')}
						onDeselect={() =>
							setAttributes({ triggerOnScroll: false })
						}
						isShownByDefault
					>
						<ToggleControl
							label={__('Open on scroll', 'matter')}
							checked={triggerOnScroll || false}
							onChange={(value) =>
								setAttributes({ triggerOnScroll: value })
							}
							help={__(
								'Open this modal when a selected element scrolls into view.',
								'matter'
							)}
						/>
					</ToolsPanelItem>
					{triggerOnScroll && (
						<>
							<ToolsPanelItem
								hasValue={() => !!scrollSelector}
								label={__('Selector', 'matter')}
								onDeselect={() =>
									setAttributes({ scrollSelector: undefined })
								}
								isShownByDefault
							>
								<TextControl
									label={__('Selector', 'matter')}
									value={scrollSelector || ''}
									onChange={(value) =>
										setAttributes({ scrollSelector: value })
									}
									help={__(
										'CSS element selector that triggers the modal when scrolled into view.',
										'matter'
									)}
									style={{ fontFamily: 'monospace' }}
									__nextHasNoMarginBottom
								/>
							</ToolsPanelItem>

							<ToolsPanelItem
								hasValue={() =>
									scrollThreshold && scrollThreshold !== '10'
								}
								label={__('Scroll threshold', 'matter')}
								onDeselect={() =>
									setAttributes({ scrollThreshold: '10' })
								}
								isShownByDefault
							>
								<UnitControl
									label={__('Scroll threshold', 'matter')}
									labelPosition="edge"
									__unstableInputWidth="80px"
									value={scrollThreshold || '10'}
									onChange={(value) =>
										setAttributes({
											scrollThreshold: value,
										})
									}
									units={SCROLL_THRESHOLD_UNITS}
									min={0}
									max={100}
								/>
							</ToolsPanelItem>
						</>
					)}

					<ToolsPanelItem
						hasValue={() =>
							Array.isArray(urlTriggers) && urlTriggers.length > 0
						}
						label={__('URL trigger rules', 'matter')}
						onDeselect={resetUrlActivation}
					>
						<BaseControl
							label={__('URL trigger rules', 'matter')}
							id="matter-modal-url-triggers"
							help={__(
								'Open this modal on page load when any rule matches the current URL query string. Example: utm_campaign / 3freeswatches.',
								'matter'
							)}
						>
							<UrlTriggersControl
								urlTriggers={urlTriggers}
								setAttributes={setAttributes}
							/>
						</BaseControl>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			<InspectorControls group="advanced">
				<BaseControl
					label={__('Modal ID', 'matter')}
					id="matter-modal-id"
					help={__(
						'Link directly to this modal with a URL hash, for example #your-id. Set a custom anchor in the Advanced panel.',
						'matter'
					)}
				>
					<Button
						icon={copySmall}
						iconPosition="right"
						ref={copyRef}
						variant="secondary"
						disabled={!targetId}
						className="wp-block-matter-modal__editor-id"
						style={{ fontFamily: 'monospace' }}
					>
						{hasCopied ? __('Copied!', 'matter') : `#${targetId}`}
					</Button>
				</BaseControl>
			</InspectorControls>

			<div {...innerBlocksProps}>
				{duplicateAnchor && (
					<Notice status="warning" isDismissible={false}>
						{__(
							'Another modal block is using this anchor. Choose a unique anchor so triggers target the correct modal.',
							'matter'
						)}
					</Notice>
				)}
				{children}
			</div>
		</>
	);
}
