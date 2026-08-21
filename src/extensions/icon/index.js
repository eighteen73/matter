/**
 * Button icon extension.
 */

import { BlockControls, InspectorControls } from '@wordpress/block-editor';
import {
	DropdownMenu,
	ToolbarButton,
	ToolbarGroup,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { reset, siteLogo } from '@wordpress/icons';

import { registerBlockExtension } from '../../utils/register-block-extension';
import clsx from 'clsx';

import ColorControl from '../../components/color-control';
import { IconLibraryModal } from '../../components/icon-picker';
import '../../components/icon-picker/editor.scss';
import { IconLeft, IconRight } from './icons';
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
			<BlockControls>
				<ToolbarGroup>
					<ToolbarButton
						icon={siteLogo}
						label={
							icon
								? __('Change Icon', 'matter')
								: __('Add Icon', 'matter')
						}
						onClick={() => setIsLibraryOpen(true)}
					/>

					{icon && (
						<>
							<ToolbarButton
								icon={reset}
								label={__('Remove Icon', 'matter')}
								onClick={removeIcon}
							/>

							<DropdownMenu
								icon={
									position === 'before' ? IconLeft : IconRight
								}
								label={__('Change icon position', 'matter')}
								controls={[
									{
										title: __('Icon left', 'matter'),
										icon: IconLeft,
										isActive: position === 'before',
										onClick: () => {
											updateIcon({ position: 'before' });
										},
									},
									{
										title: __('Icon right', 'matter'),
										icon: IconRight,
										isActive: position === 'after',
										onClick: () => {
											updateIcon({ position: 'after' });
										},
									},
								]}
							/>
						</>
					)}
				</ToolbarGroup>
			</BlockControls>

			{isLibraryOpen && (
				<IconLibraryModal
					value={normalizeIconName(name)}
					defaultCollection={COLLECTION}
					onSelect={(nextName) => updateIcon({ name: nextName })}
					onReset={removeIcon}
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
