/**
 * Block toolbar control: "Add icon" opens the icon library; with an icon,
 * "Replace icon" offers the library or removing it (like core's media
 * replace flow).
 */

/**
 * WordPress dependencies
 */
import {
	Dropdown,
	MenuItem,
	NavigableMenu,
	ToolbarButton,
	ToolbarGroup,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { IconLibraryModal } from './icon-library-modal';

/**
 * @param {Object}   props
 * @param {string}   props.value    Icon name.
 * @param {Function} props.onChange Called with an icon name, or undefined.
 * @return {Element} Toolbar group.
 */
export function IconToolbar({ value, onChange }) {
	const [isLibraryOpen, setIsLibraryOpen] = useState(false);

	return (
		<ToolbarGroup>
			{value ? (
				<Dropdown
					popoverProps={{ variant: 'toolbar' }}
					contentClassName="block-editor-media-replace-flow__options is-variant-toolbar"
					renderToggle={({ isOpen, onToggle }) => (
						<ToolbarButton
							aria-expanded={isOpen}
							aria-haspopup="true"
							onClick={onToggle}
						>
							{__('Replace icon', 'matter')}
						</ToolbarButton>
					)}
					renderContent={({ onClose }) => (
						<NavigableMenu className="block-editor-media-replace-flow__media-upload-menu">
							<MenuItem
								onClick={() => {
									setIsLibraryOpen(true);
									onClose();
								}}
							>
								{__('Open icon library', 'matter')}
							</MenuItem>
							<MenuItem
								onClick={() => {
									onChange(undefined);
									onClose();
								}}
							>
								{__('Remove icon', 'matter')}
							</MenuItem>
						</NavigableMenu>
					)}
				/>
			) : (
				<ToolbarButton onClick={() => setIsLibraryOpen(true)}>
					{__('Add icon', 'matter')}
				</ToolbarButton>
			)}
			{isLibraryOpen && (
				<IconLibraryModal
					value={value}
					onSelect={onChange}
					onRequestClose={() => setIsLibraryOpen(false)}
				/>
			)}
		</ToolbarGroup>
	);
}
