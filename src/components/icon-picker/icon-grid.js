/**
 * Icon grid component.
 *
 * Renders selectable icons from the WordPress 7.1 icon library
 * (`root/icon` REST entities).
 */

import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { safeHTML } from '@wordpress/dom';

/**
 * @param {Object}   props
 * @param {Array}    props.icons
 * @param {string}   props.value
 * @param {Function} props.onSelect
 * @return {Element} The component.
 */
export const IconGrid = ({ icons, value, onSelect }) =>
	!icons?.length ? (
		<p className="matter-icon-grid__empty">
			{__('No icons found.', 'matter')}
		</p>
	) : (
		<div className="matter-icon-grid" role="listbox">
			{icons.map((icon) => (
				<Button
					key={icon.name}
					role="option"
					aria-selected={icon.name === value}
					className="matter-icon-grid__item"
					isPressed={icon.name === value}
					label={icon.label}
					onClick={() => onSelect(icon.name)}
				>
					{icon.content ? (
						<span
							className="matter-icon-grid__preview"
							dangerouslySetInnerHTML={{
								__html: safeHTML(icon.content),
							}}
						/>
					) : (
						<span className="matter-icon-grid__text">
							{icon.text}
						</span>
					)}
					<span className="screen-reader-text">{icon.label}</span>
				</Button>
			))}
		</div>
	);
