/**
 * Button icon extension.
 */

import { BlockControls, InspectorControls } from '@wordpress/block-editor';
import { getBlockType } from '@wordpress/blocks';
import {
	Dropdown,
	DropdownMenu,
	MenuItem,
	NavigableMenu,
	ToolbarButton,
	ToolbarGroup,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { pullLeft, pullRight } from '@wordpress/icons';
import { DOWN } from '@wordpress/keycodes';

import { registerBlockExtension } from '../../utils/register-block-extension';
import clsx from 'clsx';

import ColorControl from '../../components/color-control';
import { IconLibraryModal } from '../../components/icon-picker';
import '../../components/icon-picker/editor.scss';
import './editor.scss';
import './style.scss';

const LEGACY_COLLECTION = 'pulsar-extensions';
const COLLECTION = 'matter';

const additionalAttributes = {
	icon: {
		type: 'object',
	},
};

/**
 * Map a stored icon name onto the Matter collection.
 *
 * @param {string} namespacedName Namespaced icon name.
 * @return {string|null} Generated string or null.
 */
function normalizeIconName(namespacedName) {
	if (!namespacedName || typeof namespacedName !== 'string') {
		return null;
	}

	if (namespacedName.startsWith(`${LEGACY_COLLECTION}/`)) {
		return `${COLLECTION}/${namespacedName.slice(LEGACY_COLLECTION.length + 1)}`;
	}

	return namespacedName;
}

/**
 * @return {Element|string|undefined} Core Icon block icon.
 */
function getCoreIconBlockIcon() {
	const icon = getBlockType('core/icon')?.icon;

	if (icon && typeof icon === 'object' && icon.src) {
		return icon.src;
	}

	return icon;
}

/**
 * @param {KeyboardEvent} event Keyboard event from the replace toggle.
 */
function openDropdownOnArrowDown(event) {
	if (event.keyCode === DOWN) {
		event.preventDefault();
		event.target.click();
	}
}

/**
 * @param {Object}   props
 * @param {string}   props.clientId
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @return {Element} The component.
 */
function BlockEdit({ clientId, attributes, setAttributes }) {
	const { icon } = attributes;
	const { position = 'after', color, name } = icon || {};
	const [isLibraryOpen, setIsLibraryOpen] = useState(false);
	const hasIcon = Boolean(name);

	const updateIcon = (newAttributes) => {
		const updatedIcon = { ...icon, ...newAttributes };

		if (newAttributes.name && !updatedIcon.position) {
			updatedIcon.position = 'after';
		}

		setAttributes({ icon: updatedIcon });
	};

	const removeIcon = () => {
		setAttributes({ icon: null });
	};

	return (
		<>
			<BlockControls group="other">
				<ToolbarGroup>
					{hasIcon ? (
						<Dropdown
							popoverProps={{ variant: 'toolbar' }}
							contentClassName="block-editor-media-replace-flow__options is-variant-toolbar"
							renderToggle={({ isOpen, onToggle }) => (
								<ToolbarButton
									aria-expanded={isOpen}
									aria-haspopup="true"
									onClick={onToggle}
									onKeyDown={openDropdownOnArrowDown}
								>
									{__('Replace icon', 'matter')}
								</ToolbarButton>
							)}
							renderContent={({ onClose }) => (
								<NavigableMenu className="block-editor-media-replace-flow__media-upload-menu">
									<MenuItem
										icon={getCoreIconBlockIcon()}
										onClick={() => {
											setIsLibraryOpen(true);
											onClose();
										}}
									>
										{__('Open Icon Library', 'matter')}
									</MenuItem>
									<MenuItem
										onClick={() => {
											removeIcon();
											onClose();
										}}
									>
										{__('Reset', 'matter')}
									</MenuItem>
								</NavigableMenu>
							)}
						/>
					) : (
						<ToolbarButton onClick={() => setIsLibraryOpen(true)}>
							{__('Add icon', 'matter')}
						</ToolbarButton>
					)}

					{hasIcon && (
						<DropdownMenu
							icon={position === 'before' ? pullLeft : pullRight}
							label={__('Change icon position', 'matter')}
							controls={[
								{
									title: __('Icon left', 'matter'),
									icon: pullLeft,
									isActive: position === 'before',
									onClick: () => {
										updateIcon({ position: 'before' });
									},
								},
								{
									title: __('Icon right', 'matter'),
									icon: pullRight,
									isActive: position === 'after',
									onClick: () => {
										updateIcon({ position: 'after' });
									},
								},
							]}
						/>
					)}
				</ToolbarGroup>
			</BlockControls>

			{isLibraryOpen && (
				<IconLibraryModal
					value={normalizeIconName(name)}
					defaultCollection={COLLECTION}
					onSelect={(nextName) => updateIcon({ name: nextName })}
					onRequestClose={() => setIsLibraryOpen(false)}
				/>
			)}

			<InspectorControls group="color">
				<ColorControl
					label={__('Icon', 'matter')}
					value={color}
					onChange={(value, slug) => updateIcon({ color: slug })}
					panelId={clientId}
				/>
			</InspectorControls>
		</>
	);
}

/**
 * @param {Object} attributes
 * @return {string} Generated string.
 */
function generateClassNames(attributes) {
	const { icon } = attributes;
	const { name, position, color } = icon || {};
	const hasIcon = Boolean(name);
	const isAfter = position === 'after';
	const normalized = normalizeIconName(name);

	const classes = {
		'has-icon': hasIcon,
		'has-icon-before': hasIcon && !isAfter,
		'has-icon-after': hasIcon && isAfter,
		'has-icon-color': color,
	};

	if (hasIcon && typeof name === 'string') {
		classes[`has-icon-${name.replace(/\//g, '-')}`] = true;
	}

	if (normalized && normalized !== name) {
		classes[`has-icon-${normalized.replace(/\//g, '-')}`] = true;
	}

	return clsx(classes);
}

/**
 * @param {Object} attributes
 * @return {Object<string, string>|null} Inline style map or null.
 */
function generateInlineStyles(attributes) {
	const { icon } = attributes;
	const { color } = icon || {};

	return color
		? { '--icon-color': `var(--wp--preset--color--${color})` }
		: null;
}

registerBlockExtension(['core/button'], {
	extensionName: 'matter/icon',
	attributes: additionalAttributes,
	classNameGenerator: generateClassNames,
	inlineStyleGenerator: generateInlineStyles,
	Edit: BlockEdit,
	order: 'after',
});
