/**
 * WordPress dependencies
 */
import { URLPopover } from '@wordpress/block-editor';
import {
	ToolbarButton,
	MenuItem,
	Button,
	ToggleControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalVStack as VStack,
	NavigableMenu,
	TextControl,
	ExternalLink,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { link, page, linkOff } from '@wordpress/icons';
import {
	useEffect,
	useState,
	useRef,
	createInterpolateElement,
} from '@wordpress/element';
import { prependHTTP } from '@wordpress/url';
import { focus } from '@wordpress/dom';

const LINK_DESTINATION_NONE = 'none';
const LINK_DESTINATION_CUSTOM = 'custom';
const LINK_DESTINATION_POST = 'post';
const NEW_TAB_REL = ['noreferrer', 'noopener'];

/**
 * Toolbar control for wrapping a Group in a link overlay.
 *
 * @param {Object}   props
 * @param {string}   props.url
 * @param {string}   props.linkDestination
 * @param {string}   props.linkTarget
 * @param {string}   props.rel
 * @param {string}   props.linkClass
 * @param {Function} props.setAttributes
 * @return {Element} The component.
 */
export default function GroupLinkControl({
	url,
	linkDestination,
	linkTarget,
	rel,
	linkClass,
	setAttributes,
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [popoverAnchor, setPopoverAnchor] = useState(null);
	const [isEditingLink, setIsEditingLink] = useState(false);
	const [urlInput, setUrlInput] = useState(null);

	const autocompleteRef = useRef(null);
	const wrapperRef = useRef();

	const isLinkingToPost = linkDestination === LINK_DESTINATION_POST;

	useEffect(() => {
		if (!wrapperRef.current) {
			return;
		}
		const nextFocusTarget =
			focus.focusable.find(wrapperRef.current)[0] || wrapperRef.current;
		nextFocusTarget.focus();
	}, [isEditingLink, url, isLinkingToPost]);

	const openLinkUI = () => {
		setIsOpen(true);
	};

	const startEditLink = () => {
		if (linkDestination === LINK_DESTINATION_POST) {
			setAttributes({
				linkDestination: LINK_DESTINATION_NONE,
				url: '',
			});
			setUrlInput('');
		}
		setIsEditingLink(true);
	};

	const stopEditLink = () => {
		setIsEditingLink(false);
	};

	const closeLinkUI = () => {
		setUrlInput(null);
		stopEditLink();
		setIsOpen(false);
	};

	const getLinkDestinations = () => {
		return [
			{
				linkDestination: LINK_DESTINATION_POST,
				title: __('Link to current post', 'matter'),
				url: undefined,
				icon: page,
			},
		];
	};

	const getUpdatedLinkTargetSettings = (value) => {
		const newLinkTarget = value ? '_blank' : undefined;

		let updatedRel;
		if (newLinkTarget) {
			const rels = (rel ?? '').split(' ');
			NEW_TAB_REL.forEach((relVal) => {
				if (!rels.includes(relVal)) {
					rels.push(relVal);
				}
			});
			updatedRel = rels.join(' ');
		} else {
			const rels = (rel ?? '')
				.split(' ')
				.filter((relVal) => NEW_TAB_REL.includes(relVal) === false);
			updatedRel = rels.length ? rels.join(' ') : undefined;
		}

		return {
			linkTarget: newLinkTarget,
			rel: updatedRel,
		};
	};

	const onSetNewTab = (value) => {
		setAttributes(getUpdatedLinkTargetSettings(value));
	};

	const onSetLinkRel = (value) => {
		setAttributes({ rel: value });
	};

	const onSetLinkClass = (value) => {
		setAttributes({ linkClass: value });
	};

	const onChangeUrl = (updatedValue) => {
		setAttributes(updatedValue);
	};

	const onFocusOutside = () => {
		return (event) => {
			const autocompleteElement = autocompleteRef.current;
			if (
				autocompleteElement &&
				autocompleteElement.contains(event.target)
			) {
				return;
			}
			setIsOpen(false);
			setUrlInput(null);
			stopEditLink();
		};
	};

	const onSubmitLinkChange = () => {
		return (event) => {
			if (urlInput) {
				const selectedDestination =
					getLinkDestinations().find(
						(destination) => destination.url === urlInput
					)?.linkDestination || LINK_DESTINATION_CUSTOM;

				onChangeUrl({
					url: prependHTTP(urlInput),
					linkDestination: selectedDestination,
				});
			}
			stopEditLink();
			setUrlInput(null);
			event.preventDefault();
		};
	};

	const onLinkRemove = () => {
		onChangeUrl({
			linkDestination: LINK_DESTINATION_NONE,
			url: undefined,
		});
	};

	const advancedOptions = (
		<VStack spacing="3">
			<ToggleControl
				__nextHasNoMarginBottom
				label={__('Open in new tab', 'matter')}
				onChange={onSetNewTab}
				checked={linkTarget === '_blank'}
			/>
			<TextControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={__('Link relation', 'matter')}
				value={rel ?? ''}
				onChange={onSetLinkRel}
				help={createInterpolateElement(
					__(
						'The <a>Link Relation</a> attribute defines the relationship between a linked resource and the current document.',
						'matter'
					),
					{
						a: (
							<ExternalLink href="https://developer.mozilla.org/docs/Web/HTML/Attributes/rel" />
						),
					}
				)}
			/>
			<TextControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={__('Link CSS class', 'matter')}
				value={linkClass || ''}
				onChange={onSetLinkClass}
			/>
		</VStack>
	);

	const linkEditorValue = urlInput !== null ? urlInput : url;
	const showLinkEditor = !linkEditorValue && !isLinkingToPost;

	const urlLabel =
		linkDestination === LINK_DESTINATION_POST
			? __('Link to current post', 'matter')
			: undefined;

	const PopoverChildren = () => {
		if ((url || isLinkingToPost) && !isEditingLink) {
			return (
				<>
					<URLPopover.LinkViewer
						className="block-editor-format-toolbar__link-container-content"
						url={url || '#'}
						onEditLinkClick={startEditLink}
						urlLabel={urlLabel}
					/>
					<Button
						icon={linkOff}
						label={__('Remove link', 'matter')}
						onClick={() => {
							onLinkRemove();
						}}
						size="compact"
					/>
				</>
			);
		}
		return (
			<URLPopover.LinkEditor
				className="block-editor-format-toolbar__link-container-content"
				value={linkEditorValue}
				onChangeInputValue={setUrlInput}
				onSubmit={onSubmitLinkChange()}
				autocompleteRef={autocompleteRef}
			/>
		);
	};

	return (
		<>
			<ToolbarButton
				icon={link}
				className="components-toolbar__control"
				label={__('Link', 'matter')}
				aria-expanded={isOpen}
				onClick={openLinkUI}
				ref={setPopoverAnchor}
				isActive={!!url || isLinkingToPost}
			/>

			{isOpen && (
				<URLPopover
					ref={wrapperRef}
					anchor={popoverAnchor}
					onFocusOutside={onFocusOutside()}
					onClose={closeLinkUI}
					renderSettings={() => advancedOptions}
					additionalControls={
						showLinkEditor && (
							<NavigableMenu>
								{getLinkDestinations().map((destination) => (
									<MenuItem
										key={destination.linkDestination}
										icon={destination.icon}
										iconPosition="left"
										onClick={() => {
											setUrlInput(null);
											onChangeUrl({
												url: undefined,
												linkDestination:
													destination.linkDestination,
											});
											stopEditLink();
										}}
									>
										{destination.title}
									</MenuItem>
								))}
							</NavigableMenu>
						)
					}
					offset={13}
				>
					{PopoverChildren()}
				</URLPopover>
			)}
		</>
	);
}
