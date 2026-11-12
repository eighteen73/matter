/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	RichText,
	store as blockEditorStore,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const TEMPLATE = [
	['core/paragraph', { placeholder: __('Item content…', 'matter') }],
];

// Matches the front end's grid-rows transition (style.scss).
const TRANSITION_MS = 300;

/**
 * The accordion item that contains the current selection, if any.
 *
 * @param {Function} select Data registry select.
 * @return {string|undefined} Item client ID.
 */
function selectedItem(select) {
	const { getSelectedBlockClientId, getBlockParents, getBlockName } =
		select(blockEditorStore);
	const selected = getSelectedBlockClientId();

	if (!selected) {
		return undefined;
	}

	return [selected, ...getBlockParents(selected, true)].find(
		(id) => getBlockName(id) === 'matter/accordion-item'
	);
}

/**
 * An accordion item, as on the front end: closed until opened. Selecting the
 * item (e.g. clicking its title to edit it) opens it; the caret toggles it.
 * With "Only one item open at a time", selecting another item closes it.
 * Selecting something outside the accordion returns items to their defaults.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {Object}   props.context       Block context.
 * @param {string}   props.clientId      Block client ID.
 * @return {Element} Item editor.
 */
export default function Edit({ attributes, setAttributes, context, clientId }) {
	const { title, open } = attributes;
	// Only an item in a loop is titled after its post: outside one, postId
	// is the page being edited.
	const { queryId, postType } = context;
	const postId = queryId === undefined ? undefined : context.postId;
	const level = Math.min(6, Math.max(2, context['matter/headingLevel'] ?? 3));
	const HeadingTag = `h${level}`;
	const [postTitle] = useEntityProp('postType', postType, 'title', postId);

	const { activeItem, isFirst, isEditing } = useSelect(
		(select) => {
			const {
				getBlockIndex,
				getBlockParentsByBlockName,
				isBlockSelected,
				hasSelectedInnerBlock,
			} = select(blockEditorStore);
			const [accordion] = getBlockParentsByBlockName(
				clientId,
				'matter/accordion',
				true
			);

			return {
				activeItem: selectedItem(select),
				isFirst: getBlockIndex(clientId) === 0,
				// The accordion (or anything in it) is selected.
				isEditing:
					!!accordion &&
					(isBlockSelected(accordion) ||
						hasSelectedInnerBlock(accordion, true)),
			};
		},
		[clientId]
	);

	const autoclose = !!context['matter/autoclose'];
	const isOpenByDefault = open || (isFirst && !!context['matter/openFirst']);
	const [isOpen, setIsOpen] = useState(isOpenByDefault);
	const [isSettled, setIsSettled] = useState(isOpen);

	// Follow the selection: open when it moves into this item; close when it
	// moves to another item and only one may be open.
	useEffect(() => {
		if (activeItem === clientId) {
			setIsOpen(true);
		} else if (activeItem && autoclose) {
			setIsOpen(false);
		}
	}, [activeItem, clientId, autoclose]);

	// Back to how the page loads once editing moves outside the accordion.
	const wasEditing = useRef(isEditing);

	useEffect(() => {
		if (wasEditing.current && !isEditing) {
			setIsOpen(isOpenByDefault);
		}

		wasEditing.current = isEditing;
	}, [isEditing, isOpenByDefault]);

	// Content may overflow (block toolbars, inserters) once fully open.
	useEffect(() => {
		if (!isOpen) {
			setIsSettled(false);

			return;
		}

		const timer = setTimeout(() => setIsSettled(true), TRANSITION_MS);

		return () => clearTimeout(timer);
	}, [isOpen]);

	const blockProps = useBlockProps({
		className: [isOpen && 'is-open', isSettled && 'is-settled']
			.filter(Boolean)
			.join(' '),
	});
	// An inner wrapper keeps the theme's `__content > :last-child` spacing
	// stable while the editor adds and removes its block appender.
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-matter-accordion-item__blocks' },
		{ template: TEMPLATE }
	);

	// Inside a Query Loop an empty title shows the post title.
	const placeholder =
		postId && postTitle ? postTitle : __('Item title', 'matter');

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'matter')}>
					<ToggleControl
						__nextHasNoMarginBottom
						label={__('Open by default', 'matter')}
						checked={open}
						onChange={(value) => setAttributes({ open: value })}
					/>
				</PanelBody>
			</InspectorControls>
			<div {...blockProps}>
				<HeadingTag className="wp-block-matter-accordion-item__heading">
					{/* Clicks on the title edit it; elsewhere (the caret) toggle. */}
					{/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Editor only; the title is the focusable element. */}
					<div
						className="wp-block-matter-accordion-item__toggle"
						onClick={(event) => {
							if (
								!event.target.closest(
									'.wp-block-matter-accordion-item__title'
								)
							) {
								setIsOpen(!isOpen);
							}
						}}
					>
						<RichText
							tagName="span"
							className="wp-block-matter-accordion-item__title"
							value={title}
							onChange={(value) =>
								setAttributes({ title: value })
							}
							placeholder={placeholder}
							allowedFormats={['core/bold', 'core/italic']}
						/>
					</div>
				</HeadingTag>
				<div className="wp-block-matter-accordion-item__panel">
					<div className="wp-block-matter-accordion-item__content">
						<div {...innerBlocksProps} />
					</div>
				</div>
			</div>
		</>
	);
}
