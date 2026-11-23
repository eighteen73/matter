/**
 * "Add tab", "Add item": a block's own add button, as core's block appender
 * (its class gives the outline, hover and dark-scheme colours) with a label.
 */

/**
 * WordPress dependencies
 */
import { Button } from '@wordpress/components';
import { plus } from '@wordpress/icons';

/**
 * @param {Object}   props
 * @param {string}   props.label   What it adds, e.g. "Add tab".
 * @param {Function} props.onClick Adds it.
 * @param {boolean}  props.isRow   Full width, below the block's items.
 * @return {Element} Button.
 */
export default function AddButton({ label, onClick, isRow = false }) {
	return (
		<Button
			__next40pxDefaultSize
			className={[
				'block-editor-button-block-appender',
				'matter-add-button',
				isRow && 'is-row',
			]
				.filter(Boolean)
				.join(' ')}
			icon={plus}
			onClick={onClick}
		>
			{label}
		</Button>
	);
}
