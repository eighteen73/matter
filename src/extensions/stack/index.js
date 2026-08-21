/**
 * Columns stack viewport: Mobile | Tablet from settings.viewport.
 */

import { InspectorControls } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

import { registerBlockExtension } from '../../utils/register-block-extension';
import clsx from 'clsx';

import ViewportSelectorControl from '../../components/viewport-selector-control';

const DEFAULT_STACKED_VIEWPORT = 'tablet';

const additionalAttributes = {
	stackedViewport: {
		type: 'string',
	},
};

/**
 * @param {string} value
 * @return {boolean} Whether the condition is true.
 */
const isViewportToken = (value) => value === 'mobile' || value === 'tablet';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @return {Element} The component.
 */
function BlockEdit({ attributes, setAttributes }) {
	const { isStackedOnMobile, stackedViewport } = attributes;
	const resolvedViewport = isViewportToken(stackedViewport)
		? stackedViewport
		: DEFAULT_STACKED_VIEWPORT;

	if (!isStackedOnMobile) {
		return null;
	}

	return (
		<InspectorControls group="settings">
			<div style={{ padding: '0 16px 16px' }}>
				<ViewportSelectorControl
					label={__('Stack below', 'matter')}
					help={__(
						'Override the core Columns stack width using Mobile or Tablet from theme.json settings.viewport.',
						'matter'
					)}
					value={resolvedViewport}
					onChange={(value) =>
						setAttributes({ stackedViewport: value })
					}
				/>
			</div>
		</InspectorControls>
	);
}

/**
 * @param {Object} attributes
 * @return {string} Generated string.
 */
function generateClassNames(attributes) {
	const { isStackedOnMobile, stackedViewport } = attributes;
	const viewport = isViewportToken(stackedViewport) ? stackedViewport : null;

	return clsx({
		[`is-stacked-on-viewport-${viewport}`]: isStackedOnMobile && viewport,
	});
}

registerBlockExtension(['core/columns'], {
	extensionName: 'matter/stack',
	attributes: additionalAttributes,
	classNameGenerator: generateClassNames,
	Edit: BlockEdit,
	order: 'after',
});
