/**
 * WordPress dependencies
 */
import { ToolbarGroup, ToolbarButton } from '@wordpress/components';
import { BlockControls } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

export default function CarouselBlockControls({
	isSelected,
	carouselMode,
	addCarouselItem,
}) {
	return (
		<>
			{isSelected && carouselMode !== 'post' && (
				<BlockControls group="other">
					<ToolbarGroup>
						<ToolbarButton onClick={addCarouselItem}>
							{__('Add item', 'matter')}
						</ToolbarButton>
					</ToolbarGroup>
				</BlockControls>
			)}
		</>
	);
}
