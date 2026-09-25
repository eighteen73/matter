/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	BaseControl,
	Button,
	Popover,
	useBaseControlProps,
	VisuallyHidden,
} from '@wordpress/components';
import {
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalLinkControl as LinkControl,
} from '@wordpress/block-editor';
import { useId, useRef, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import LinkPreview from './link-preview';

/**
 * Inspector "Link to" control matching core Submenu / navigation-link.
 *
 * Core exposes this as a private `LinkPicker` API. This recreation uses the
 * same markup, class names, and LinkControl popover so it picks up core styles.
 *
 * @see https://github.com/WordPress/gutenberg/blob/trunk/packages/block-editor/src/components/link-picker/link-picker.js
 *
 * @param {Object}   props                  Component props.
 * @param {Object}   props.preview          Preview data from useLinkPreview.
 * @param {Function} props.onSelect         Called with the selected suggestion.
 * @param {Object}   props.suggestionsQuery LinkControl suggestions query.
 * @param {string}   props.label            Control label.
 * @param {string}   [props.help]           Optional help text.
 * @return {Element} Element to render.
 */
export default function LinkPicker({
	preview,
	onSelect,
	suggestionsQuery,
	label,
	help,
}) {
	const [isOpen, setIsOpen] = useState(false);
	const instanceId = useId();
	const dialogTitleId = `link-picker-title-${instanceId}`;
	const dialogDescriptionId = `link-picker-description-${instanceId}`;
	const anchorRef = useRef(null);
	const { baseControlProps, controlProps } = useBaseControlProps({
		help,
	});

	const handleChange = (newValue) => {
		setIsOpen(false);

		if (newValue) {
			onSelect({
				url: newValue.url,
				kind: newValue.kind,
				type: newValue.type,
				id: newValue.id,
				title: newValue.title,
			});
		}
	};

	return (
		<BaseControl {...baseControlProps}>
			<BaseControl.VisualLabel>{label}</BaseControl.VisualLabel>
			<Button
				ref={anchorRef}
				onClick={() => setIsOpen(!isOpen)}
				aria-haspopup="dialog"
				aria-expanded={isOpen}
				aria-describedby={controlProps['aria-describedby']}
				variant="secondary"
				__next40pxDefaultSize
				className="link-preview-button"
			>
				{label && <VisuallyHidden>{`${label}:`}</VisuallyHidden>}
				<LinkPreview
					title={preview.title || __('Add link', 'matter')}
					url={preview.url}
					image={preview.image}
					badges={preview.badges}
				/>
			</Button>
			{isOpen && (
				<Popover
					anchor={anchorRef.current}
					onClose={() => setIsOpen(false)}
					placement="left-start"
					offset={36}
					shift
				>
					<div
						role="dialog"
						aria-labelledby={dialogTitleId}
						aria-describedby={dialogDescriptionId}
					>
						<VisuallyHidden>
							<h2 id={dialogTitleId}>
								{__('Select a link', 'matter')}
							</h2>
							<p id={dialogDescriptionId}>
								{__(
									'Search for and add a link to the navigation item.',
									'matter'
								)}
							</p>
						</VisuallyHidden>
						<LinkControl
							value={null}
							onChange={handleChange}
							suggestionsQuery={suggestionsQuery}
							showInitialSuggestions
							forceIsEditingLink
							settings={[]}
						/>
					</div>
				</Popover>
			)}
		</BaseControl>
	);
}
