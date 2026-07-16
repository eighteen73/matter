/**
 * WordPress dependencies
 */
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';
import { createBlock } from '@wordpress/blocks';
import { useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import './editor.scss';
import BlockVariationPicker from '../../components/block-variation-picker';
import useBlockId from '../../utils/use-block-id';
import { ITEM_TEMPLATE } from './variations';
import SchemaSettings from './components/schemaSettings';
import Settings from './components/settings';
import ToolbarSettings from './components/toolbarSettings';

const DEFAULT_TEMPLATE = [ITEM_TEMPLATE];

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

	const { insertBlock, updateBlockAttributes } =
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

	const hasQueryLoop = innerBlocks.some(
		(block) => block.name === 'core/query'
	);
	const isQuery = isQueryMode || hasQueryLoop;
	const firstItem = innerBlocks.find(
		(block) => block.name === 'matter/accordion-item'
	);

	useEffect(() => {
		if (hasQueryLoop !== isQueryMode) {
			setAttributes({ isQueryMode: hasQueryLoop });
		}
	}, [hasQueryLoop, isQueryMode, setAttributes]);

	const syncFirstItemOpen = (value) => {
		setAttributes({ openFirstItem: value });

		if (!isQuery && firstItem) {
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
		template: isQuery ? undefined : DEFAULT_TEMPLATE,
		templateInsertUpdatesSelection: true,
		defaultBlock: isQuery ? undefined : { name: 'matter/accordion-item' },
		directInsert: !isQuery,
		renderAppender: false,
		allowedBlocks: isQuery ? ['core/query'] : ['matter/accordion-item'],
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

	if (innerBlocks.length === 0) {
		return (
			<BlockVariationPicker
				blockName="matter/accordion"
				setAttributes={setAttributes}
				clientId={clientId}
				defaultTemplate={DEFAULT_TEMPLATE}
			/>
		);
	}

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

			<ToolbarSettings
				attributes={attributes}
				setAttributes={setAttributes}
				isSelected={isSelected}
				isQuery={isQuery}
				addAccordionItem={addAccordionItem}
			/>

			<InspectorControls>
				<Settings
					attributes={attributes}
					setAttributes={setAttributes}
					isQuery={isQuery}
					firstItem={firstItem}
					updateBlockAttributes={updateBlockAttributes}
					syncFirstItemOpen={syncFirstItemOpen}
				/>

				<SchemaSettings
					attributes={attributes}
					setAttributes={setAttributes}
				/>
			</InspectorControls>

			<div {...innerBlocksProps} />
		</>
	);
}

export default Edit;
