/**
 * WordPress dependencies
 */
import { ToolbarGroup, ToolbarButton } from '@wordpress/components';
import { BlockControls, HeadingLevelDropdown } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

export default function AccordionBlockControls({
	attributes,
	setAttributes,
	isSelected,
	isQuery,
	addAccordionItem,
}) {
	const { headingLevel } = attributes;

	return (
		<>
			{isSelected && !isQuery && (
				<BlockControls group="other">
					<ToolbarGroup>
						<ToolbarButton onClick={addAccordionItem}>
							{__('Add item', 'matter')}
						</ToolbarButton>
					</ToolbarGroup>
				</BlockControls>
			)}

			<BlockControls group="block">
				<HeadingLevelDropdown
					value={headingLevel}
					onChange={(value) => setAttributes({ headingLevel: value })}
				/>
			</BlockControls>
		</>
	);
}
