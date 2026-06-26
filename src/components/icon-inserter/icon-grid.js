/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';

/**
 * Internal dependencies
 */
import HtmlRenderer from '../../utils/html-renderer';

/**
 * @param {Object}   props               Component props.
 * @param {Array}    props.icons         Available icons.
 * @param {Function} props.onChange      Icon selection callback.
 * @param {Object}   props.attributes    Block attributes.
 * @return {Element} Element to render.
 */
export default function IconGrid({ icons, onChange, attributes }) {
	return (
		<div className="wp-block-matter-icon__inserter-grid-icons-list">
			{!icons?.length ? (
				<div className="wp-block-matter-icon__inserter-grid-no-results">
					{__('No results found.', 'matter')}
				</div>
			) : (
				icons.map((icon) => (
					<Button
						key={icon.name}
						className="wp-block-matter-icon__inserter-grid-icons-list-item"
						onClick={() => onChange(icon.name)}
						variant={icon.name === attributes?.icon ? 'primary' : undefined}
						__next40pxDefaultSize
					>
						<div className="wp-block-matter-icon__inserter-grid-icons-list-item-icon">
							<HtmlRenderer html={icon.content} />
						</div>
						<div className="wp-block-matter-icon__inserter-grid-icons-list-item-title">
							{icon.label}
						</div>
					</Button>
				))
			)}
		</div>
	);
}
