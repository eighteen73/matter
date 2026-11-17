/**
 * WordPress dependencies
 */
import {
	InnerBlocks,
	InspectorControls,
	store as blockEditorStore,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ToolsPanel } from '../../components/compat';
import { ACCORDION_SETTINGS, AccordionSettings } from './settings';
import { useStableId } from '../../components/stable-id';

const ALLOWED_BLOCKS = ['matter/accordion-item'];

/**
 * An accordion of items written in the editor. An accordion of posts is a
 * Query Loop shown as an accordion ("Posts accordion").
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {string}   props.clientId      Block client ID.
 * @param {boolean}  props.isSelected    Whether the accordion is selected.
 * @return {Element} Accordion editor.
 */
export default function Edit({
	attributes,
	setAttributes,
	clientId,
	isSelected,
}) {
	// An accordion holding a Query Loop (from before) becomes the query.
	// A stable ID for links to its items (`#{id}-2`).
	useStableId(clientId, 'matterId', 'accordion');

	// "Add accordion item" while anything in the accordion is selected (an
	// item's text, say), not only the accordion itself.
	const isEditing = useSelect(
		(select) =>
			isSelected ||
			select(blockEditorStore).hasSelectedInnerBlock(clientId, true),
		[clientId, isSelected]
	);

	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		template: [['matter/accordion-item']],
		renderAppender: isEditing ? InnerBlocks.ButtonBlockAppender : false,
	});

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'matter')}
					resetAll={() =>
						setAttributes(
							Object.fromEntries(
								ACCORDION_SETTINGS.map((key) => [
									key,
									undefined,
								])
							)
						)
					}
				>
					<AccordionSettings
						values={attributes}
						set={setAttributes}
					/>
				</ToolsPanel>
			</InspectorControls>
			<div {...innerBlocksProps} />
		</>
	);
}
