/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ToolsPanel } from '../../components/compat';
import { useLegacyQuery } from '../../query-display/use-legacy-query';
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
 * @return {Element} Accordion editor.
 */
export default function Edit({ attributes, setAttributes, clientId }) {
	// An accordion holding a Query Loop (from before) becomes the query.
	useLegacyQuery(clientId, 'accordion', attributes, ACCORDION_SETTINGS);
	// A stable ID for links to its items (`#{id}-2`).
	useStableId(clientId, 'anchor', 'accordion');

	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		template: [['matter/accordion-item']],
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
