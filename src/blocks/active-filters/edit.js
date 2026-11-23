/**
 * Active filters in the editor: sample chips. On the front end they're the
 * filters applied, and the block is hidden when there are none.
 */

/**
 * WordPress dependencies
 */
import { useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

export default function Edit() {
	return (
		<div {...useBlockProps()}>
			<ul className="wp-block-matter-active-filters__list">
				{[__('A chosen option', 'matter'), __('Another', 'matter')].map(
					(label) => (
						<li
							key={label}
							className="wp-block-matter-active-filters__item"
						>
							<button
								type="button"
								className="wp-block-matter-active-filters__chip"
								disabled
							>
								<span>{label}</span>
							</button>
						</li>
					)
				)}
			</ul>
			<button
				type="button"
				className="wp-block-matter-active-filters__clear"
				disabled
			>
				{__('Clear all', 'matter')}
			</button>
		</div>
	);
}
