/**
 * WordPress dependencies
 */
import {
	FlexItem,
	Icon,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalHStack as HStack,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalTruncate as Truncate,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { chevronDown } from '@wordpress/icons';

/**
 * Lightweight stand-in for the private components Badge API.
 * Uses the same markup/classes as core so inspector styling matches Submenu.
 *
 * @param {Object} props          Component props.
 * @param {string} props.intent   Badge intent.
 * @param {string} props.children Badge label.
 * @return {Element} Element to render.
 */
function Badge({ intent = 'default', children }) {
	return (
		<span className={`components-badge is-${intent}`}>
			<span className="components-badge__flex-wrapper">
				<span className="components-badge__content">{children}</span>
			</span>
		</span>
	);
}

/**
 * Strip tags from a string without using unstable APIs.
 *
 * @param {string} value HTML string.
 * @return {string} Plain text.
 */
function stripHTML(value) {
	return value ? String(value).replace(/<[^>]*>/g, '') : '';
}

/**
 * Link preview shown inside the LinkPicker trigger button.
 *
 * @see https://github.com/WordPress/gutenberg/blob/trunk/packages/block-editor/src/components/link-picker/link-preview.js
 *
 * @param {Object} props          Component props.
 * @param {string} props.title    Display title.
 * @param {string} props.url      Display URL.
 * @param {string} [props.image]  Optional image URL.
 * @param {Array}  [props.badges] Optional badges.
 * @return {Element} Element to render.
 */
export default function LinkPreview({ title, url, image, badges }) {
	return (
		<HStack justify="space-between" alignment="top">
			<FlexItem className="link-preview-button__content">
				<HStack alignment="top">
					{image && (
						<FlexItem className="link-preview-button__image-container">
							<img
								className="link-preview-button__image"
								src={image}
								alt=""
							/>
						</FlexItem>
					)}
					<VStack
						className="link-preview-button__details"
						alignment="topLeft"
					>
						<Truncate
							numberOfLines={1}
							className="link-preview-button__title"
						>
							{stripHTML(title)}
						</Truncate>
						{url && (
							<Truncate
								numberOfLines={1}
								className="link-preview-button__hint"
							>
								{url}
							</Truncate>
						)}
						{badges && badges.length > 0 && (
							<HStack
								className="link-preview-button__badges"
								alignment="left"
							>
								{badges.map((badge) => (
									<Badge
										key={`${badge.label}|${badge.intent}`}
										intent={badge.intent}
									>
										{badge.label}
									</Badge>
								))}
							</HStack>
						)}
					</VStack>
				</HStack>
			</FlexItem>
			<Icon icon={chevronDown} className="link-preview-button__icon" />
		</HStack>
	);
}
