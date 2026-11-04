/**
 * Sidebar icon control, styled like Global Styles' background image row: a
 * bordered preview button that opens the icon library, plus a reset button.
 */

/**
 * WordPress dependencies
 */
import { BaseControl, Button, Icon } from '@wordpress/components';
import { safeHTML } from '@wordpress/dom';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { notAllowed, reset as resetIcon } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { IconLibraryModal } from './icon-library-modal';
import { useIcon } from './use-icons';

/**
 * @param {Object}   props
 * @param {string}   props.label    Control label.
 * @param {string}   props.value    Icon name.
 * @param {Function} props.onChange Called with an icon name, or undefined.
 * @return {Element} Control.
 */
export function IconControl({ label, value, onChange }) {
	const [isOpen, setIsOpen] = useState(false);
	const icon = useIcon(value);

	return (
		<BaseControl __nextHasNoMarginBottom label={label} id="">
			<div className="matter-icon-control">
				<Button
					className="matter-icon-control__preview"
					onClick={() => setIsOpen(true)}
					__next40pxDefaultSize
				>
					<span className="matter-icon-control__icon">
						{icon?.content ? (
							<span
								dangerouslySetInnerHTML={{
									__html: safeHTML(icon.content),
								}}
							/>
						) : (
							<Icon icon={notAllowed} />
						)}
					</span>
					<span className="matter-icon-control__label">
						{value
							? (icon?.label ?? value)
							: __('Choose an icon', 'matter')}
					</span>
				</Button>
				{value && (
					<Button
						className="matter-icon-control__reset"
						icon={resetIcon}
						label={__('Remove icon', 'matter')}
						onClick={() => onChange(undefined)}
						size="small"
					/>
				)}
			</div>
			{isOpen && (
				<IconLibraryModal
					value={value}
					onSelect={onChange}
					onRequestClose={() => setIsOpen(false)}
				/>
			)}
		</BaseControl>
	);
}
