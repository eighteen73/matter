/**
 * Toolbar control for inserting placeholder text.
 */

import { BlockControls } from '@wordpress/block-editor';
import { ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { language } from '@wordpress/icons';

import { Strings } from '../constants/strings';

/**
 * @param {Object}   props
 * @param {string}   props.placeholderType
 * @param {string}   [props.customPlaceholder]
 * @param {string}   props.attribute
 * @param {Function} props.setAttributes
 * @return {Element|null} The component or null.
 */
export default function PlaceholderControl({
	placeholderType,
	customPlaceholder,
	attribute,
	setAttributes,
}) {
	const content = customPlaceholder || Strings.placeholders[placeholderType];

	if (!content) {
		return null;
	}

	return (
		<BlockControls group="other">
			<ToolbarGroup>
				<ToolbarButton
					icon={language}
					label={__('Insert placeholder text', 'matter')}
					onClick={() => setAttributes({ [attribute]: content })}
				/>
			</ToolbarGroup>
		</BlockControls>
	);
}
