/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { Placeholder, Spinner } from '@wordpress/components';
import { useRefEffect } from '@wordpress/compose';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ATTRIBUTE } from '../../../query-display/templates';
import { useLockedQuery } from '../../../query-display/use-locked-query';
import DisplayPanel from './panel';

// Previews by request, for the editor session, and requests in flight.
const previews = new Map();
const requests = new Map();
let rendered = 0;

// Wait for typing in the sidebar (e.g. a keyword) to pause before rendering.
const DELAY = 300;

/**
 * Fetch a preview: the query rendered by the server as on the front end.
 *
 * @param {string} key Request body, as JSON.
 * @return {Promise<string>} Styles and HTML.
 */
function fetchPreview(key) {
	if (!requests.has(key)) {
		requests.set(
			key,
			apiFetch({
				path: '/matter/v1/query-display',
				method: 'POST',
				data: JSON.parse(key),
			})
				.then(({ html, styles }) => {
					// An ID per preview, so a new one replaces the markup.
					previews.set(key, { styles, html, id: ++rendered });
					return previews.get(key);
				})
				.finally(() => requests.delete(key))
		);
	}

	return requests.get(key);
}

/**
 * The query's preview, refreshed when its attributes change.
 *
 * @param {Object} attributes Query attributes.
 * @param {number} postId     The post being edited.
 * @return {{preview?: Object, error?: boolean}} Preview state.
 */
function usePreview(attributes, postId) {
	const key = JSON.stringify({ attributes, postId: postId || 0 });
	const [state, setState] = useState(() =>
		previews.has(key) ? { preview: previews.get(key) } : {}
	);

	useEffect(() => {
		if (previews.has(key)) {
			setState({ preview: previews.get(key) });
			return;
		}

		let current = true;
		const timer = setTimeout(
			() =>
				fetchPreview(key)
					.then((preview) => current && setState({ preview }))
					.catch(() => current && setState({ error: true })),
			DELAY
		);

		return () => {
			current = false;
			clearTimeout(timer);
		};
	}, [key]);

	return state;
}

/**
 * Open or close an accordion item in the preview.
 *
 * @param {Element} item Accordion item.
 * @param {boolean} open Whether it's open.
 */
function setItemOpen(item, open) {
	item.classList.toggle('is-open', open);
	item.querySelector(
		':scope > .wp-block-matter-accordion-item__heading > .wp-block-matter-accordion-item__toggle'
	)?.setAttribute('aria-expanded', String(open));

	const panel = item.querySelector(
		':scope > .wp-block-matter-accordion-item__panel'
	);

	if (panel) {
		panel.inert = !open;
	}
}

/**
 * Show a tab in the preview.
 *
 * @param {Element} tab Tab button.
 */
function selectTab(tab) {
	const tabs = tab.closest('.wp-block-matter-tabs');

	tabs?.querySelectorAll('[role="tab"]').forEach((button) => {
		const isActive = button === tab;

		button.setAttribute('aria-selected', String(isActive));
		button.tabIndex = isActive ? 0 : -1;
	});

	tabs?.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
		panel.hidden = panel.id !== tab.getAttribute('aria-controls');
	});
}

/**
 * The preview's initial state, as the front end's script sets it: the
 * accordion's open items, the first tab.
 *
 * @param {Element} element Preview.
 */
function initialise(element) {
	element
		.querySelectorAll('.wp-block-matter-accordion')
		.forEach((accordion) => {
			let openItems = [];

			try {
				openItems =
					JSON.parse(
						accordion.dataset.wpContext || '{}'
					).openItems?.map(String) ?? [];
			} catch {}

			accordion
				.querySelectorAll('.wp-block-matter-accordion-item')
				.forEach((item) =>
					setItemOpen(item, openItems.includes(item.id))
				);
		});

	element.querySelectorAll('.wp-block-matter-tabs').forEach((tabs) => {
		const tab =
			tabs.querySelector('[role="tab"][aria-selected="true"]') ??
			tabs.querySelector('[role="tab"]');

		if (tab) {
			selectTab(tab);
		}
	});
}

/**
 * Clicks in the preview: accordion items open and close and tabs switch, as
 * on the front end; links and forms do nothing, so the canvas can't leave
 * the editor.
 *
 * @param {Event} event Click event.
 */
function onPreviewClick(event) {
	const { target } = event;

	if (target.closest('a')) {
		event.preventDefault();
	}

	const toggle = target.closest('.wp-block-matter-accordion-item__toggle');

	if (toggle) {
		const item = toggle.closest('.wp-block-matter-accordion-item');
		const accordion = item.closest('.wp-block-matter-accordion');
		const open = !item.classList.contains('is-open');
		let autoclose = false;

		try {
			autoclose = !!JSON.parse(accordion?.dataset.wpContext || '{}')
				.autoclose;
		} catch {}

		if (open && autoclose) {
			accordion
				.querySelectorAll('.wp-block-matter-accordion-item.is-open')
				.forEach((other) => setItemOpen(other, false));
		}

		setItemOpen(item, open);
		return;
	}

	const tab = target.closest('.wp-block-matter-tabs [role="tab"]');

	if (tab) {
		selectTab(tab);
	}
}

/**
 * A query shown as an accordion or tabs: the server's rendering of it (as on
 * the front end, with the theme's panels), which can be clicked through, and
 * the query's own editor for its controls. The query's items aren't shown
 * there (editor/canvas.scss): they're fixed, and the preview shows them.
 *
 * @param {Object}  props
 * @param {Element} props.BlockEdit The query's edit component.
 * @param {Object}  props.props     Its props.
 * @return {Element} Preview.
 */
export default function PreviewEdit({ BlockEdit, props }) {
	const { attributes, setAttributes, clientId, isSelected } = props;
	const display = attributes[ATTRIBUTE];
	const postId = useSelect(
		(select) => select(editorStore)?.getCurrentPostId?.(),
		[]
	);
	const { preview, error } = usePreview(attributes, postId);
	const { selectBlock } = useDispatch(blockEditorStore);

	useLockedQuery(clientId);

	const set = (changes) =>
		setAttributes({ [ATTRIBUTE]: { ...display, ...changes } });

	// The markup is set once per preview (a new preview remounts it), so
	// opened items and tabs stay as they are until the query changes.
	const previewRef = useRefEffect((element) => {
		const onSubmit = (event) => event.preventDefault();

		initialise(element);
		element.addEventListener('click', onPreviewClick);
		element.addEventListener('submit', onSubmit);

		return () => {
			element.removeEventListener('click', onPreviewClick);
			element.removeEventListener('submit', onSubmit);
		};
	}, []);

	const isEmpty =
		preview && !/wp-block-matter-(accordion-item|tab)\b/.test(preview.html);

	return (
		<>
			{isSelected && <DisplayPanel display={display} set={set} />}
			{/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Mouse only: keyboard users reach the block as usual. */}
			<div
				className={[
					'matter-query-display',
					`is-${display.type}`,
					isSelected && 'is-block-selected',
				]
					.filter(Boolean)
					.join(' ')}
				onClick={() => !isSelected && selectBlock(clientId)}
			>
				<BlockEdit {...props} />
				{preview && !isEmpty && (
					<div
						key={preview.id}
						ref={previewRef}
						className="matter-query-display__preview"
						dangerouslySetInnerHTML={{
							__html: preview.styles + preview.html,
						}}
					/>
				)}
				{(isEmpty || error) && (
					<Placeholder
						label={
							display.type === 'tabs'
								? __('Posts tabs', 'matter')
								: __('Posts accordion', 'matter')
						}
						instructions={
							error
								? __("The preview couldn't be shown.", 'matter')
								: __(
										'No posts match these settings. Change them in the block settings.',
										'matter'
									)
						}
					/>
				)}
				{!preview && !error && <Spinner />}
			</div>
		</>
	);
}
