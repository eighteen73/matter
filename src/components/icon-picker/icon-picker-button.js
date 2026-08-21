/**
 * Icon picker preview button.
 *
 * Mirrors the Global Styles background-image row: a bordered preview
 * that opens the icon library.
 */

import {
	Button,
	Icon,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalTruncate as Truncate,
} from '@wordpress/components';
import { notAllowed, reset as resetIcon } from '@wordpress/icons';

/**
 * @param {Object}   props
 * @param {string}   props.value
 * @param {Element}  props.icon
 * @param {string}   props.label
 * @param {Function} props.onOpen
 * @param {Function} [props.onReset]
 * @param {string}   [props.openLabel]
 * @param {string}   [props.resetLabel]
 * @return {Element} The component.
 */
export const IconPickerButton = ({
	value,
	icon,
	label,
	onOpen,
	onReset,
	openLabel,
	resetLabel,
}) => (
	<div className="matter-icon-picker-button">
		<Button
			className="matter-icon-picker-button__preview"
			onClick={onOpen}
			aria-label={openLabel || label}
		>
			<span className="matter-icon-picker-button__icon">
				{value ? icon : <Icon icon={notAllowed} />}
			</span>
			<Truncate
				className="matter-icon-picker-button__label"
				numberOfLines={1}
			>
				{label}
			</Truncate>
		</Button>
		{value && onReset && (
			<Button
				className="matter-icon-picker-button__reset"
				icon={resetIcon}
				label={resetLabel}
				onClick={onReset}
			/>
		)}
	</div>
);
