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
import { createHigherOrderComponent } from '@wordpress/compose';
import { useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
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

const COLLECTION = 'matter';

const additionalAttributes = {
	icon: {
		type: 'object',
	},
};

/**
 * @param {string} className Block className attribute.
 * @return {string} Class name without generated icon utilities.
 */
function stripGeneratedIconClasses(className) {
	if (!className) {
		return '';
	}

	return className
		.split(/\s+/)
		.filter((token) => token && !token.startsWith('has-icon'))
		.join(' ');
}

/**
 * Look up a mask URL localized from PHP so the editor matches the front end.
 *
 * @param {string|null} name Namespaced icon name.
 * @return {string} CSS mask url() value.
 */
function getIconMaskUrl(name) {
	if (!name) {
		return '';
	}

	const masks = globalThis.matterIconMasks;

	return masks && typeof masks[name] === 'string' ? masks[name] : '';
}

/**
 * Drop a persisted --icon custom property without touching --icon-color.
 *
 * @param {Object|string|undefined} style Inline style map or string.
 * @return {Object|string|undefined} Style without --icon.
 */
function omitIconMaskStyle(style) {
	if (!style) {
		return style;
	}

	if (typeof style === 'string') {
		const next = style
			.split(';')
			.map((part) => part.trim())
			.filter((part) => part && !/^--icon\s*:/i.test(part))
			.join('; ');

		return next ? `${next};` : undefined;
	}

	if (typeof style === 'object') {
		const rest = { ...style };
		delete rest['--icon'];

		return Object.keys(rest).length ? rest : undefined;
	}

	return style;
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
					value={name}
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

	return clsx({
		'has-icon': hasIcon,
		'has-icon-before': hasIcon && !isAfter,
		'has-icon-after': hasIcon && isAfter,
		'has-icon-color': color,
	});
}

/**
 * @param {string} className  Existing className.
 * @param {Object} attributes Block attributes.
 * @return {string|undefined} Class name with current icon layout classes.
 */
function applyIconClassName(className, attributes) {
	return (
		clsx(
			stripGeneratedIconClasses(className),
			generateClassNames(attributes)
		) || undefined
	);
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

/**
 * extraProps would persist a data-URI --icon into post_content. Apply the
 * mask in the editor from the PHP-localized map instead.
 */
const withButtonIconMask = createHigherOrderComponent((BlockList) => {
	return (props) => {
		if (props.name !== 'core/button') {
			return <BlockList {...props} />;
		}

		const iconName =
			typeof props.attributes?.icon?.name === 'string'
				? props.attributes.icon.name
				: null;
		const maskUrl = getIconMaskUrl(iconName);
		const wrapperStyle = omitIconMaskStyle(props.wrapperProps?.style) || {};

		if (maskUrl) {
			wrapperStyle['--icon'] = maskUrl;
		}

		return (
			<BlockList
				{...props}
				className={applyIconClassName(
					props.className,
					props.attributes
				)}
				wrapperProps={{
					...props.wrapperProps,
					style: Object.keys(wrapperStyle).length
						? wrapperStyle
						: props.wrapperProps?.style,
				}}
			/>
		);
	};
}, 'withButtonIconMask');

addFilter(
	'editor.BlockListBlock',
	'matter/icon/apply-mask',
	withButtonIconMask,
	5
);

addFilter(
	'blocks.getSaveContent.extraProps',
	'matter/icon/strip-persisted-mask',
	(props, block, attributes) => {
		if (block.name !== 'core/button') {
			return props;
		}

		return {
			...props,
			className: applyIconClassName(props.className, attributes),
			style: omitIconMaskStyle(props.style),
		};
	},
	20
);
