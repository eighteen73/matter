/**
 * External dependencies
 */
import clsx from 'clsx';

/**
 * WordPress dependencies
 */
import { safeHTML } from '@wordpress/dom';
import { useMemo } from '@wordpress/element';

/**
 * Converts a style object to an inline CSS string.
 *
 * @param {Object} style Style object.
 * @return {string} Inline CSS string.
 */
function styleObjectToString(style = {}) {
	return Object.entries(style)
		.filter(([, value]) => value !== undefined && value !== null && value !== '')
		.map(([key, value]) => {
			const property = key.replace(/([A-Z])/g, '-$1').toLowerCase();
			return `${property}: ${value}`;
		})
		.join('; ');
}

/**
 * Renders sanitized HTML as React output with optional root attribute merging.
 *
 * @param {Object} props            Component props.
 * @param {Object} props.wrapperProps Props merged onto the root SVG element.
 * @param {string} props.html       HTML content to render.
 * @return {import('react').JSX.Element|null} Rendered markup.
 */
export default function HtmlRenderer({ wrapperProps = {}, html = '' }) {
	const markup = useMemo(() => {
		if (!html) {
			return '';
		}

		const sanitized = safeHTML(html);
		const parser = new DOMParser();
		const doc = parser.parseFromString(sanitized, 'text/html');
		const svg = doc.querySelector('svg');

		if (!svg) {
			return '';
		}

		if (wrapperProps.className) {
			svg.setAttribute('class', clsx(svg.getAttribute('class'), wrapperProps.className));
		}

		const mergedStyle = styleObjectToString(wrapperProps.style);
		const existingStyle = svg.getAttribute('style') || '';

		if (mergedStyle) {
			svg.setAttribute(
				'style',
				existingStyle ? `${existingStyle}; ${mergedStyle}` : mergedStyle
			);
		}

		return svg.outerHTML;
	}, [html, wrapperProps.className, wrapperProps.style]);

	if (!markup) {
		return null;
	}

	return <div dangerouslySetInnerHTML={{ __html: markup }} />;
}
