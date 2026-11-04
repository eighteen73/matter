/**
 * Button icon: choose an icon from the icon library for core/button.
 * The front end renders it as an inline SVG; the editor previews it with a
 * CSS mask (see canvas.scss).
 */

/**
 * WordPress dependencies
 */
import { BlockControls } from '@wordpress/block-editor';
import {
	Dropdown,
	MenuItem,
	NavigableMenu,
	ToolbarButton,
	ToolbarGroup,
} from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { IconLibraryModal, useIcon } from '../../components/icon-picker';

const svgToDataUri = (svg) =>
	`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/**
 * Toolbar control: "Add icon" opens the icon library; with an icon, "Replace
 * icon" offers the library or removing it (like core's media replace flow).
 *
 * @param {Object}   props
 * @param {string}   props.value    Icon name.
 * @param {Function} props.onChange Called with an icon name, or undefined.
 * @return {Element} Toolbar group.
 */
function IconToolbar({ value, onChange }) {
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

addFilter(
	'editor.BlockEdit',
	'matter/button-icon/control',
	createHigherOrderComponent(
		(BlockEdit) => (props) => {
			if (props.name !== 'core/button') {
				return <BlockEdit {...props} />;
			}

			return (
				<>
					<BlockEdit {...props} />
					<BlockControls group="other">
						<IconToolbar
							value={props.attributes.icon}
							onChange={(icon) => props.setAttributes({ icon })}
						/>
					</BlockControls>
				</>
			);
		},
		'withButtonIconControl'
	)
);

addFilter(
	'editor.BlockListBlock',
	'matter/button-icon/preview',
	createHigherOrderComponent(
		(BlockListBlock) => (props) => {
			const icon = useIcon(
				props.name === 'core/button' ? props.attributes.icon : undefined
			);

			if (!icon?.content) {
				return <BlockListBlock {...props} />;
			}

			return (
				<BlockListBlock
					{...props}
					className={[props.className, 'has-icon']
						.filter(Boolean)
						.join(' ')}
					wrapperProps={{
						...props.wrapperProps,
						style: {
							...props.wrapperProps?.style,
							'--matter-button-icon': svgToDataUri(icon.content),
						},
					}}
				/>
			);
		},
		'withButtonIconPreview'
	)
);
