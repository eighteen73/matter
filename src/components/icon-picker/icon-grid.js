/**
 * Icon grid component.
 *
 * Uses the WordPress 7.1 core Icon library grid markup and class names
 * so block-library editor styles apply unchanged.
 *
 * @see https://github.com/WordPress/gutenberg/blob/c217b2698e6193569d06e1a8b7749f33fde6d815/packages/block-library/src/icon/editor.scss
 */

import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { useAsyncList } from '@wordpress/compose';
import { getScrollContainer, safeHTML } from '@wordpress/dom';
import { useLayoutEffect, useRef } from '@wordpress/element';

const BATCH_SIZE = 20;

/**
 * @param {Object}   props
 * @param {Array}    props.icons
 * @param {string}   props.value
 * @param {Function} props.onSelect
 * @return {Element} The component.
 */
export const IconGrid = ({ icons, value, onSelect }) => {
	const shownIcons = useAsyncList(icons, { step: BATCH_SIZE });
	const selectedIconRef = useRef();
	const selectedIndex = icons?.findIndex((icon) => icon.name === value) ?? -1;
	const isReadyToScroll =
		selectedIndex >= 0 &&
		(shownIcons.length >= selectedIndex + BATCH_SIZE ||
			shownIcons.length === icons.length);

	useLayoutEffect(() => {
		const node = selectedIconRef.current;

		if (!isReadyToScroll || !node) {
			return;
		}

		if (getScrollContainer(node)?.scrollTop) {
			return;
		}

		node.scrollIntoView({ block: 'center' });
	}, [isReadyToScroll]);

	return (
		<div className="wp-block-icon__inserter-grid">
			{!icons?.length ? (
				<div className="wp-block-icon__inserter-grid-no-results">
					<p>{__('No results found.', 'matter')}</p>
				</div>
			) : (
				<div
					className="wp-block-icon__inserter-grid-icons-list"
					aria-label={__('Icon library', 'matter')}
				>
					{shownIcons.map((icon) => (
						<Button
							key={icon.name}
							ref={
								icon.name === value
									? selectedIconRef
									: undefined
							}
							className="wp-block-icon__inserter-grid-icons-list-item"
							onClick={() => onSelect(icon.name)}
							variant={
								icon.name === value ? 'primary' : undefined
							}
							__next40pxDefaultSize
						>
							{icon.content ? (
								<span
									className="wp-block-icon__inserter-grid-icons-list-item-icon"
									dangerouslySetInnerHTML={{
										__html: safeHTML(icon.content),
									}}
								/>
							) : (
								<span className="wp-block-icon__inserter-grid-icons-list-item-icon">
									{icon.text}
								</span>
							)}
							<span className="wp-block-icon__inserter-grid-icons-list-item-title">
								{icon.label}
							</span>
						</Button>
					))}
				</div>
			)}
		</div>
	);
};
