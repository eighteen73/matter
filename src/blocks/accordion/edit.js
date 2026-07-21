/**
 * WordPress dependencies
 */
import {
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';
import {
	createBlock,
	createBlocksFromInnerBlocksTemplate,
} from '@wordpress/blocks';
import { useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import './editor.scss';
import useBlockId from '../../utils/use-block-id';
import {
	MANUAL_ACCORDION_TEMPLATE,
	QUERY_LOOP_ACCORDION_TEMPLATE,
} from './variations';
import AccordionBlockControls from './components/block-controls';
import AccordionInspectorControls from './components/inspector-controls';

/**
 * Whether accordion inner blocks match the expected query/manual mode.
 *
 * @param {boolean} isQueryMode Whether accordion is in query mode.
 * @param {Array}   innerBlocks Accordion inner blocks.
 * @return {boolean} True when structure matches the mode.
 */
function hasMatchingStructure(isQueryMode, innerBlocks) {
	const hasQueryBlock = innerBlocks.some(
		(block) => block.name === 'core/query'
	);

	return isQueryMode ? hasQueryBlock : !hasQueryBlock;
}

/**
 * Resolve fontSize support values to a CSS length/var.
 *
 * @param {string|undefined} fontSize Preset slug from the fontSize attribute.
 * @param {Object|undefined} style    Block style object.
 * @return {string|null} CSS value, or null when unset.
 */
function getTitleFontSizeCSSValue(fontSize, style) {
	if (fontSize) {
		return `var(--wp--preset--font-size--${fontSize})`;
	}

	const customSize = style?.typography?.fontSize;
	if (!customSize || typeof customSize !== 'string') {
		return null;
	}

	if (customSize.startsWith('var:preset|font-size|')) {
		const slug = customSize.split('|').pop();
		return slug ? `var(--wp--preset--font-size--${slug})` : null;
	}

	return customSize;
}

function Edit({ clientId, attributes, setAttributes, isSelected }) {
	const { isQueryMode, fontSize, style } = attributes;

	const { insertBlock, replaceInnerBlocks, updateBlockAttributes } =
		useDispatch(blockEditorStore);

	const { duplicateAnchor } = useBlockId({
		blockName: 'matter/accordion',
		prefix: 'matter-accordion',
		attributes,
		setAttributes,
		clientId,
	});

	const innerBlocks = useSelect(
		(select) => select(blockEditorStore).getBlocks(clientId),
		[clientId]
	);

	useEffect(() => {
		if (!innerBlocks.length) {
			return;
		}

		if (hasMatchingStructure(isQueryMode, innerBlocks)) {
			return;
		}

		const template = isQueryMode
			? QUERY_LOOP_ACCORDION_TEMPLATE
			: MANUAL_ACCORDION_TEMPLATE;

		replaceInnerBlocks(
			clientId,
			createBlocksFromInnerBlocksTemplate(template),
			false
		);
	}, [clientId, innerBlocks, isQueryMode, replaceInnerBlocks]);

	const firstItem = innerBlocks.find(
		(block) => block.name === 'matter/accordion-item'
	);

	const syncFirstItemOpen = (value) => {
		setAttributes({ openFirstItem: value });

		if (!isQueryMode && firstItem) {
			updateBlockAttributes(firstItem.clientId, {
				openByDefault: value,
			});
		}
	};

	const titleFontSize = getTitleFontSizeCSSValue(fontSize, style);
	const blockProps = useBlockProps({
		role: 'group',
		style: titleFontSize
			? { '--matter-accordion--title--font-size': titleFontSize }
			: undefined,
	});

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		template: isQueryMode ? undefined : MANUAL_ACCORDION_TEMPLATE,
		templateInsertUpdatesSelection: true,
		defaultBlock: isQueryMode
			? undefined
			: { name: 'matter/accordion-item' },
		directInsert: !isQueryMode,
		renderAppender: false,
		allowedBlocks: isQueryMode ? ['core/query'] : ['matter/accordion-item'],
	});

	const addAccordionItem = () => {
		const newItem = createBlock('matter/accordion-item', {}, [
			createBlock('matter/accordion-heading', {}),
			createBlock('matter/accordion-panel', {}, [
				createBlock('core/paragraph', {
					placeholder: __('Type / to add content…', 'matter'),
				}),
			]),
		]);
		insertBlock(newItem, undefined, clientId);
	};

	const inspectorControls = (
		<AccordionInspectorControls
			attributes={attributes}
			setAttributes={setAttributes}
			isQuery={isQueryMode}
			firstItem={firstItem}
			updateBlockAttributes={updateBlockAttributes}
			syncFirstItemOpen={syncFirstItemOpen}
		/>
	);

	const blockControls = (
		<AccordionBlockControls
			attributes={attributes}
			setAttributes={setAttributes}
			isSelected={isSelected}
			isQuery={isQueryMode}
			addAccordionItem={addAccordionItem}
		/>
	);

	return (
		<>
			{duplicateAnchor && (
				<Notice status="warning" isDismissible={false}>
					{__(
						'Another accordion block is using this anchor. Choose a unique anchor so programmatic controls target the correct accordion.',
						'matter'
					)}
				</Notice>
			)}

			{blockControls}

			{inspectorControls}

			<div {...innerBlocksProps} />
		</>
	);
}

export default Edit;
